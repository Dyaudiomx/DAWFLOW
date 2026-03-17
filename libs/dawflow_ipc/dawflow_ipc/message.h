/*
 * DawflowIPC - JSON-RPC 2.0 Message Protocol Library
 *
 * Part of the DAWFLOW plugin system. This library provides the foundational
 * message protocol for IPC between the DAW and plugin processes.
 *
 * Zero dependencies on Ardour internals. Only requires nlohmann/json and C++17.
 */

#ifndef DAWFLOW_IPC_MESSAGE_H
#define DAWFLOW_IPC_MESSAGE_H

#include <cstdint>
#include <optional>
#include <string>

#include "dawflow_ipc/json.hpp"

namespace DawflowIPC {

using json = nlohmann::json;

struct Message {
	enum class Type {
		Request,
		Response,
		Notification
	};

	Type        type;
	std::string method;
	json        params;
	json        result;
	json        error;
	std::optional<int64_t> id;

	/** Serialize this message to a newline-terminated JSON string. */
	std::string serialize () const;

	/** Deserialize a JSON string into a Message. */
	static Message deserialize (const std::string& data);

	/* Factory methods */

	/** Create a JSON-RPC 2.0 request with an id. */
	static Message request (int64_t id, const std::string& method, const json& params = json::object ());

	/** Create a JSON-RPC 2.0 notification (no id). */
	static Message notification (const std::string& method, const json& params = json::object ());

	/** Create a successful JSON-RPC 2.0 response. */
	static Message response_ok (int64_t id, const json& result = json());

	/** Create an error JSON-RPC 2.0 response. */
	static Message response_error (int64_t id, int code, const std::string& message, const json& data = json());
};

} /* namespace DawflowIPC */

#endif /* DAWFLOW_IPC_MESSAGE_H */
