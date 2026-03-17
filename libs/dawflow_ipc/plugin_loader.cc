/*
 * DawflowIPC - Plugin Package Loader Implementation
 *
 * Scans for .dawflow packages (ZIP archives), reads manifests via libarchive,
 * extracts packages to a cache directory, and manages plugin process lifecycles.
 */

#include "dawflow_ipc/plugin_loader.h"

#include <archive.h>
#include <archive_entry.h>

#include <cerrno>
#include <chrono>
#include <cstdio>
#include <cstring>
#include <dirent.h>
#include <signal.h>
#include <stdexcept>
#include <sys/stat.h>
#include <sys/wait.h>
#include <thread>
#include <unistd.h>

namespace DawflowIPC {

/* ----- Helpers ----- */

static bool
ends_with (const std::string& str, const std::string& suffix)
{
	if (suffix.size () > str.size ()) {
		return false;
	}
	return str.compare (str.size () - suffix.size (), suffix.size (), suffix) == 0;
}

static bool
mkdir_p (const std::string& path)
{
	struct stat st;
	if (::stat (path.c_str (), &st) == 0) {
		return S_ISDIR (st.st_mode);
	}

	/* Find parent */
	size_t pos = path.find_last_of ('/');
	if (pos != std::string::npos && pos > 0) {
		std::string parent = path.substr (0, pos);
		if (!mkdir_p (parent)) {
			return false;
		}
	}

	return ::mkdir (path.c_str (), 0755) == 0;
}

/* ----- PluginLoader ----- */

PluginLoader::PluginLoader ()
	: _next_ui_port (19100)
{
}

PluginLoader::~PluginLoader ()
{
	stop_all ();
}

void
PluginLoader::set_plugin_dir (const std::string& dir)
{
	_plugin_dir = dir;
}

void
PluginLoader::set_cache_dir (const std::string& dir)
{
	_cache_dir = dir;
}

std::string
PluginLoader::_read_manifest_from_zip (const std::string& zip_path)
{
	struct archive* a = archive_read_new ();
	if (!a) {
		throw std::runtime_error ("Failed to create archive reader");
	}

	archive_read_support_format_zip (a);
	archive_read_support_filter_all (a);

	int r = archive_read_open_filename (a, zip_path.c_str (), 10240);
	if (r != ARCHIVE_OK) {
		std::string err = "Failed to open archive: " + std::string (archive_error_string (a));
		archive_read_free (a);
		throw std::runtime_error (err);
	}

	std::string manifest_content;
	struct archive_entry* entry;
	bool found = false;

	while (archive_read_next_header (a, &entry) == ARCHIVE_OK) {
		std::string pathname (archive_entry_pathname (entry));

		if (pathname == "manifest.json") {
			/* Read the entry contents */
			la_int64_t size = archive_entry_size (entry);
			if (size > 0) {
				manifest_content.resize (static_cast<size_t> (size));
				la_ssize_t bytes_read = archive_read_data (a, &manifest_content[0], static_cast<size_t> (size));
				if (bytes_read < 0) {
					archive_read_free (a);
					throw std::runtime_error ("Failed to read manifest.json from archive");
				}
				manifest_content.resize (static_cast<size_t> (bytes_read));
			} else {
				/* Size unknown, read in chunks */
				manifest_content.clear ();
				char buf[4096];
				la_ssize_t bytes_read;
				while ((bytes_read = archive_read_data (a, buf, sizeof (buf))) > 0) {
					manifest_content.append (buf, static_cast<size_t> (bytes_read));
				}
			}
			found = true;
			break;
		}

		archive_read_data_skip (a);
	}

	archive_read_free (a);

	if (!found) {
		throw std::runtime_error ("manifest.json not found in: " + zip_path);
	}

	return manifest_content;
}

void
PluginLoader::scan ()
{
	if (_plugin_dir.empty ()) {
		return;
	}

	DIR* dir = ::opendir (_plugin_dir.c_str ());
	if (!dir) {
		return;
	}

	struct dirent* entry;
	while ((entry = ::readdir (dir)) != nullptr) {
		std::string name (entry->d_name);
		if (!ends_with (name, ".dawflow")) {
			continue;
		}

		std::string full_path = _plugin_dir + "/" + name;

		try {
			std::string manifest_json = _read_manifest_from_zip (full_path);
			PluginManifest manifest = PluginManifest::from_json (manifest_json);

			LoadedPlugin lp;
			lp.manifest      = manifest;
			lp.package_path  = full_path;
			lp.extracted_path.clear ();
			lp.pid           = 0;
			lp.ui_port       = 0;

			_plugins[manifest.id] = lp;

		} catch (const std::exception& e) {
			std::fprintf (stderr, "DawflowIPC: skipping %s: %s\n", full_path.c_str (), e.what ());
		}
	}

	::closedir (dir);
}

std::vector<PluginManifest>
PluginLoader::get_manifests () const
{
	std::vector<PluginManifest> result;
	result.reserve (_plugins.size ());
	for (const auto& kv : _plugins) {
		result.push_back (kv.second.manifest);
	}
	return result;
}

std::string
PluginLoader::_extract_package (const std::string& dawflow_path, const std::string& plugin_id)
{
	std::string extract_dir = _cache_dir + "/" + plugin_id;

	if (!mkdir_p (extract_dir)) {
		throw std::runtime_error ("Failed to create extraction directory: " + extract_dir);
	}

	struct archive* a = archive_read_new ();
	struct archive* ext = archive_write_disk_new ();

	archive_read_support_format_zip (a);
	archive_read_support_filter_all (a);

	archive_write_disk_set_options (ext,
		ARCHIVE_EXTRACT_TIME |
		ARCHIVE_EXTRACT_PERM |
		ARCHIVE_EXTRACT_ACL |
		ARCHIVE_EXTRACT_FFLAGS);

	int r = archive_read_open_filename (a, dawflow_path.c_str (), 10240);
	if (r != ARCHIVE_OK) {
		std::string err = "Failed to open archive for extraction: " + std::string (archive_error_string (a));
		archive_read_free (a);
		archive_write_free (ext);
		throw std::runtime_error (err);
	}

	struct archive_entry* entry;
	while (archive_read_next_header (a, &entry) == ARCHIVE_OK) {
		/* Rewrite the path to be under extract_dir */
		std::string original_path (archive_entry_pathname (entry));
		std::string full_path = extract_dir + "/" + original_path;
		archive_entry_set_pathname (entry, full_path.c_str ());

		r = archive_write_header (ext, entry);
		if (r != ARCHIVE_OK) {
			std::fprintf (stderr, "DawflowIPC: extract header error: %s\n", archive_error_string (ext));
			continue;
		}

		if (archive_entry_size (entry) > 0) {
			const void* buff;
			size_t size;
			la_int64_t offset;

			while (archive_read_data_block (a, &buff, &size, &offset) == ARCHIVE_OK) {
				archive_write_data_block (ext, buff, size, offset);
			}
		}

		archive_write_finish_entry (ext);
	}

	archive_read_free (a);
	archive_write_free (ext);

	return extract_dir;
}

bool
PluginLoader::launch (const std::string& plugin_id, const std::string& socket_path)
{
	auto it = _plugins.find (plugin_id);
	if (it == _plugins.end ()) {
		return false;
	}

	LoadedPlugin& lp = it->second;

	/* Already running */
	if (lp.pid > 0) {
		return true;
	}

	/* Extract if not already done */
	if (lp.extracted_path.empty ()) {
		try {
			lp.extracted_path = _extract_package (lp.package_path, plugin_id);
		} catch (const std::exception& e) {
			std::fprintf (stderr, "DawflowIPC: extraction failed for %s: %s\n",
			              plugin_id.c_str (), e.what ());
			return false;
		}
	}

	/* Resolve entry point */
	std::string entry = lp.manifest.resolved_entry_point ();
	std::string binary_path = lp.extracted_path + "/" + entry;

	/* Make binary executable */
	::chmod (binary_path.c_str (), 0755);

	/* Assign UI port */
	lp.ui_port = _next_ui_port++;

	std::string port_str = std::to_string (lp.ui_port);

	pid_t pid = ::fork ();

	if (pid < 0) {
		std::fprintf (stderr, "DawflowIPC: fork failed for %s: %s\n",
		              plugin_id.c_str (), std::strerror (errno));
		return false;
	}

	if (pid == 0) {
		/* Child process */
		::execl (binary_path.c_str (), binary_path.c_str (),
		         socket_path.c_str (), port_str.c_str (), nullptr);

		/* exec failed */
		std::fprintf (stderr, "DawflowIPC: execl failed for %s: %s\n",
		              binary_path.c_str (), std::strerror (errno));
		::_exit (127);
	}

	/* Parent process */
	lp.pid = pid;
	return true;
}

void
PluginLoader::stop (const std::string& plugin_id)
{
	auto it = _plugins.find (plugin_id);
	if (it == _plugins.end ()) {
		return;
	}

	LoadedPlugin& lp = it->second;
	if (lp.pid <= 0) {
		return;
	}

	/* Send SIGTERM first */
	::kill (lp.pid, SIGTERM);

	/* Wait up to 2 seconds for graceful shutdown */
	for (int i = 0; i < 20; ++i) {
		int status;
		pid_t result = ::waitpid (lp.pid, &status, WNOHANG);

		if (result > 0) {
			/* Process exited */
			lp.pid = 0;
			return;
		}
		if (result < 0) {
			/* Error (e.g., no such process) */
			lp.pid = 0;
			return;
		}

		std::this_thread::sleep_for (std::chrono::milliseconds (100));
	}

	/* Still running after 2 seconds — force kill */
	::kill (lp.pid, SIGKILL);
	int status;
	::waitpid (lp.pid, &status, 0);
	lp.pid = 0;
}

void
PluginLoader::stop_all ()
{
	for (auto& kv : _plugins) {
		if (kv.second.pid > 0) {
			stop (kv.first);
		}
	}
}

bool
PluginLoader::is_running (const std::string& plugin_id) const
{
	auto it = _plugins.find (plugin_id);
	if (it == _plugins.end ()) {
		return false;
	}

	if (it->second.pid <= 0) {
		return false;
	}

	/* Check if process is still alive */
	int status;
	pid_t result = ::waitpid (it->second.pid, &status, WNOHANG);

	if (result == 0) {
		/* Still running */
		return true;
	}

	/* Process exited or error — update state.
	 * We need to cast away const here since this is a status check
	 * that lazily reaps zombie processes. */
	const_cast<LoadedPlugin&> (it->second).pid = 0;
	return false;
}

const LoadedPlugin*
PluginLoader::get_plugin (const std::string& plugin_id) const
{
	auto it = _plugins.find (plugin_id);
	if (it == _plugins.end ()) {
		return nullptr;
	}
	return &it->second;
}

} /* namespace DawflowIPC */
