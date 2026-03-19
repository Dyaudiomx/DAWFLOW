"""
DAWFLOW IPC Client — connects to engine via Unix domain socket (JSON-RPC 2.0).

Usage:
    client = DawflowIPC()          # auto-discovers socket
    result = client.call("daw.get_session_info")
    client.close()
"""

import json
import os
import glob
import socket
import struct
import time


class DawflowIPC:
    """JSON-RPC 2.0 client over Unix domain socket."""

    def __init__(self, socket_path=None):
        if socket_path is None:
            socket_path = self._discover_socket()
        self._path = socket_path
        self._sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self._sock.settimeout(10.0)
        self._sock.connect(self._path)
        self._id = 0

    def _discover_socket(self):
        """Find /tmp/dawflow-*.sock."""
        matches = glob.glob("/tmp/dawflow-*.sock")
        if not matches:
            raise RuntimeError("No DAWFLOW socket found. Is DAWFLOW running?")
        # Pick the most recent
        matches.sort(key=os.path.getmtime, reverse=True)
        return matches[0]

    def call(self, method, params=None, timeout=10.0):
        """Send a JSON-RPC 2.0 request and return the result."""
        self._id += 1
        request = {
            "jsonrpc": "2.0",
            "id": self._id,
            "method": method,
        }
        if params:
            request["params"] = params

        data = json.dumps(request).encode("utf-8")
        # Send length-prefixed message
        self._sock.sendall(struct.pack("!I", len(data)) + data)

        # Read response
        self._sock.settimeout(timeout)
        header = self._recv_exact(4)
        length = struct.unpack("!I", header)[0]
        body = self._recv_exact(length)
        response = json.loads(body.decode("utf-8"))

        if "error" in response:
            raise RuntimeError(f"IPC error: {response['error']}")
        return response.get("result", response)

    def _recv_exact(self, n):
        """Read exactly n bytes."""
        buf = b""
        while len(buf) < n:
            chunk = self._sock.recv(n - len(buf))
            if not chunk:
                raise ConnectionError("Socket closed")
            buf += chunk
        return buf

    def close(self):
        self._sock.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()
