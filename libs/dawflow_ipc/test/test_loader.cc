/*
 * DawflowIPC - Plugin Loader Tests
 *
 * Tests plugin manifest parsing, package scanning, process launching, and
 * process termination. Creates temporary .dawflow ZIP packages for testing.
 *
 * Compile:
 *   clang++ -std=c++17 -I libs/dawflow_ipc -I /opt/homebrew/opt/libarchive/include \
 *     -L /opt/homebrew/opt/libarchive/lib -pthread \
 *     libs/dawflow_ipc/message.cc libs/dawflow_ipc/socket_server.cc \
 *     libs/dawflow_ipc/socket_client.cc libs/dawflow_ipc/plugin_manifest.cc \
 *     libs/dawflow_ipc/plugin_loader.cc libs/dawflow_ipc/test/test_loader.cc \
 *     -larchive -o /tmp/test_loader && /tmp/test_loader
 */

#include "dawflow_ipc/plugin_manifest.h"
#include "dawflow_ipc/plugin_loader.h"

#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <fstream>
#include <string>
#include <sys/stat.h>
#include <thread>
#include <unistd.h>

using namespace DawflowIPC;

static int tests_passed = 0;
static int tests_total  = 0;

static void
check (const char* name, bool condition)
{
	tests_total++;
	if (condition) {
		tests_passed++;
		std::printf ("  %s... ok\n", name);
	} else {
		std::printf ("  %s... FAILED\n", name);
	}
}

/* ----- Helpers to create temp directories and files ----- */

static std::string
make_temp_dir (const std::string& prefix)
{
	std::string tmpl = "/tmp/" + prefix + "_XXXXXX";
	char* buf = new char[tmpl.size () + 1];
	std::strcpy (buf, tmpl.c_str ());
	char* result = ::mkdtemp (buf);
	std::string dir;
	if (result) {
		dir = std::string (result);
	}
	delete[] buf;
	return dir;
}

static void
rm_rf (const std::string& path)
{
	/* Use system rm -rf for test cleanup */
	std::string cmd = "rm -rf '" + path + "'";
	::system (cmd.c_str ());
}

static void
create_test_dawflow_package (const std::string& plugin_dir)
{
	/* Create a staging directory for the ZIP contents */
	std::string staging = make_temp_dir ("dawflow_staging");

	/* Write manifest.json */
	std::string manifest_json = R"({
  "id": "com.test.hello",
  "name": "Test Plugin",
  "version": "0.1.0",
  "api_version": "1",
  "author": "Test",
  "description": "Test plugin for loader tests",
  "entry_point": "bin/test-plugin.sh",
  "capabilities": ["session_events", "transport_control"],
  "ui": { "panels": [
    {
      "id": "main-panel",
      "title": "Test Panel",
      "location": "bottom",
      "url": "/ui/index.html"
    }
  ]},
  "actions": [
    { "id": "test.greet", "label": "Say Hello" }
  ]
})";

	{
		std::ofstream f (staging + "/manifest.json");
		f << manifest_json;
	}

	/* Create the bin directory and shell script binary */
	::mkdir ((staging + "/bin").c_str (), 0755);

	{
		std::ofstream f (staging + "/bin/test-plugin.sh");
		f << "#!/bin/bash\n"
		  << "echo \"PLUGIN_STARTED\"\n"
		  << "sleep 60\n";
	}
	::chmod ((staging + "/bin/test-plugin.sh").c_str (), 0755);

	/* Create the .dawflow ZIP file using the zip command */
	std::string zip_path = plugin_dir + "/com.test.hello.dawflow";
	std::string cmd = "cd '" + staging + "' && zip -r '" + zip_path + "' manifest.json bin/ 2>/dev/null";
	int ret = ::system (cmd.c_str ());
	if (ret != 0) {
		std::fprintf (stderr, "WARNING: zip command failed (ret=%d). Tests may fail.\n", ret);
	}

	rm_rf (staging);
}

/* ----- Tests ----- */

int
main ()
{
	std::printf ("Running DawflowIPC plugin loader tests...\n\n");

	/* Create temp directories */
	std::string plugin_dir = make_temp_dir ("dawflow_plugins");
	std::string cache_dir  = make_temp_dir ("dawflow_cache");

	if (plugin_dir.empty () || cache_dir.empty ()) {
		std::fprintf (stderr, "Failed to create temp directories\n");
		return 1;
	}

	/* ---- Test 1: Manifest parsing from JSON string ---- */
	{
		std::string json_str = R"({
      "id": "com.example.synth",
      "name": "Example Synth",
      "version": "2.0.0",
      "api_version": "1",
      "author": "Test Author",
      "description": "A test synthesizer plugin",
      "entry_point": "bin/{platform}/synth",
      "capabilities": ["audio_io", "midi_io"],
      "ui": { "panels": [
        { "id": "editor", "title": "Synth Editor", "location": "floating", "url": "/ui/editor.html" }
      ]},
      "actions": [
        { "id": "synth.randomize", "label": "Randomize Patch" }
      ]
    })";

		PluginManifest m = PluginManifest::from_json (json_str);
		check ("manifest_parse_id", m.id == "com.example.synth");
		check ("manifest_parse_name", m.name == "Example Synth");
		check ("manifest_parse_version", m.version == "2.0.0");
		check ("manifest_parse_author", m.author == "Test Author");
		check ("manifest_parse_entry_point", m.entry_point == "bin/{platform}/synth");
		check ("manifest_parse_capabilities", m.capabilities.size () == 2);
		check ("manifest_parse_panels", m.panels.size () == 1);
		check ("manifest_parse_panel_id", m.panels[0].id == "editor");
		check ("manifest_parse_panel_location", m.panels[0].location == "floating");
		check ("manifest_parse_actions", m.actions.size () == 1);
		check ("manifest_parse_action_id", m.actions[0].id == "synth.randomize");
		check ("manifest_parse_action_label", m.actions[0].label == "Randomize Patch");
	}

	/* ---- Test 2: Platform resolution ---- */
	{
		PluginManifest m;
		m.entry_point = "bin/{platform}/plugin";
		std::string resolved = m.resolved_entry_point ();

#if defined(__APPLE__) && defined(__aarch64__)
		check ("resolved_entry_point", resolved == "bin/macos-arm64/plugin");
#elif defined(__APPLE__) && defined(__x86_64__)
		check ("resolved_entry_point", resolved == "bin/macos-x86_64/plugin");
#elif defined(__linux__) && defined(__x86_64__)
		check ("resolved_entry_point", resolved == "bin/linux-x86_64/plugin");
#else
		check ("resolved_entry_point", !resolved.empty ());
#endif
	}

	/* ---- Test 3: has_capability ---- */
	{
		PluginManifest m;
		m.capabilities = {"session_events", "transport_control", "audio_io"};

		check ("has_capability_true", m.has_capability ("session_events"));
		check ("has_capability_true_2", m.has_capability ("audio_io"));
		check ("has_capability_false", !m.has_capability ("nonexistent"));
		check ("has_capability_empty", !m.has_capability (""));
	}

	/* ---- Test 4: Invalid manifest parsing ---- */
	{
		bool threw = false;
		try {
			PluginManifest::from_json ("not valid json");
		} catch (const std::exception&) {
			threw = true;
		}
		check ("invalid_json_throws", threw);

		threw = false;
		try {
			PluginManifest::from_json (R"({"name": "test"})"); /* missing id */
		} catch (const std::exception&) {
			threw = true;
		}
		check ("missing_id_throws", threw);
	}

	/* ---- Test 5: Create .dawflow package and scan ---- */
	create_test_dawflow_package (plugin_dir);

	PluginLoader loader;
	loader.set_plugin_dir (plugin_dir);
	loader.set_cache_dir (cache_dir);
	loader.scan ();

	auto manifests = loader.get_manifests ();
	check ("scan_found_plugin", manifests.size () == 1);

	if (!manifests.empty ()) {
		check ("scan_manifest_id", manifests[0].id == "com.test.hello");
		check ("scan_manifest_name", manifests[0].name == "Test Plugin");
		check ("scan_manifest_version", manifests[0].version == "0.1.0");
		check ("scan_manifest_capabilities", manifests[0].capabilities.size () == 2);
		check ("scan_has_capability", manifests[0].has_capability ("session_events"));
		check ("scan_no_capability", !manifests[0].has_capability ("nonexistent"));
		check ("scan_panel_count", manifests[0].panels.size () == 1);
		check ("scan_action_count", manifests[0].actions.size () == 1);
	}

	/* ---- Test 6: Get plugin info ---- */
	{
		const LoadedPlugin* p = loader.get_plugin ("com.test.hello");
		check ("get_plugin_found", p != nullptr);
		if (p) {
			check ("get_plugin_not_running", p->pid == 0);
		}

		const LoadedPlugin* p2 = loader.get_plugin ("com.nonexistent.plugin");
		check ("get_plugin_not_found", p2 == nullptr);
	}

	/* ---- Test 7: Launch plugin process ---- */
	{
		std::string socket_path = "/tmp/dawflow_test_" + std::to_string (::getpid ()) + ".sock";

		bool launched = loader.launch ("com.test.hello", socket_path);
		check ("launch_success", launched);

		/* Give the process a moment to start */
		std::this_thread::sleep_for (std::chrono::milliseconds (200));

		check ("is_running_after_launch", loader.is_running ("com.test.hello"));

		const LoadedPlugin* p = loader.get_plugin ("com.test.hello");
		if (p) {
			check ("pid_nonzero", p->pid > 0);
			check ("ui_port_assigned", p->ui_port >= 19100);
			check ("extracted_path_set", !p->extracted_path.empty ());
		}
	}

	/* ---- Test 8: Stop plugin process ---- */
	{
		loader.stop ("com.test.hello");

		/* Give a moment for cleanup */
		std::this_thread::sleep_for (std::chrono::milliseconds (100));

		check ("is_running_after_stop", !loader.is_running ("com.test.hello"));

		const LoadedPlugin* p = loader.get_plugin ("com.test.hello");
		if (p) {
			check ("pid_zero_after_stop", p->pid == 0);
		}
	}

	/* ---- Test 9: Launch non-existent plugin ---- */
	{
		bool launched = loader.launch ("com.nonexistent.plugin", "/tmp/fake.sock");
		check ("launch_nonexistent_fails", !launched);
	}

	/* ---- Test 10: Re-launch after stop ---- */
	{
		std::string socket_path = "/tmp/dawflow_test_relaunch_" + std::to_string (::getpid ()) + ".sock";

		bool relaunched = loader.launch ("com.test.hello", socket_path);
		check ("relaunch_success", relaunched);

		std::this_thread::sleep_for (std::chrono::milliseconds (200));
		check ("is_running_after_relaunch", loader.is_running ("com.test.hello"));

		/* Stop via stop_all */
		loader.stop_all ();
		std::this_thread::sleep_for (std::chrono::milliseconds (100));
		check ("stop_all_works", !loader.is_running ("com.test.hello"));
	}

	/* ---- Cleanup ---- */
	rm_rf (plugin_dir);
	rm_rf (cache_dir);

	std::printf ("\n");
	if (tests_passed == tests_total) {
		std::printf ("All plugin loader tests passed! (%d/%d)\n", tests_passed, tests_total);
		return 0;
	} else {
		std::printf ("Some tests FAILED! (%d/%d passed)\n", tests_passed, tests_total);
		return 1;
	}
}
