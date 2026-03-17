/*
 * DawflowIPC - Message Protocol Tests
 *
 * Standalone test binary for the JSON-RPC 2.0 message library.
 * Compile: clang++ -std=c++17 -I libs/dawflow_ipc libs/dawflow_ipc/message.cc \
 *          libs/dawflow_ipc/test/test_message.cc -o /tmp/test_message && /tmp/test_message
 */

#include "dawflow_ipc/message.h"

#include <cassert>
#include <iostream>
#include <string>

using namespace DawflowIPC;
using json = nlohmann::json;

static int tests_run    = 0;
static int tests_passed = 0;

#define TEST(name)                                           \
	do {                                                 \
		++tests_run;                                 \
		std::cout << "  " << #name << "... ";        \
		try {                                        \
			test_##name ();                      \
			++tests_passed;                      \
			std::cout << "ok" << std::endl;      \
		} catch (const std::exception& e) {          \
			std::cout << "FAIL: " << e.what ()   \
			          << std::endl;               \
		}                                            \
	} while (0)

/* ----- Test: Request serialization and roundtrip ----- */

static void
test_request_roundtrip ()
{
	auto msg = Message::request (1, "plugin.activate", {{"plugin_id", "com.example.synth"}});

	std::string wire = msg.serialize ();

	/* Must be newline-terminated */
	assert (wire.back () == '\n');

	/* Parse the JSON to verify structure */
	json j = json::parse (wire);
	assert (j["jsonrpc"] == "2.0");
	assert (j["method"] == "plugin.activate");
	assert (j["id"] == 1);
	assert (j["params"]["plugin_id"] == "com.example.synth");

	/* Roundtrip through deserialize */
	auto rt = Message::deserialize (wire);
	assert (rt.type == Message::Type::Request);
	assert (rt.method == "plugin.activate");
	assert (rt.id.has_value ());
	assert (rt.id.value () == 1);
	assert (rt.params["plugin_id"] == "com.example.synth");
}

/* ----- Test: Notification serialization and roundtrip ----- */

static void
test_notification_roundtrip ()
{
	auto msg = Message::notification ("transport.play", {{"bpm", 120}});

	std::string wire = msg.serialize ();
	assert (wire.back () == '\n');

	json j = json::parse (wire);
	assert (j["jsonrpc"] == "2.0");
	assert (j["method"] == "transport.play");
	assert (j["params"]["bpm"] == 120);
	/* Notifications must NOT have an id field */
	assert (!j.contains ("id"));

	auto rt = Message::deserialize (wire);
	assert (rt.type == Message::Type::Notification);
	assert (rt.method == "transport.play");
	assert (!rt.id.has_value ());
	assert (rt.params["bpm"] == 120);
}

/* ----- Test: Response OK serialization and roundtrip ----- */

static void
test_response_ok_roundtrip ()
{
	auto msg = Message::response_ok (42, {{"status", "active"}, {"latency_ms", 5.2}});

	std::string wire = msg.serialize ();
	assert (wire.back () == '\n');

	json j = json::parse (wire);
	assert (j["jsonrpc"] == "2.0");
	assert (j["id"] == 42);
	assert (j["result"]["status"] == "active");
	assert (j["result"]["latency_ms"] == 5.2);
	assert (!j.contains ("error"));

	auto rt = Message::deserialize (wire);
	assert (rt.type == Message::Type::Response);
	assert (rt.id.has_value ());
	assert (rt.id.value () == 42);
	assert (rt.result["status"] == "active");
	assert (rt.error.is_null ());
}

/* ----- Test: Error response serialization and roundtrip ----- */

static void
test_response_error_roundtrip ()
{
	auto msg = Message::response_error (7, -32601, "Method not found", {{"attempted", "foo.bar"}});

	std::string wire = msg.serialize ();
	assert (wire.back () == '\n');

	json j = json::parse (wire);
	assert (j["jsonrpc"] == "2.0");
	assert (j["id"] == 7);
	assert (j["error"]["code"] == -32601);
	assert (j["error"]["message"] == "Method not found");
	assert (j["error"]["data"]["attempted"] == "foo.bar");
	assert (!j.contains ("result"));

	auto rt = Message::deserialize (wire);
	assert (rt.type == Message::Type::Response);
	assert (rt.id.has_value ());
	assert (rt.id.value () == 7);
	assert (rt.error["code"] == -32601);
	assert (rt.error["message"] == "Method not found");
	assert (rt.result.is_null ());
}

/* ----- Test: Empty params ----- */

static void
test_empty_params ()
{
	/* Request with default empty params */
	auto msg = Message::request (99, "session.save");

	std::string wire = msg.serialize ();
	json j = json::parse (wire);

	/* Empty object params should be included */
	assert (j.contains ("params"));
	assert (j["params"].is_object ());
	assert (j["params"].empty ());

	auto rt = Message::deserialize (wire);
	assert (rt.method == "session.save");
	assert (rt.params.is_object ());
}

/* ----- Test: Null result in response ----- */

static void
test_null_result ()
{
	auto msg = Message::response_ok (10);

	std::string wire = msg.serialize ();
	json j = json::parse (wire);

	assert (j.contains ("result"));
	assert (j["result"].is_null ());
	assert (j["id"] == 10);

	auto rt = Message::deserialize (wire);
	assert (rt.type == Message::Type::Response);
	assert (rt.result.is_null ());
}

/* ----- Test: Error response without extra data ----- */

static void
test_error_no_data ()
{
	auto msg = Message::response_error (3, -32700, "Parse error");

	std::string wire = msg.serialize ();
	json j = json::parse (wire);

	assert (j["error"]["code"] == -32700);
	assert (j["error"]["message"] == "Parse error");
	assert (!j["error"].contains ("data"));

	auto rt = Message::deserialize (wire);
	assert (rt.error["code"] == -32700);
}

/* ----- Test: Large id values ----- */

static void
test_large_id ()
{
	int64_t big_id = 9223372036854775807LL; /* INT64_MAX */
	auto msg = Message::request (big_id, "test.large_id");

	std::string wire = msg.serialize ();
	auto rt = Message::deserialize (wire);
	assert (rt.id.has_value ());
	assert (rt.id.value () == big_id);
}

/* ----- Main ----- */

int
main ()
{
	std::cout << "Running DawflowIPC message tests..." << std::endl;

	TEST (request_roundtrip);
	TEST (notification_roundtrip);
	TEST (response_ok_roundtrip);
	TEST (response_error_roundtrip);
	TEST (empty_params);
	TEST (null_result);
	TEST (error_no_data);
	TEST (large_id);

	std::cout << std::endl;

	if (tests_passed == tests_run) {
		std::cout << "All message tests passed! (" << tests_passed << "/" << tests_run << ")" << std::endl;
		return 0;
	} else {
		std::cout << "FAILED: " << tests_passed << "/" << tests_run << " tests passed." << std::endl;
		return 1;
	}
}
