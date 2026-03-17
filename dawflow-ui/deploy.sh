#!/bin/bash
# Build the React UI and deploy it as an Ardour web surface
set -e

echo "Building DAWFLOW UI..."
npm run build

echo "Deploying to share/web_surfaces/builtin/dawflow/..."
rm -rf "../share/web_surfaces/builtin/dawflow/assets"
cp -r dist/* "../share/web_surfaces/builtin/dawflow/"

echo ""
echo "✓ Deployed! To use:"
echo "  1. Open DAWFLOW/Ardour"
echo "  2. Go to Preferences → Control Surfaces → Enable 'WebSockets Server'"
echo "  3. Open browser to: http://localhost:3818/builtin/dawflow/"
echo "  4. The UI will auto-connect to the running engine"
echo ""
