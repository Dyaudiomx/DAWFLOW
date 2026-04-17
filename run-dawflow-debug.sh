#!/bin/bash
# Debug launcher — runs DAWFLOW inside lldb. On crash, prints full
# backtrace for all threads then quits.

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

EXECUTABLE=$(ls -t "$ENGINE"/build/gtk2_ardour/dawflow-* 2>/dev/null | head -1)

CMDS=$(mktemp -t dawflow-lldb.XXXX)
cat > "$CMDS" <<'EOF'
# Run the app. Reproduce the crash in the GUI. When it crashes, lldb
# breaks automatically; then these commands print the stack and quit.
run
# Execution resumes here only after a stop (e.g. EXC_BAD_ACCESS).
bt all
quit
EOF

echo "======================================================================"
echo " DAWFLOW under lldb — trigger the crash in the GUI."
echo " When it crashes, the backtrace will print below and lldb will quit."
echo "======================================================================"

exec lldb -s "$CMDS" "$EXECUTABLE"
