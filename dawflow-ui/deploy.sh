#!/bin/bash
# Build the React UI and deploy it into the engine's web surface directory
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENGINE_DIR="$SCRIPT_DIR/../engine"
TARGET="$ENGINE_DIR/share/web_surfaces/builtin/dawflow"

echo "Building DAWFLOW UI..."
npm run build

echo "Deploying to $TARGET..."
mkdir -p "$TARGET"
rm -rf "$TARGET/assets"
cp -r dist/* "$TARGET/"

echo ""
echo "Done. Refresh the browser or restart DAWFLOW to see changes."
echo "  http://localhost:3818/builtin/dawflow/"
echo ""
