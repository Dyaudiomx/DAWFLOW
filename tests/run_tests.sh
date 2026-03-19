#!/bin/bash
# Run DAWFLOW integration tests against a running DAWFLOW instance.
# Usage: ./tests/run_tests.sh
#
# Prerequisites:
#   1. DAWFLOW must be running with a session loaded
#   2. Python 3 must be available
#
# The tests connect via Unix socket at /tmp/dawflow-<pid>.sock

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "DAWFLOW Integration Test Runner"
echo "================================"

# Check for socket
SOCKET=$(ls -t /tmp/dawflow-*.sock 2>/dev/null | head -1)
if [ -z "$SOCKET" ]; then
    echo "ERROR: No DAWFLOW socket found at /tmp/dawflow-*.sock"
    echo "Make sure DAWFLOW is running with a session loaded."
    exit 1
fi
echo "Found socket: $SOCKET"

# Run tests
python3 test_simulation_integrity.py
