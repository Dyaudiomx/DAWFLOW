/*
 * DawflowIPC Socket Transport Integration Test
 *
 * Tests SocketServer and SocketClient end-to-end in a single process.
 * Verifies connection, messaging, broadcast, disconnect, and cleanup.
 */

#include <atomic>
#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <string>
#include <thread>
#include <unistd.h>

#include "dawflow_ipc/message.h"
#include "dawflow_ipc/socket_server.h"
#include "dawflow_ipc/socket_client.h"

static int tests_passed = 0;
static int tests_total  = 0;

static void
check (const char* name, bool condition)
{
	tests_total++;
	if (condition) {
		tests_passed++;
		std::printf ("  %s... ok\n", name);
	} else {
		std::printf ("  %s... FAILED\n", name);
	}
}

static void
brief_wait (int ms = 200)
{
	std::this_thread::sleep_for (std::chrono::milliseconds (ms));
}

int
main ()
{
	std::printf ("Running DawflowIPC socket tests...\n");

	/* Generate a unique socket path */
	std::string socket_path = "/tmp/dawflow_test_" + std::to_string (::getpid ()) + ".sock";

	/* ---- Test 1: Server Start ---- */
	DawflowIPC::SocketServer server;

	std::atomic<bool>   client_connected (false);
	std::atomic<bool>   client_disconnected (false);
	std::string         connected_client_id;
	std::string         disconnected_client_id;

	/* Message received by server */
	std::atomic<bool>   server_got_message (false);
	std::string         server_received_method;
	std::string         server_sender_id;

	server.on_connect ([&](const std::string& client_id) {
		connected_client_id = client_id;
		client_connected.store (true);
	});

	server.on_disconnect ([&](const std::string& client_id) {
		disconnected_client_id = client_id;
		client_disconnected.store (true);
	});

	server.on_message ([&](const std::string& client_id, const DawflowIPC::Message& msg) {
		server_received_method = msg.method;
		server_sender_id       = client_id;
		server_got_message.store (true);

		/* Echo back a response */
		if (msg.id.has_value ()) {
			auto response = DawflowIPC::Message::response_ok (
				msg.id.value (),
				DawflowIPC::json ({{"status", "ok"}})
			);
			server.send (client_id, response);
		}
	});

	bool started = server.start (socket_path);
	check ("server_start", started && server.is_running ());

	/* ---- Test 2: Client Connect ---- */
	DawflowIPC::SocketClient client;

	/* Message received by client */
	std::atomic<bool>   client_got_response (false);
	DawflowIPC::json    client_received_result;

	std::atomic<bool>   client_got_broadcast (false);
	std::string         client_broadcast_method;

	client.on_message ([&](const DawflowIPC::Message& msg) {
		if (msg.type == DawflowIPC::Message::Type::Response) {
			client_received_result = msg.result;
			client_got_response.store (true);
		} else if (msg.type == DawflowIPC::Message::Type::Notification) {
			client_broadcast_method = msg.method;
			client_got_broadcast.store (true);
		}
	});

	bool connected = client.connect (socket_path);
	brief_wait ();
	check ("client_connect", connected && client.is_connected () && client_connected.load ());

	/* ---- Test 3: Client-to-Server Message ---- */
	auto request = DawflowIPC::Message::request (1, "plugin.register", {{"name", "TestPlugin"}});
	client.send (request);
	brief_wait ();
	check ("client_to_server_message",
	       server_got_message.load () && server_received_method == "plugin.register");

	/* ---- Test 4: Server-to-Client Response ---- */
	/* The server's on_message handler already sent a response */
	brief_wait ();
	check ("server_to_client_response",
	       client_got_response.load () &&
	       client_received_result.contains ("status") &&
	       client_received_result["status"] == "ok");

	/* ---- Test 5: Broadcast ---- */
	auto notification = DawflowIPC::Message::notification ("transport.play", {{"position", 0}});
	server.broadcast (notification);
	brief_wait ();
	check ("broadcast",
	       client_got_broadcast.load () && client_broadcast_method == "transport.play");

	/* ---- Test 6: Client Disconnect ---- */
	std::string expected_disconnect_id = connected_client_id;
	client.disconnect ();
	brief_wait (300);
	check ("client_disconnect",
	       !client.is_connected () &&
	       client_disconnected.load () &&
	       disconnected_client_id == expected_disconnect_id);

	/* ---- Test 7: Server Stop ---- */
	server.stop ();
	check ("server_stop", !server.is_running ());

	/* Verify socket file is cleaned up */
	bool socket_cleaned = (::access (socket_path.c_str (), F_OK) != 0);
	if (!socket_cleaned) {
		::unlink (socket_path.c_str ());
		std::printf ("  (warning: socket file was not cleaned up)\n");
	}

	std::printf ("\n");
	if (tests_passed == tests_total) {
		std::printf ("All socket tests passed! (%d/%d)\n", tests_passed, tests_total);
		return 0;
	} else {
		std::printf ("Some tests FAILED! (%d/%d passed)\n", tests_passed, tests_total);
		return 1;
	}
}
