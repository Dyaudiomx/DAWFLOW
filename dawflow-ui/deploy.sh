#!/bin/bash
# Build the React UI and deploy to both engine web surface and ui-shell plugin
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENGINE_DIR="$SCRIPT_DIR/../engine"
PLUGIN_UI_DIR="$SCRIPT_DIR/../sdk/plugins/ui-shell/ui"
ENGINE_TARGET="$ENGINE_DIR/share/web_surfaces/builtin/dawflow"

echo "Building DAWFLOW UI..."
npm run build

# Deploy to engine web surfaces (for browser access)
echo "Deploying to engine web surfaces..."
mkdir -p "$ENGINE_TARGET"
rm -rf "$ENGINE_TARGET/assets"
cp -r dist/* "$ENGINE_TARGET/"

# Deploy to ui-shell plugin (for in-app WebView)
echo "Deploying to ui-shell plugin..."
mkdir -p "$PLUGIN_UI_DIR"
rm -rf "$PLUGIN_UI_DIR/assets"
cp -r dist/* "$PLUGIN_UI_DIR/"

echo ""
echo "Done. UI deployed to:"
echo "  Engine:  $ENGINE_TARGET"
echo "  Plugin:  $PLUGIN_UI_DIR"
echo ""
echo "To rebuild the plugin package:"
echo "  cd sdk/plugins/ui-shell && ./build.sh"
echo ""
