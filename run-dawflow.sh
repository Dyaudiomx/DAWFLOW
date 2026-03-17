#!/bin/bash
# DAWFLOW Launch Script

TOP="/Users/davidyousefi/dev/DAW FLOW"
libs="$TOP/build/libs"

export GTK2_RC_FILES=/nonexistent
export ARDOUR_SURFACES_PATH="$libs/surfaces/osc:$libs/surfaces/faderport8:$libs/surfaces/faderport:$libs/surfaces/generic_midi:$libs/surfaces/tranzport:$libs/surfaces/powermate:$libs/surfaces/mackie:$libs/surfaces/us2400:$libs/surfaces/wiimote:$libs/surfaces/push2:$libs/surfaces/maschine2:$libs/surfaces/cc121:$libs/surfaces/launch_control_xl:$libs/surfaces/contourdesign:$libs/surfaces/websockets:$libs/surfaces/console1:$libs/surfaces/launchpad_pro:$libs/surfaces/launchpad_x:$libs/surfaces/launchkey_4"
export ARDOUR_PANNER_PATH="$libs/panners"
export ARDOUR_DATA_PATH="$TOP/share:$TOP/build:$TOP/gtk2_ardour:$TOP/build/gtk2_ardour"
export ARDOUR_MIDIMAPS_PATH="$TOP/share/midi_maps"
export ARDOUR_MIDI_PATCH_PATH="$TOP/share/patchfiles"
export ARDOUR_EXPORT_FORMATS_PATH="$TOP/share/export"
export ARDOUR_THEMES_PATH="$TOP/gtk2_ardour/themes"
export ARDOUR_BACKEND_PATH="$libs/backends/jack:$libs/backends/dummy:$libs/backends/alsa:$libs/backends/coreaudio:$libs/backends/portaudio:$libs/backends/pulseaudio"
export ARDOUR_TEST_PATH="$TOP/libs/ardour/test/data"
export PBD_TEST_PATH="$TOP/libs/pbd/test"
export EVORAL_TEST_PATH="$TOP/libs/evoral/test/testdata"
export MIDIPP_TEST_PATH="$TOP/share/patchfiles"
export ARDOUR_INSTANT_XML_PATH="$TOP/build/gtk2_ardour"
export ARDOUR_CONFIG_PATH="$TOP:$TOP/gtk2_ardour:$TOP/build:$TOP/build/gtk2_ardour"
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
EXECUTABLE=$(ls -t "$TOP"/build/gtk2_ardour/ardour-* 2>/dev/null | head -1)
if [ -z "$EXECUTABLE" ]; then
    echo "Error: No ardour executable found in build directory"
    exit 1
fi

echo "Starting DAWFLOW ($EXECUTABLE)..."
exec "$EXECUTABLE" "$@"
