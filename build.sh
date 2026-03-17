#!/bin/bash
# DAWFLOW Product Build Script
# Builds the GPL engine + proprietary React UI and assembles them
set -e

TOP="$(cd "$(dirname "$0")" && pwd)"
ENGINE="$TOP/engine"

echo "=== DAWFLOW Build ==="

# --- Step 1: Initialize engine submodule if needed ---
if [ ! -f "$ENGINE/wscript" ]; then
    echo "[1/4] Initializing engine submodule..."
    git submodule update --init --recursive
else
    echo "[1/4] Engine submodule OK"
fi

# --- Step 2: Configure engine (if not already configured) ---
if [ ! -f "$ENGINE/build/c4che/_cache.py" ]; then
    echo "[2/4] Configuring engine..."
    cd "$ENGINE"


    export PKG_CONFIG_PATH="/opt/homebrew/opt/libarchive/lib/pkgconfig:/opt/homebrew/lib/pkgconfig:/opt/homebrew/share/pkgconfig"
    export CXXFLAGS="-I/opt/homebrew/include -I/opt/homebrew/opt/libarchive/include -I/opt/homebrew/include/raptor2"
    export CFLAGS="-I/opt/homebrew/include -I/opt/homebrew/opt/libarchive/include -I/opt/homebrew/include/raptor2"
    export LDFLAGS="-L/opt/homebrew/lib -L/opt/homebrew/opt/libarchive/lib"
    python3 waf configure \
        --with-backends=coreaudio,dummy \
        --no-phone-home \
        --boost-include=/opt/homebrew/include \
        --also-include=/opt/homebrew/include,/opt/homebrew/opt/libarchive/include,/opt/homebrew/include/raptor2 \
        --also-libdir=/opt/homebrew/lib,/opt/homebrew/opt/libarchive/lib \
        --keepflags --arm64 --noconfirm
    cd "$TOP"
else
    echo "[2/4] Engine already configured"
fi

# --- Step 3: Build engine ---
echo "[3/4] Building engine..."
cd "$ENGINE"
python3 waf build -j$(sysctl -n hw.ncpu)
cd "$TOP"

# --- Step 4: Build and deploy React UI ---
echo "[4/4] Building React UI..."
cd "$TOP/dawflow-ui"
if [ ! -d node_modules ]; then
    npm install
fi
npm run build

# Deploy built UI into engine's web_surfaces directory
mkdir -p "$ENGINE/share/web_surfaces/builtin/dawflow"
rm -rf "$ENGINE/share/web_surfaces/builtin/dawflow/assets"
cp -r dist/* "$ENGINE/share/web_surfaces/builtin/dawflow/"
cd "$TOP"

echo ""
echo "=== Build complete ==="
echo "Run: ./run-dawflow.sh"
