/*
 * DawflowIPC - Unix Domain Socket Client Implementation
 *
 * Connects to a SocketServer via Unix domain socket.
 * Runs a reader thread for incoming messages.
 */

#include "dawflow_ipc/socket_client.h"

#include <cerrno>
#include <cstring>
#include <unistd.h>

#include <poll.h>
#include <sys/socket.h>
#include <sys/un.h>

namespace DawflowIPC {

SocketClient::SocketClient ()
	: _fd (-1)
	, _connected (false)
{
}

SocketClient::~SocketClient ()
{
	disconnect ();
}

bool
SocketClient::connect (const std::string& socket_path)
{
	if (_connected.load ()) {
		return false;
	}

	_fd = ::socket (AF_UNIX, SOCK_STREAM, 0);
	if (_fd < 0) {
		return false;
	}

	/* Set SO_NOSIGPIPE on macOS */
#ifdef SO_NOSIGPIPE
	int optval = 1;
	::setsockopt (_fd, SOL_SOCKET, SO_NOSIGPIPE, &optval, sizeof (optval));
#endif

	struct sockaddr_un addr;
	std::memset (&addr, 0, sizeof (addr));
	addr.sun_family = AF_UNIX;
	std::strncpy (addr.sun_path, socket_path.c_str (), sizeof (addr.sun_path) - 1);

	if (::connect (_fd, (struct sockaddr*)&addr, sizeof (addr)) < 0) {
		::close (_fd);
		_fd = -1;
		return false;
	}

	_connected.store (true);
	_read_thread = std::thread (&SocketClient::_read_loop, this);
	return true;
}

void
SocketClient::disconnect ()
{
	if (!_connected.load ()) {
		return;
	}

	_connected.store (false);

	if (_fd >= 0) {
		::shutdown (_fd, SHUT_RDWR);
		::close (_fd);
		_fd = -1;
	}

	if (_read_thread.joinable ()) {
		_read_thread.join ();
	}
}

bool
SocketClient::send (const Message& msg)
{
	if (!_connected.load ()) {
		return false;
	}

	std::lock_guard<std::mutex> lock (_write_mutex);

	std::string data = msg.serialize ();
	ssize_t     written = ::write (_fd, data.c_str (), data.size ());
	return (written == static_cast<ssize_t> (data.size ()));
}

void
SocketClient::on_message (MessageHandler handler)
{
	_message_handler = handler;
}

bool
SocketClient::is_connected () const
{
	return _connected.load ();
}

void
SocketClient::_read_loop ()
{
	std::string buffer;
	char        chunk[4096];

	while (_connected.load ()) {
		struct pollfd pfd;
		pfd.fd      = _fd;
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

		ssize_t n = ::read (_fd, chunk, sizeof (chunk));

		if (n <= 0) {
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
					_message_handler (msg);
				} catch (...) {
					/* Malformed message — skip */
				}
			}
		}
	}

	_connected.store (false);
}

} /* namespace DawflowIPC */
