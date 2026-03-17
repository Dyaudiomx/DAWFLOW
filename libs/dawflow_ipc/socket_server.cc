/*
 * DawflowIPC - Unix Domain Socket Server Implementation
 *
 * Uses poll() + threads for simple, portable async I/O.
 * Each connected client gets a dedicated reader thread.
 */

#include "dawflow_ipc/socket_server.h"

#include <cerrno>
#include <cstring>
#include <sstream>
#include <unistd.h>

#include <poll.h>
#include <sys/socket.h>
#include <sys/un.h>

namespace DawflowIPC {

SocketServer::SocketServer ()
	: _server_fd (-1)
	, _running (false)
	, _next_client_id (0)
{
}

SocketServer::~SocketServer ()
{
	stop ();
}

bool
SocketServer::start (const std::string& socket_path)
{
	if (_running.load ()) {
		return false;
	}

	_socket_path = socket_path;

	/* Clean up stale socket file */
	::unlink (_socket_path.c_str ());

	_server_fd = ::socket (AF_UNIX, SOCK_STREAM, 0);
	if (_server_fd < 0) {
		return false;
	}

	struct sockaddr_un addr;
	std::memset (&addr, 0, sizeof (addr));
	addr.sun_family = AF_UNIX;
	std::strncpy (addr.sun_path, _socket_path.c_str (), sizeof (addr.sun_path) - 1);

	if (::bind (_server_fd, (struct sockaddr*)&addr, sizeof (addr)) < 0) {
		::close (_server_fd);
		_server_fd = -1;
		return false;
	}

	if (::listen (_server_fd, 8) < 0) {
		::close (_server_fd);
		_server_fd = -1;
		::unlink (_socket_path.c_str ());
		return false;
	}

	_running.store (true);
	_accept_thread = std::thread (&SocketServer::_accept_loop, this);
	return true;
}

void
SocketServer::stop ()
{
	if (!_running.load ()) {
		return;
	}

	_running.store (false);

	/* Shut down server socket to unblock accept/poll */
	if (_server_fd >= 0) {
		::shutdown (_server_fd, SHUT_RDWR);
		::close (_server_fd);
		_server_fd = -1;
	}

	if (_accept_thread.joinable ()) {
		_accept_thread.join ();
	}

	/* Close all client connections */
	{
		std::lock_guard<std::mutex> lock (_clients_mutex);
		for (auto& [id, fd] : _client_fds) {
			::shutdown (fd, SHUT_RDWR);
			::close (fd);
		}
		_client_fds.clear ();
	}

	/* Join all client threads */
	for (auto& t : _client_threads) {
		if (t.joinable ()) {
			t.join ();
		}
	}
	_client_threads.clear ();

	/* Clean up socket file */
	::unlink (_socket_path.c_str ());
}

bool
SocketServer::send (const std::string& client_id, const Message& msg)
{
	std::lock_guard<std::mutex> lock (_clients_mutex);

	auto it = _client_fds.find (client_id);
	if (it == _client_fds.end ()) {
		return false;
	}

	std::string data = msg.serialize ();
	int         fd   = it->second;

	/* Use SO_NOSIGPIPE to avoid SIGPIPE on broken connections (macOS) */
	ssize_t written = ::write (fd, data.c_str (), data.size ());
	return (written == static_cast<ssize_t> (data.size ()));
}

void
SocketServer::broadcast (const Message& msg)
{
	std::lock_guard<std::mutex> lock (_clients_mutex);

	std::string data = msg.serialize ();

	for (auto& [id, fd] : _client_fds) {
		::write (fd, data.c_str (), data.size ());
	}
}

void
SocketServer::on_message (MessageHandler handler)
{
	_message_handler = handler;
}

void
SocketServer::on_connect (ConnectHandler handler)
{
	_connect_handler = handler;
}

void
SocketServer::on_disconnect (DisconnectHandler handler)
{
	_disconnect_handler = handler;
}

bool
SocketServer::is_running () const
{
	return _running.load ();
}

void
SocketServer::_accept_loop ()
{
	while (_running.load ()) {
		struct pollfd pfd;
		pfd.fd      = _server_fd;
		pfd.events  = POLLIN;
		pfd.revents = 0;

		int ret = ::poll (&pfd, 1, 100);

		if (ret < 0) {
			if (errno == EINTR) {
				continue;
			}
			break;
		}

		if (ret == 0) {
			/* Timeout — loop around to check _running */
			continue;
		}

		if (pfd.revents & (POLLERR | POLLHUP | POLLNVAL)) {
			break;
		}

		int client_fd = ::accept (_server_fd, nullptr, nullptr);
		if (client_fd < 0) {
			if (errno == EINTR) {
				continue;
			}
			break;
		}

		/* Set SO_NOSIGPIPE on macOS to prevent SIGPIPE on write to closed socket */
#ifdef SO_NOSIGPIPE
		int optval = 1;
		::setsockopt (client_fd, SOL_SOCKET, SO_NOSIGPIPE, &optval, sizeof (optval));
#endif

		std::string client_id = "plugin-" + std::to_string (_next_client_id++);

		{
			std::lock_guard<std::mutex> lock (_clients_mutex);
			_client_fds[client_id] = client_fd;
		}

		if (_connect_handler) {
			_connect_handler (client_id);
		}

		_client_threads.emplace_back (&SocketServer::_client_loop, this, client_id, client_fd);
	}
}

void
SocketServer::_client_loop (const std::string& client_id, int client_fd)
{
	std::string buffer;
	char        chunk[4096];

	while (_running.load ()) {
		struct pollfd pfd;
		pfd.fd      = client_fd;
		pfd.events  = POLLIN;
		pfd.revents = 0;

		int ret = ::poll (&pfd, 1, 100);

		if (ret < 0) {
			if (errno == EINTR) {
				continue;
			}
			break;
		}

		if (ret == 0) {
			continue;
		}

		if (pfd.revents & (POLLERR | POLLNVAL)) {
			break;
		}

		ssize_t n = ::read (client_fd, chunk, sizeof (chunk));

		if (n <= 0) {
			/* Client disconnected or error */
			break;
		}

		buffer.append (chunk, n);

		/* Process complete newline-delimited messages */
		size_t pos;
		while ((pos = buffer.find ('\n')) != std::string::npos) {
			std::string line = buffer.substr (0, pos);
			buffer.erase (0, pos + 1);

			if (line.empty ()) {
				continue;
			}

			if (_message_handler) {
				try {
					Message msg = Message::deserialize (line);
					_message_handler (client_id, msg);
				} catch (...) {
					/* Malformed message — skip */
				}
			}
		}
	}

	/* Client disconnected — clean up */
	{
		std::lock_guard<std::mutex> lock (_clients_mutex);
		_client_fds.erase (client_id);
	}

	::close (client_fd);

	if (_disconnect_handler) {
		_disconnect_handler (client_id);
	}
}

} /* namespace DawflowIPC */
