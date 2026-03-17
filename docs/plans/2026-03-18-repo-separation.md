# Repository Separation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split the single DAWFLOW repo into two: a GPL engine repo (`dawflow-engine`) and a proprietary product repo (`DAWFLOW`), with the engine as a git submodule.

**Architecture:** The current `Dyaudiomx/DAWFLOW` repo contains Ardour engine source (GPL, tracked) mixed with proprietary files (untracked). We push the GPL code to a new `dawflow-engine` repo, remove engine files from the product repo, add the engine back as a submodule under `engine/`, then commit all proprietary files to the product repo.

**Tech Stack:** Git, GitHub CLI (`gh`), Bash, waf (Python build system), npm/Vite (React UI)

---

## Current State

**Tracked in git (GPL — moves to engine):**
- `libs/` (all Ardour libs + `dawflow_ipc/`)
- `gtk2_ardour/` (GUI + webview panel + plugin manager)
- `share/` (web surfaces: mixer, transport, protocol — but NOT `builtin/dawflow/`)
- `wscript`, `.gitignore`, all other Ardour source files
- `sdk/` (currently tracked — needs to be REMOVED from engine, kept in product)

**Untracked (proprietary — stays in product):**
- `dawflow-ui/` (React UI)
- `share/web_surfaces/builtin/dawflow/` (built UI assets)
- `docs/`, `CLAUDE.md`, `run-dawflow.sh`
- `DAWFLOW LOGO.psd`, `CUBASE_15_UI_RESEARCH.md`

**Remotes:**
- `origin` → `https://github.com/Dyaudiomx/DAWFLOW.git`
- `upstream` → `https://github.com/Ardour/ardour.git`

**Branch:** `feature/dawflow-plugin-system`

---

### Task 1: Back Up Untracked Proprietary Files

Before any git operations, ensure nothing gets lost.

**Step 1: Copy untracked files to a safe temp location**

```bash
mkdir -p /tmp/dawflow-backup
cp -r "/Users/davidyousefi/dev/DAW FLOW/dawflow-ui" /tmp/dawflow-backup/
cp -r "/Users/davidyousefi/dev/DAW FLOW/docs" /tmp/dawflow-backup/
cp -r "/Users/davidyousefi/dev/DAW FLOW/sdk" /tmp/dawflow-backup/
cp "/Users/davidyousefi/dev/DAW FLOW/CLAUDE.md" /tmp/dawflow-backup/
cp "/Users/davidyousefi/dev/DAW FLOW/CUBASE_15_UI_RESEARCH.md" /tmp/dawflow-backup/
cp "/Users/davidyousefi/dev/DAW FLOW/run-dawflow.sh" /tmp/dawflow-backup/
cp "/Users/davidyousefi/dev/DAW FLOW/DAWFLOW LOGO.psd" /tmp/dawflow-backup/
cp -r "/Users/davidyousefi/dev/DAW FLOW/share/web_surfaces/builtin/dawflow" /tmp/dawflow-backup/dawflow-web-surface
```

**Step 2: Verify backup**

```bash
ls -la /tmp/dawflow-backup/
```

Expected: All files present (dawflow-ui/, docs/, sdk/, CLAUDE.md, etc.)

---

### Task 2: Create dawflow-engine Repo on GitHub

**Step 1: Create the private repo**

```bash
gh repo create Dyaudiomx/dawflow-engine --private --description "DAWFLOW Engine - Ardour fork with plugin system (GPL-2.0-or-later)"
```

Expected: `https://github.com/Dyaudiomx/dawflow-engine` created

**Step 2: Add it as a remote in the current repo**

```bash
cd "/Users/davidyousefi/dev/DAW FLOW"
git remote add engine https://github.com/Dyaudiomx/dawflow-engine.git
```

**Step 3: Verify remotes**

```bash
git remote -v
```

Expected: `origin`, `upstream`, and `engine` all listed

---

### Task 3: Remove SDK From Engine History and Push

The `sdk/` directory is tracked but should NOT be in the engine repo (it's MIT, ships with the product). We need to remove it from the branch before pushing to the engine repo.

**Step 1: Create a clean engine branch**

```bash
cd "/Users/davidyousefi/dev/DAW FLOW"
git checkout -b engine-clean feature/dawflow-plugin-system
```

**Step 2: Remove SDK files from tracking (not from disk)**

```bash
git rm -r --cached sdk/
```

**Step 3: Add SDK to .gitignore for engine**

Add these lines to `.gitignore`:
```
# Proprietary (not part of GPL engine)
sdk/
dawflow-ui/
share/web_surfaces/builtin/dawflow/
docs/plans/
CLAUDE.md
CUBASE_15_UI_RESEARCH.md
DAWFLOW LOGO.psd
run-dawflow.sh
```

**Step 4: Commit the removal**

```bash
git add .gitignore
git commit -m "chore: remove proprietary files from GPL engine

SDK, React UI, docs, and branding are proprietary and distributed
separately from the GPL engine. They do not belong in this repo.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

**Step 5: Push both branches to engine repo**

```bash
git push engine master
git push engine engine-clean:main
```

This pushes:
- `master` (Ardour baseline) as `master`
- `engine-clean` (with DAWFLOW changes, minus SDK) as `main`

**Step 6: Verify on GitHub**

```bash
gh repo view Dyaudiomx/dawflow-engine --web
```

Expected: Repo exists with `main` branch containing engine code, no `sdk/` directory

**Step 7: Go back to the working branch**

```bash
git checkout feature/dawflow-plugin-system
git branch -D engine-clean
```

---

### Task 4: Restructure Product Repo

Now we transform the current DAWFLOW repo into the product repo.

**Step 1: Remove all tracked engine files from product repo**

This is the big step. We remove all the Ardour source from tracking in this repo since it will live in the submodule.

```bash
cd "/Users/davidyousefi/dev/DAW FLOW"

# Remove all tracked files EXCEPT sdk/ (which stays in product repo)
# Use git rm --cached to untrack without deleting from disk
git rm -r --cached libs/ gtk2_ardour/ share/ build/ scripts/ tools/ \
  session_utils/ headless/ luasession/ export/ midi_maps/ mcp/ osc/ \
  templates/ patchfiles/ .gitignore wscript waf COPYING TRANSLATORS \
  PACKAGER_README instant.xml.ardour MSVCbuild/ icons/ \
  system_config ardour.1 *.ardour nutemp/ 2>/dev/null

# Remove any other Ardour top-level files that are tracked
git ls-files | grep -v '^sdk/' | grep -v '^docs/' | xargs -d'\n' git rm --cached 2>/dev/null
```

Note: `2>/dev/null` because some paths may not exist. The `--cached` flag means files stay on disk (we need them for building until the submodule is set up).

**Step 2: Add the engine as a git submodule**

```bash
git submodule add https://github.com/Dyaudiomx/dawflow-engine.git engine
cd engine
git checkout main
cd ..
git add engine
```

**Step 3: Create product repo .gitignore**

Create a new `.gitignore` at the repo root:

```
# Build artifacts
*.o
*.so
*.dylib
node_modules/
dist/

# Engine build output (lives in engine/ submodule)
engine/build/

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/

# Plugin build artifacts
sdk/examples/hello-plugin/bin/
sdk/examples/hello-plugin/hello-plugin.dawflow
sdk/plugins/*/bin/
sdk/plugins/*/*.dawflow

# Deployed web surface (rebuilt from dawflow-ui/)
share/web_surfaces/builtin/dawflow/assets/
```

**Step 4: Create the product repo directory structure**

```bash
mkdir -p plugins configs branding installer
```

**Step 5: Stage and commit all proprietary files**

```bash
git add .gitignore
git add dawflow-ui/
git add sdk/
git add docs/
git add CLAUDE.md
git add "DAWFLOW LOGO.psd"
git add CUBASE_15_UI_RESEARCH.md
git add run-dawflow.sh
git add plugins/ configs/ branding/ installer/
git add engine

git commit -m "chore: restructure as product repo with engine submodule

- Engine (GPL) now lives in engine/ submodule -> dawflow-engine
- Proprietary files (React UI, SDK, plugins, docs) tracked at repo root
- Clean GPL/proprietary boundary at the repo level

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Create build.sh

**File:** Create `/Users/davidyousefi/dev/DAW FLOW/build.sh`

```bash
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
```

---

### Task 6: Update run-dawflow.sh

**File:** Modify `/Users/davidyousefi/dev/DAW FLOW/run-dawflow.sh`

All `$TOP` paths that reference engine code change to `$TOP/engine`. The script becomes:

```bash
#!/bin/bash
# DAWFLOW Launch Script

TOP="$(cd "$(dirname "$0")" && pwd)"
ENGINE="$TOP/engine"
libs="$ENGINE/build/libs"

export GTK2_RC_FILES=/nonexistent
export ARDOUR_SURFACES_PATH="$libs/surfaces/osc:$libs/surfaces/faderport8:$libs/surfaces/faderport:$libs/surfaces/generic_midi:$libs/surfaces/tranzport:$libs/surfaces/powermate:$libs/surfaces/mackie:$libs/surfaces/us2400:$libs/surfaces/wiimote:$libs/surfaces/push2:$libs/surfaces/maschine2:$libs/surfaces/cc121:$libs/surfaces/launch_control_xl:$libs/surfaces/contourdesign:$libs/surfaces/websockets:$libs/surfaces/console1:$libs/surfaces/launchpad_pro:$libs/surfaces/launchpad_x:$libs/surfaces/launchkey_4"
export ARDOUR_PANNER_PATH="$libs/panners"
export ARDOUR_DATA_PATH="$ENGINE/share:$ENGINE/build:$ENGINE/gtk2_ardour:$ENGINE/build/gtk2_ardour"
export ARDOUR_MIDIMAPS_PATH="$ENGINE/share/midi_maps"
export ARDOUR_MIDI_PATCH_PATH="$ENGINE/share/patchfiles"
export ARDOUR_EXPORT_FORMATS_PATH="$ENGINE/share/export"
export ARDOUR_THEMES_PATH="$ENGINE/gtk2_ardour/themes"
export ARDOUR_BACKEND_PATH="$libs/backends/jack:$libs/backends/dummy:$libs/backends/alsa:$libs/backends/coreaudio:$libs/backends/portaudio:$libs/backends/pulseaudio"
export ARDOUR_TEST_PATH="$ENGINE/libs/ardour/test/data"
export PBD_TEST_PATH="$ENGINE/libs/pbd/test"
export EVORAL_TEST_PATH="$ENGINE/libs/evoral/test/testdata"
export MIDIPP_TEST_PATH="$ENGINE/share/patchfiles"
export ARDOUR_INSTANT_XML_PATH="$ENGINE/build/gtk2_ardour"
export ARDOUR_CONFIG_PATH="$ENGINE:$ENGINE/gtk2_ardour:$ENGINE/build:$ENGINE/build/gtk2_ardour"
export ARDOUR_DLL_PATH="$libs"
export GTK_PATH="$HOME/.ardour3:$libs/clearlooks-newer"
export VAMP_PATH="$libs/vamp-plugins:$libs/vamp-pyin${VAMP_PATH:+:$VAMP_PATH}"

if test -d "$libs/tk/suil"; then
    export SUIL_MODULE_DIR="$libs/tk/suil"
fi

export LD_LIBRARY_PATH="$libs/tk/ydk-pixbuf:$libs/tk/ztk:$libs/tk/ydk:$libs/tk/ytk:$libs/tk/ztkmm:$libs/tk/ydkmm:$libs/tk/ytkmm:$libs/tk/suil:$libs/ptformat:$libs/qm-dsp:$libs/vamp-sdk:$libs/surfaces:$libs/ctrl-interface/control_protocol:$libs/ctrl-interface/midi_surface:$libs/ardour:$libs/midi++2:$libs/pbd:$libs/rubberband:$libs/soundtouch:$libs/aaf:$libs/gtkmm2ext:$libs/widgets:$libs/appleutility:$libs/taglib:$libs/evoral:$libs/evoral/src/libsmf:$libs/audiographer:$libs/temporal:$libs/libltc:$libs/canvas:$libs/waveview:$libs/ardouralsautil:$libs/dawflow_ipc${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
export DYLD_FALLBACK_LIBRARY_PATH="$LD_LIBRARY_PATH"

export PKG_CONFIG_PATH="/opt/homebrew/opt/libarchive/lib/pkgconfig:/opt/homebrew/lib/pkgconfig:/opt/homebrew/share/pkgconfig:$PKG_CONFIG_PATH"

# Find the latest built executable
EXECUTABLE=$(ls -t "$ENGINE"/build/gtk2_ardour/ardour-* 2>/dev/null | head -1)
if [ -z "$EXECUTABLE" ]; then
    echo "Error: No ardour executable found. Run ./build.sh first."
    exit 1
fi

echo "Starting DAWFLOW ($EXECUTABLE)..."
exec "$EXECUTABLE" "$@"
```

---

### Task 7: Update dawflow-ui/deploy.sh

**File:** Modify `/Users/davidyousefi/dev/DAW FLOW/dawflow-ui/deploy.sh`

```bash
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
```

---

### Task 8: Update CLAUDE.md for New Structure

**File:** Modify `/Users/davidyousefi/dev/DAW FLOW/CLAUDE.md`

Update the "Project Structure" section and build instructions to reflect:
- Engine source is under `engine/` (submodule)
- Build with `./build.sh` (not direct waf commands)
- `run-dawflow.sh` still works the same way
- When modifying engine code, commit inside `engine/` submodule

Update the "Building" section to:
```
./build.sh           # builds everything (engine + React UI)
./run-dawflow.sh     # launches DAWFLOW
```

For engine-only changes:
```
cd engine
python3 waf build -j$(sysctl -n hw.ncpu)
```

---

### Task 9: Verify Everything Works

**Step 1: Verify engine repo has correct contents**

```bash
gh api repos/Dyaudiomx/dawflow-engine/contents --jq '.[].name' | head -20
```

Expected: `libs/`, `gtk2_ardour/`, `share/`, `wscript`, etc. — NO `sdk/`, NO `dawflow-ui/`

**Step 2: Verify submodule works**

```bash
cd "/Users/davidyousefi/dev/DAW FLOW"
git submodule status
```

Expected: Shows `engine` submodule pointing to a commit on `dawflow-engine`

**Step 3: Verify build**

```bash
cd "/Users/davidyousefi/dev/DAW FLOW"
./build.sh
```

Expected: Engine compiles, React UI builds, assets deployed to `engine/share/web_surfaces/builtin/dawflow/`

**Step 4: Verify launch**

```bash
./run-dawflow.sh
```

Expected: DAWFLOW launches normally. Open `http://localhost:3818/builtin/dawflow/` — React UI loads.

**Step 5: Commit final state**

```bash
git add -A
git status
git commit -m "chore: verify build and launch after repo separation

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Push Product Repo

**Step 1: Push to origin**

```bash
git push origin feature/dawflow-plugin-system
```

**Step 2: Remove the engine remote (no longer needed in product repo)**

```bash
git remote remove engine
```

---

## Post-Separation Workflow

### Day-to-day development

```bash
# Working on React UI or plugins (product repo)
cd "/Users/davidyousefi/dev/DAW FLOW"
# edit dawflow-ui/src/...
cd dawflow-ui && ./deploy.sh

# Working on engine (GPL code)
cd "/Users/davidyousefi/dev/DAW FLOW/engine"
# edit libs/ardour/... or gtk2_ardour/...
python3 waf build -j$(sysctl -n hw.ncpu)
git add . && git commit -m "fix: ..."
git push origin main

# Update engine submodule reference in product repo
cd "/Users/davidyousefi/dev/DAW FLOW"
git add engine
git commit -m "chore: update engine submodule"
```

### Pulling Ardour upstream updates

```bash
cd "/Users/davidyousefi/dev/DAW FLOW/engine"
git remote add upstream https://github.com/Ardour/ardour.git  # if not already
git fetch upstream
git merge upstream/master
git push origin main
```
