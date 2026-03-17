/*
 * DawflowIPC - JSON-RPC 2.0 Message Protocol Library
 *
 * Implementation of the Message struct serialization and factory methods.
 */

#include "dawflow_ipc/message.h"

#include <stdexcept>

namespace DawflowIPC {

std::string
Message::serialize () const
{
	json j;
	j["jsonrpc"] = "2.0";

	switch (type) {
	case Type::Request:
		j["method"] = method;
		if (!params.is_null ()) {
			j["params"] = params;
		}
		if (id.has_value ()) {
			j["id"] = id.value ();
		}
		break;

	case Type::Notification:
		j["method"] = method;
		if (!params.is_null ()) {
			j["params"] = params;
		}
		/* Notifications have no id field */
		break;

	case Type::Response:
		if (!error.is_null ()) {
			j["error"] = error;
		} else {
			j["result"] = result;
		}
		if (id.has_value ()) {
			j["id"] = id.value ();
		} else {
			j["id"] = nullptr;
		}
		break;
	}

	return j.dump () + "\n";
}

Message
Message::deserialize (const std::string& data)
{
	json j = json::parse (data);
	Message msg;

	if (!j.contains ("jsonrpc") || j["jsonrpc"] != "2.0") {
		throw std::runtime_error ("Invalid JSON-RPC 2.0 message: missing or wrong jsonrpc field");
	}

	if (j.contains ("method")) {
		msg.method = j["method"].get<std::string> ();

		if (j.contains ("params")) {
			msg.params = j["params"];
		}

		if (j.contains ("id")) {
			msg.type = Type::Request;
			msg.id   = j["id"].get<int64_t> ();
		} else {
			msg.type = Type::Notification;
		}
	} else {
		/* Response */
		msg.type = Type::Response;

		if (j.contains ("result")) {
			msg.result = j["result"];
		}
		if (j.contains ("error")) {
			msg.error = j["error"];
		}
		if (j.contains ("id") && !j["id"].is_null ()) {
			msg.id = j["id"].get<int64_t> ();
		}
	}

	return msg;
}

Message
Message::request (int64_t id, const std::string& method, const json& params)
{
	Message msg;
	msg.type   = Type::Request;
	msg.id     = id;
	msg.method = method;
	msg.params = params;
	return msg;
}

Message
Message::notification (const std::string& method, const json& params)
{
	Message msg;
	msg.type   = Type::Notification;
	msg.method = method;
	msg.params = params;
	return msg;
}

Message
Message::response_ok (int64_t id, const json& result)
{
	Message msg;
	msg.type   = Type::Response;
	msg.id     = id;
	msg.result = result;
	return msg;
}

Message
Message::response_error (int64_t id, int code, const std::string& message, const json& data)
{
	Message msg;
	msg.type  = Type::Response;
	msg.id    = id;

	msg.error = {
		{"code", code},
		{"message", message}
	};

	if (!data.is_null ()) {
		msg.error["data"] = data;
	}

	return msg;
}

} /* namespace DawflowIPC */
