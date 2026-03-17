/*
 * DawflowIPC - Unix Domain Socket Client
 *
 * Connects to a DawflowIPC::SocketServer over a Unix domain socket.
 * Runs a reader thread for incoming messages. Messages are newline-delimited JSON.
 *
 * Thread-safe. Uses poll() for non-blocking I/O with clean shutdown semantics.
 */

#ifndef DAWFLOW_IPC_SOCKET_CLIENT_H
#define DAWFLOW_IPC_SOCKET_CLIENT_H

#include <atomic>
#include <functional>
#include <mutex>
#include <string>
#include <thread>

#include "dawflow_ipc/message.h"

namespace DawflowIPC {

class SocketClient {
public:
	using MessageHandler = std::function<void(const Message& msg)>;

	SocketClient ();
	~SocketClient ();

	/** Connect to a server at the given Unix domain socket path. */
	bool connect (const std::string& socket_path);

	/** Disconnect from the server. */
	void disconnect ();

	/** Send a message to the server. */
	bool send (const Message& msg);

	/** Register handler for incoming messages. */
	void on_message (MessageHandler handler);

	/** Check if currently connected. */
	bool is_connected () const;

private:
	void _read_loop ();

	int               _fd;
	std::atomic<bool> _connected;
	std::thread       _read_thread;
	std::mutex        _write_mutex;
	MessageHandler    _message_handler;
};

} /* namespace DawflowIPC */

#endif /* DAWFLOW_IPC_SOCKET_CLIENT_H */
