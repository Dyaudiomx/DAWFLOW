/*
 * DawflowIPC - Unix Domain Socket Server
 *
 * Accepts connections from plugin processes over a Unix domain socket.
 * Each client gets a dedicated reader thread. Messages are newline-delimited JSON.
 *
 * Thread-safe. Uses poll() for non-blocking I/O with clean shutdown semantics.
 */

#ifndef DAWFLOW_IPC_SOCKET_SERVER_H
#define DAWFLOW_IPC_SOCKET_SERVER_H

#include <atomic>
#include <functional>
#include <map>
#include <mutex>
#include <string>
#include <thread>
#include <vector>

#include "dawflow_ipc/message.h"

namespace DawflowIPC {

class SocketServer {
public:
	using MessageHandler    = std::function<void(const std::string& client_id, const Message& msg)>;
	using ConnectHandler    = std::function<void(const std::string& client_id)>;
	using DisconnectHandler = std::function<void(const std::string& client_id)>;

	SocketServer ();
	~SocketServer ();

	/** Start listening on the given Unix domain socket path. */
	bool start (const std::string& socket_path);

	/** Stop the server, close all connections, clean up socket file. */
	void stop ();

	/** Send a message to a specific client. */
	bool send (const std::string& client_id, const Message& msg);

	/** Broadcast a message to all connected clients. */
	void broadcast (const Message& msg);

	/** Register handler for incoming messages. */
	void on_message (MessageHandler handler);

	/** Register handler for new client connections. */
	void on_connect (ConnectHandler handler);

	/** Register handler for client disconnections. */
	void on_disconnect (DisconnectHandler handler);

	/** Check if the server is currently running. */
	bool is_running () const;

private:
	void _accept_loop ();
	void _client_loop (const std::string& client_id, int client_fd);

	std::string       _socket_path;
	int               _server_fd;
	std::atomic<bool> _running;
	int               _next_client_id;

	std::thread _accept_thread;

	mutable std::mutex              _clients_mutex;
	std::map<std::string, int>      _client_fds;
	std::vector<std::thread>        _client_threads;

	MessageHandler    _message_handler;
	ConnectHandler    _connect_handler;
	DisconnectHandler _disconnect_handler;
};

} /* namespace DawflowIPC */

#endif /* DAWFLOW_IPC_SOCKET_SERVER_H */
