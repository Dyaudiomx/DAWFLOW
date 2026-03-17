#!/bin/bash
set -e

# Detect platform
PLATFORM="macos-arm64"
[[ "$(uname -m)" == "x86_64" ]] && PLATFORM="macos-x86_64"
[[ "$(uname)" == "Linux" ]] && PLATFORM="linux-x86_64"

echo "Building DAWFLOW AI Chat for $PLATFORM..."
mkdir -p "bin/$PLATFORM"
clang++ -std=c++17 -O2 -pthread -I../../ src/main.cpp -o "bin/$PLATFORM/dawflow-ai-chat"
echo "Built: bin/$PLATFORM/dawflow-ai-chat"

echo "Packaging..."
zip -r dawflow-ai-chat.dawflow manifest.json bin/ ui/
echo "Package: dawflow-ai-chat.dawflow"
