#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Detect platform
PLATFORM="macos-arm64"
[[ "$(uname -m)" == "x86_64" ]] && PLATFORM="macos-x86_64"
[[ "$(uname)" == "Linux" ]] && PLATFORM="linux-x86_64"

echo "Building DAWFLOW UI Shell plugin for $PLATFORM..."

mkdir -p "$SCRIPT_DIR/bin/$PLATFORM"
clang++ -std=c++17 -O2 -pthread \
    -I"$SCRIPT_DIR/../../" \
    "$SCRIPT_DIR/src/main.cpp" \
    -o "$SCRIPT_DIR/bin/$PLATFORM/dawflow-ui-shell"

# Ensure ui/ directory exists
mkdir -p "$SCRIPT_DIR/ui"

# Package as .dawflow
echo "Packaging..."
cd "$SCRIPT_DIR"
rm -f dawflow-ui-shell.dawflow
zip -r dawflow-ui-shell.dawflow manifest.json bin/ ui/ -x '*.DS_Store'

echo "Done: dawflow-ui-shell.dawflow"
echo "Install: cp dawflow-ui-shell.dawflow ~/.config/dawflow/plugins/"
