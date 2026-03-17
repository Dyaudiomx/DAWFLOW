#!/bin/bash
set -e

# Detect platform
if [[ "$(uname)" == "Darwin" ]]; then
    if [[ "$(uname -m)" == "arm64" ]]; then
        PLATFORM="macos-arm64"
    else
        PLATFORM="macos-x86_64"
    fi
else
    PLATFORM="linux-x86_64"
fi

echo "Building hello-plugin for $PLATFORM..."
mkdir -p "bin/$PLATFORM"
clang++ -std=c++17 -O2 -pthread main.cpp -o "bin/$PLATFORM/hello-plugin"
echo "Built: bin/$PLATFORM/hello-plugin"

echo "Packaging..."
zip -r hello-plugin.dawflow manifest.json bin/ ui/
echo "Package: hello-plugin.dawflow"
