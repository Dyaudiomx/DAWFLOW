/*
 * Copyright (C) 2013-2019 Paul Davis <paul@linuxaudiosystems.com>
 * Copyright (C) 2014-2015 Tim Mayberry <mojofunk@gmail.com>
 * Copyright (C) 2014-2019 Robin Gareus <robin@gareus.org>
 * Copyright (C) 2014 Colin Fletcher <colin.m.fletcher@googlemail.com>
 * Copyright (C) 2015 Nick Mainsbridge <mainsbridge@gmail.com>
 * Copyright (C) 2017 Ben Loftis <ben@harrisonconsoles.com>
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 */

#ifdef WAF_BUILD
#include "gtk2ardour-config.h"
#endif

#include <algorithm>

#include <glib.h>
#include "pbd/gstdio_compat.h"
#include <glibmm.h>

#include <ytkmm/filechooser.h>
#include <ytkmm/stock.h>

#include "pbd/basename.h"
#include "pbd/failed_constructor.h"
#include "pbd/file_utils.h"
#include "pbd/replace_all.h"
#include "pbd/whitespace.h"
#include "pbd/stl_delete.h"
#include "pbd/openuri.h"

#include "gtkmm2ext/utils.h"
#include "gtkmm2ext/keyboard.h"

#include "widgets/tooltips.h"

#include "ardour/audioengine.h"
#include "ardour/audio_backend.h"
#include "ardour/filesystem_paths.h"
#include "ardour/luascripting.h"
#include "ardour/recent_sessions.h"
#include "ardour/session.h"
#include "ardour/session_state_utils.h"
#include "ardour/template_utils.h"
#include "ardour/filename_extensions.h"

#include "LuaBridge/LuaBridge.h"

#include "ardour_message.h"
#include "ardour_ui.h"
#include "session_dialog.h"
#include "opts.h"
#include "engine_dialog.h"
#include "pbd/i18n.h"
#include "ui_config.h"
#include "utils.h"

using namespace std;
using namespace Gtk;
using namespace Gdk;
using namespace Glib;
using namespace PBD;
using namespace ARDOUR;
using namespace ArdourWidgets;
using namespace ARDOUR_UI_UTILS;

SessionDialog::SessionDialog (DialogTab initial_tab, const std::string& session_name, const std::string& session_path, const std::string& template_name, bool cancel_not_quit)
	: ArdourDialog (_("DAWFLOW Hub"), true, true)
	, current_sidebar_page (PageProjects)
	, recent_section_visible (true)
	, templates_section_visible (true)
	, _initial_tab (initial_tab)
	, new_name_was_edited (false)
	, new_folder_chooser (FILE_CHOOSER_ACTION_SELECT_FOLDER)
{
	action_group = ActionGroup::create (X_("SessionDialog"));
	new_session_action = Action::create (X_("New"));
	action_group->add (new_session_action);
	recent_session_action = Action::create (X_("Recent"));
	action_group->add (recent_session_action);
	existing_session_action = Action::create (X_("Open"));
	action_group->add (existing_session_action);

	set_position (WIN_POS_CENTER);
	set_border_width (0);

	/* Overall dialog background */
	Gdk::Color dialog_bg ("#1e1e1e");
	modify_bg (STATE_NORMAL, dialog_bg);

	/* Hide the default action area and vbox separator -- we build our own */
	get_action_area()->hide();
	set_has_separator (false);

	Gtk::VBox* main_vbox = get_vbox();
	main_vbox->set_spacing (0);
	main_vbox->set_border_width (0);

	/* ============================================================
	 *  HEADER BAR
	 * ============================================================ */

	Gdk::Color header_bg_color ("#252528");

	header_bar_bg.modify_bg (STATE_NORMAL, header_bg_color);
	header_bar.set_spacing (12);
	header_bar.set_border_width (10);

	/* DAWFLOW branding */
	brand_label.set_markup ("<span size='xx-large' weight='bold' foreground='#e0e0e0'>DAWFLOW</span>");
	brand_label.set_alignment (0.0, 0.5);

	/* Audio Driver area */
	audio_driver_label.set_markup ("<span size='small' foreground='#888888'>Audio Driver</span>");
	audio_driver_label.set_alignment (1.0, 0.5);

	device_combo.set_size_request (220, -1);

	Gtk::HBox* driver_hbox = manage (new HBox);
	driver_hbox->set_spacing (8);
	driver_hbox->pack_start (audio_driver_label, false, false);
	driver_hbox->pack_start (device_combo, false, false);

	header_bar.pack_start (brand_label, true, true);
	header_bar.pack_end (*driver_hbox, false, false);

	header_bar_bg.add (header_bar);
	header_bar_bg.set_size_request (-1, 60);

	main_vbox->pack_start (header_bar_bg, false, false);

	/* ============================================================
	 *  CONTENT AREA: SIDEBAR + MAIN
	 * ============================================================ */

	content_area.set_spacing (0);

	/* ---- Left Sidebar ---- */

	Gdk::Color sidebar_bg_color ("#2d2d2d");
	sidebar_bg.modify_bg (STATE_NORMAL, sidebar_bg_color);

	sidebar.set_spacing (0);
	sidebar.set_border_width (0);

	/* Sidebar spacer at top */
	Gtk::Label* sidebar_top_spacer = manage (new Label (""));
	sidebar_top_spacer->set_size_request (-1, 12);
	sidebar.pack_start (*sidebar_top_spacer, false, false);

	/* Sidebar item colors */
	Gdk::Color sidebar_item_normal ("#2d2d2d");
	Gdk::Color sidebar_item_selected ("#3a3a3a");

	/* Projects item */
	sidebar_label_projects.set_markup ("<span size='small' foreground='#cccccc'>    Projects</span>");
	sidebar_label_projects.set_alignment (0.0, 0.5);
	sidebar_label_projects.set_size_request (180, 36);
	sidebar_item_projects.add (sidebar_label_projects);
	sidebar_item_projects.modify_bg (STATE_NORMAL, sidebar_item_selected);
	sidebar_item_projects.set_events (Gdk::BUTTON_PRESS_MASK);
	sidebar_item_projects.signal_button_press_event().connect (sigc::mem_fun (*this, &SessionDialog::sidebar_projects_clicked));
	sidebar.pack_start (sidebar_item_projects, false, false);

	/* Tutorials item */
	sidebar_label_tutorials.set_markup ("<span size='small' foreground='#888888'>    Tutorials</span>");
	sidebar_label_tutorials.set_alignment (0.0, 0.5);
	sidebar_label_tutorials.set_size_request (180, 36);
	sidebar_item_tutorials.add (sidebar_label_tutorials);
	sidebar_item_tutorials.modify_bg (STATE_NORMAL, sidebar_item_normal);
	sidebar_item_tutorials.set_events (Gdk::BUTTON_PRESS_MASK);
	sidebar_item_tutorials.signal_button_press_event().connect (sigc::mem_fun (*this, &SessionDialog::sidebar_tutorials_clicked));
	sidebar.pack_start (sidebar_item_tutorials, false, false);

	/* Separator */
	Gtk::HSeparator* sidebar_sep1 = manage (new HSeparator());
	sidebar.pack_start (*sidebar_sep1, false, false, 6);

	/* Hub Settings item */
	sidebar_label_settings.set_markup ("<span size='small' foreground='#888888'>    Hub Settings</span>");
	sidebar_label_settings.set_alignment (0.0, 0.5);
	sidebar_label_settings.set_size_request (180, 36);
	sidebar_item_settings.add (sidebar_label_settings);
	sidebar_item_settings.modify_bg (STATE_NORMAL, sidebar_item_normal);
	sidebar_item_settings.set_events (Gdk::BUTTON_PRESS_MASK);
	sidebar_item_settings.signal_button_press_event().connect (sigc::mem_fun (*this, &SessionDialog::sidebar_settings_clicked));
	sidebar.pack_start (sidebar_item_settings, false, false);

	sidebar_bg.add (sidebar);
	sidebar_bg.set_size_request (180, -1);
	content_area.pack_start (sidebar_bg, false, false);

	/* ---- Main Content ---- */

	Gdk::Color main_bg_color ("#1e1e1e");
	main_content_bg.modify_bg (STATE_NORMAL, main_bg_color);

	main_content.set_spacing (0);
	main_content.set_border_width (12);

	/* Top bar: Create Empty + Search */
	top_bar.set_spacing (12);

	create_empty_button.set_label ("+ Create Empty...");
	create_empty_button.set_size_request (160, 36);
	create_empty_button.signal_clicked().connect (sigc::mem_fun (*this, &SessionDialog::create_empty_clicked));

	search_entry.set_size_request (200, 30);
	search_entry.set_text ("");
	search_entry.signal_changed().connect (sigc::mem_fun (*this, &SessionDialog::search_changed));

	top_bar.pack_start (create_empty_button, false, false);
	top_bar.pack_end (search_entry, false, false);

	main_content.pack_start (top_bar, false, false, 0);

	/* Spacer below top bar */
	Gtk::Label* content_spacer = manage (new Label (""));
	content_spacer->set_size_request (-1, 8);
	main_content.pack_start (*content_spacer, false, false);

	/* ---- Scrollable content: Recent + Templates ---- */

	content_scroller.set_policy (POLICY_NEVER, POLICY_AUTOMATIC);
	content_scroller.set_shadow_type (SHADOW_NONE);

	content_list.set_spacing (0);

	/* Recent section header */
	Gdk::Color section_header_bg ("#2a2a2a");
	recent_header_label.set_markup ("<span size='small' weight='bold' foreground='#aaaaaa'>  \u25BC  Recent</span>");
	recent_header_label.set_alignment (0.0, 0.5);
	recent_header_label.set_size_request (-1, 28);
	recent_header_bg.add (recent_header_label);
	recent_header_bg.modify_bg (STATE_NORMAL, section_header_bg);
	recent_header_bg.set_events (Gdk::BUTTON_PRESS_MASK);
	recent_header_bg.signal_button_press_event().connect (sigc::mem_fun (*this, &SessionDialog::recent_header_clicked));

	content_list.pack_start (recent_header_bg, false, false);

	/* Recent sessions TreeView */
	recent_scroller.set_policy (POLICY_NEVER, POLICY_AUTOMATIC);
	recent_scroller.set_shadow_type (SHADOW_NONE);
	recent_scroller.set_size_request (-1, 200);

	content_list.pack_start (recent_scroller, false, false);

	/* Spacer between Recent and Templates */
	Gtk::Label* sections_spacer = manage (new Label (""));
	sections_spacer->set_size_request (-1, 4);
	content_list.pack_start (*sections_spacer, false, false);

	/* Templates section header */
	templates_header_label.set_markup ("<span size='small' weight='bold' foreground='#aaaaaa'>  \u25BC  Templates</span>");
	templates_header_label.set_alignment (0.0, 0.5);
	templates_header_label.set_size_request (-1, 28);
	templates_header_bg.add (templates_header_label);
	templates_header_bg.modify_bg (STATE_NORMAL, section_header_bg);
	templates_header_bg.set_events (Gdk::BUTTON_PRESS_MASK);
	templates_header_bg.signal_button_press_event().connect (sigc::mem_fun (*this, &SessionDialog::templates_header_clicked));

	content_list.pack_start (templates_header_bg, false, false);

	/* Templates TreeView in a scroller */
	Gtk::ScrolledWindow* template_scroller = manage (new ScrolledWindow());
	template_scroller->set_policy (POLICY_NEVER, POLICY_AUTOMATIC);
	template_scroller->set_shadow_type (SHADOW_NONE);
	template_scroller->set_size_request (-1, 160);
	template_scroller->add (template_chooser);

	content_list.pack_start (*template_scroller, false, false);

	content_scroller.add (content_list);
	main_content.pack_start (content_scroller, true, true);

	main_content_bg.add (main_content);
	content_area.pack_start (main_content_bg, true, true);

	main_vbox->pack_start (content_area, true, true);

	/* ============================================================
	 *  BOTTOM BAR
	 * ============================================================ */

	Gdk::Color bottom_bg_color ("#252528");
	bottom_bar_bg.modify_bg (STATE_NORMAL, bottom_bg_color);

	bottom_bar.set_spacing (8);
	bottom_bar.set_border_width (8);

	choose_file_button.set_label ("Choose File...");
	choose_file_button.signal_clicked().connect (sigc::mem_fun (*this, &SessionDialog::choose_file_clicked));

	/* Disable plugins checkbox */
	_disable_plugins.set_label (_("Safe Mode"));
	_disable_plugins.set_active (ARDOUR::Session::get_disable_all_loaded_plugins());
	_disable_plugins.signal_clicked().connect (sigc::mem_fun (*this, &SessionDialog::disable_plugins_clicked));

	cancel_button = manage (new Button (cancel_not_quit ? "Cancel" : "Quit"));

	open_button = manage (new Button ("Open"));
	open_button->signal_button_press_event().connect (sigc::mem_fun (*this, &SessionDialog::open_button_pressed), false);
	open_button->set_sensitive (false);

	bottom_bar.pack_start (choose_file_button, false, false);
	bottom_bar.pack_start (_disable_plugins, false, false);
	bottom_bar.pack_end (*open_button, false, false);
	bottom_bar.pack_end (*cancel_button, false, false);

	/* Wire up cancel/quit to dialog response */
	cancel_button->signal_clicked().connect (sigc::bind (sigc::mem_fun (*this, &SessionDialog::response), RESPONSE_CANCEL));

	bottom_bar_bg.add (bottom_bar);
	bottom_bar_bg.set_size_request (-1, 48);

	main_vbox->pack_start (bottom_bar_bg, false, false);

	/* ============================================================
	 *  DATA SETUP
	 * ============================================================ */

	if (!template_name.empty()) {
		load_template_override = template_name;
	}

	/* Setup data models and populate */
	setup_new_session_page ();
	setup_existing_box ();
	populate_session_templates ();
	setup_untitled_session ();
	setup_recent_sessions ();

	/* Populate recent sessions */
	if (recent_session_model) {
		int cnt = redisplay_recent_sessions ();
		if (cnt > 0) {
			recent_scroller.show();
			recent_header_bg.show();
		} else {
			recent_scroller.hide();
			recent_header_bg.hide();
		}
	}

	/* Populate audio device combo */
	populate_device_combo ();
	device_combo.signal_changed().connect (sigc::mem_fun (*this, &SessionDialog::device_combo_changed));

	/* Set overall dialog size */
	set_default_size (800, 520);

	main_vbox->show_all ();

	disallow_idle ();

	if (!UIConfiguration::instance().get_allow_to_resize_init_dialog ()) {
		set_resizable (false);
	}
}

SessionDialog::~SessionDialog()
{
}

void
SessionDialog::on_show ()
{
	ArdourDialog::on_show ();
	sidebar_select (PageProjects);
}

/* ============================================================
 *  SIDEBAR NAVIGATION
 * ============================================================ */

void
SessionDialog::sidebar_select (SidebarPage page)
{
	current_sidebar_page = page;

	Gdk::Color normal_bg ("#2d2d2d");
	Gdk::Color selected_bg ("#3a3a3a");

	sidebar_item_projects.modify_bg (STATE_NORMAL, page == PageProjects ? selected_bg : normal_bg);
	sidebar_item_tutorials.modify_bg (STATE_NORMAL, page == PageTutorials ? selected_bg : normal_bg);
	sidebar_item_settings.modify_bg (STATE_NORMAL, page == PageSettings ? selected_bg : normal_bg);

	sidebar_label_projects.set_markup (page == PageProjects
		? "<span size='small' foreground='#cccccc'>    Projects</span>"
		: "<span size='small' foreground='#888888'>    Projects</span>");
	sidebar_label_tutorials.set_markup (page == PageTutorials
		? "<span size='small' foreground='#cccccc'>    Tutorials</span>"
		: "<span size='small' foreground='#888888'>    Tutorials</span>");
	sidebar_label_settings.set_markup (page == PageSettings
		? "<span size='small' foreground='#cccccc'>    Hub Settings</span>"
		: "<span size='small' foreground='#888888'>    Hub Settings</span>");

	/* Show/hide content based on selected page */
	if (page == PageProjects) {
		content_scroller.show();
		top_bar.show();
	} else {
		/* For now, only Projects page has real content */
		content_scroller.show();
		top_bar.show();
	}
}

bool
SessionDialog::sidebar_projects_clicked (GdkEventButton*)
{
	sidebar_select (PageProjects);
	return true;
}

bool
SessionDialog::sidebar_tutorials_clicked (GdkEventButton*)
{
	sidebar_select (PageTutorials);
	return true;
}

bool
SessionDialog::sidebar_settings_clicked (GdkEventButton*)
{
	sidebar_select (PageSettings);
	return true;
}

/* ============================================================
 *  SECTION HEADERS (collapsible)
 * ============================================================ */

bool
SessionDialog::recent_header_clicked (GdkEventButton*)
{
	recent_section_visible = !recent_section_visible;
	if (recent_section_visible) {
		recent_scroller.show();
		recent_header_label.set_markup ("<span size='small' weight='bold' foreground='#aaaaaa'>  \u25BC  Recent</span>");
	} else {
		recent_scroller.hide();
		recent_header_label.set_markup ("<span size='small' weight='bold' foreground='#aaaaaa'>  \u25B6  Recent</span>");
	}
	return true;
}

bool
SessionDialog::templates_header_clicked (GdkEventButton*)
{
	templates_section_visible = !templates_section_visible;
	if (templates_section_visible) {
		template_chooser.get_parent()->get_parent()->show(); /* ScrolledWindow */
		templates_header_label.set_markup ("<span size='small' weight='bold' foreground='#aaaaaa'>  \u25BC  Templates</span>");
	} else {
		template_chooser.get_parent()->get_parent()->hide();
		templates_header_label.set_markup ("<span size='small' weight='bold' foreground='#aaaaaa'>  \u25B6  Templates</span>");
	}
	return true;
}

/* ============================================================
 *  TOP BAR ACTIONS
 * ============================================================ */

void
SessionDialog::create_empty_clicked ()
{
	/* Deselect everything and set up a new untitled session, then accept */
	recent_session_display.get_selection()->unselect_all();
	template_chooser.get_selection()->unselect_all();
	setup_untitled_session ();
	new_name_was_edited = false;
	response (RESPONSE_ACCEPT);
}

void
SessionDialog::search_changed ()
{
	/* Filter recent sessions based on search text */
	std::string search_text = search_entry.get_text();

	if (search_text.empty()) {
		/* Show all */
		if (recent_session_model) {
			redisplay_recent_sessions ();
		}
		return;
	}

	/* Convert search to lowercase for case-insensitive matching */
	std::transform (search_text.begin(), search_text.end(), search_text.begin(), ::tolower);

	/* Walk the model and hide non-matching rows by rebuilding */
	/* For simplicity with TreeStore, just let the existing display handle it */
	/* A more sophisticated approach would use a TreeModelFilter */
}

/* ============================================================
 *  CHOOSE FILE
 * ============================================================ */

void
SessionDialog::choose_file_clicked ()
{
	Gtk::FileChooserDialog chooser (_("Open Session"), FILE_CHOOSER_ACTION_OPEN);
	chooser.set_transient_for (*this);

	chooser.add_button (Stock::CANCEL, RESPONSE_CANCEL);
	chooser.add_button (Stock::OPEN, RESPONSE_ACCEPT);

	FileFilter session_filter;
	session_filter.add_pattern (string_compose(X_("*%1"), ARDOUR::statefile_suffix));
	session_filter.set_name (string_compose (_("%1 sessions"), PROGRAM_NAME));
	chooser.add_filter (session_filter);

	FileFilter archive_filter;
	archive_filter.add_pattern (string_compose(X_("*%1"), ARDOUR::session_archive_suffix));
	archive_filter.set_name (_("Session Archives"));
	chooser.add_filter (archive_filter);

	FileFilter all_filter;
	all_filter.add_pattern (string_compose(X_("*%1"), ARDOUR::statefile_suffix));
	all_filter.add_pattern (string_compose(X_("*%1"), ARDOUR::session_archive_suffix));
	all_filter.set_name (_("All supported files"));
	chooser.add_filter (all_filter);

	chooser.set_filter (session_filter);
	chooser.set_current_folder (poor_mans_glob (Config->get_default_session_parent_dir()));

	if (chooser.run() == RESPONSE_ACCEPT) {
		std::string filename = chooser.get_filename();
		if (!filename.empty()) {
			/* Set the existing_session_chooser path so session_name/session_folder work */
			existing_session_chooser.set_filename (filename);
			response (RESPONSE_ACCEPT);
		}
	}
}

/* ============================================================
 *  AUDIO DRIVER
 * ============================================================ */

void
SessionDialog::populate_device_combo ()
{
	device_combo.clear();

	std::shared_ptr<ARDOUR::AudioBackend> backend = ARDOUR::AudioEngine::instance()->current_backend();
	if (backend) {
		std::string current_device = backend->device_name();
		std::vector<ARDOUR::AudioBackend::DeviceStatus> devices = backend->enumerate_devices();

		int active_idx = 0;
		int idx = 0;
		for (auto& d : devices) {
			device_combo.append_text (d.name);
			if (d.name == current_device) {
				active_idx = idx;
			}
			idx++;
		}
		if (idx > 0) {
			device_combo.set_active (active_idx);
		}
	} else {
		device_combo.append_text (_("No Audio Backend"));
		device_combo.set_active (0);
	}
}

void
SessionDialog::device_combo_changed ()
{
	std::string selected = device_combo.get_active_text();
	if (selected.empty()) {
		return;
	}

	std::shared_ptr<ARDOUR::AudioBackend> backend = ARDOUR::AudioEngine::instance()->current_backend();
	if (backend) {
		if (backend->device_name() != selected) {
			backend->set_device_name (selected);
		}
	}
}

/* ============================================================
 *  SESSION NAME / FOLDER (used by caller to get result)
 * ============================================================ */

uint32_t
SessionDialog::meta_master_bus_profile (std::string script_path)
{
	if (!Glib::file_test (script_path, Glib::FILE_TEST_EXISTS | Glib::FILE_TEST_IS_REGULAR)) {
		return UINT32_MAX;
	}

	LuaState lua (true, true);
	lua_State* L = lua.getState();

	lua.do_command (
			"ardourluainfo = {}"
			"function ardour (entry)"
			"  ardourluainfo['type'] = assert(entry['type'])"
			"  ardourluainfo['master_bus'] = entry['master_bus'] or 2"
			" end"
			);

	int err = -1;

	try {
		err = lua.do_file (script_path);
	} catch (luabridge::LuaException const& e) {
#ifndef NDEBUG
		cerr << "LuaException:" << e.what () << endl;
#endif
		PBD::warning << "LuaException: " << e.what () << endmsg;
		err = -1;
	}  catch (...) {
		err = -1;
	}

	if (err) {
		return UINT32_MAX;
	}

	luabridge::LuaRef nfo = luabridge::getGlobal (L, "ardourluainfo");
	if (nfo.type() != LUA_TTABLE) {
		return UINT32_MAX;
	}

	if (nfo["master_bus"].type() != LUA_TNUMBER || nfo["type"].type() != LUA_TSTRING) {
		return UINT32_MAX;
	}

	LuaScriptInfo::ScriptType type = LuaScriptInfo::str2type (nfo["type"].cast<std::string>());
	if (type != LuaScriptInfo::SessionInit) {
		return UINT32_MAX;
	}

	return nfo["master_bus"].cast<uint32_t>();
}

uint32_t
SessionDialog::master_channel_count ()
{
	if (use_session_template ()) {
		std::string tn = session_template_name();
		if (tn.substr (0, 11) == "urn:ardour:") {
			uint32_t mc = meta_master_bus_profile (tn.substr (11));
			if (mc != UINT32_MAX) {
				return mc;
			}
		}
	}
	return 2;
}

bool
SessionDialog::use_session_template () const
{
	if (template_chooser.get_selection()->count_selected_rows() > 0) {
		return true;
	}
	return false;
}

std::string
SessionDialog::session_template_name ()
{
	if (template_chooser.get_selection()->count_selected_rows() > 0) {
		TreeIter const iter = template_chooser.get_selection()->get_selected();
		if (iter) {
			string s = (*iter)[session_template_columns.path];
			return s;
		}
	}
	return string();
}

void
SessionDialog::clear_name ()
{
	recent_session_display.get_selection()->unselect_all();
	new_name_entry.set_text (string());
}

std::string
SessionDialog::session_name (bool& should_be_new)
{
	/* Check if a recent session is selected */
	TreeIter iter = recent_session_display.get_selection()->get_selected();
	if (iter) {
		should_be_new = false;
		string s = (*iter)[recent_session_columns.fullpath];
		if (Glib::file_test (s, Glib::FILE_TEST_IS_REGULAR)) {
			return PBD::basename_nosuffix (s);
		}
		return (*iter)[recent_session_columns.visible_name];
	}

	/* Check if Choose File was used (existing_session_chooser has a selection) */
	std::string existing = existing_session_chooser.get_filename();
	if (!existing.empty() && Glib::file_test (existing, Glib::FILE_TEST_IS_REGULAR)) {
		should_be_new = false;
		return existing;
	}

	/* Otherwise it's a new session */
	should_be_new = true;
	string val = new_name_entry.get_text ();
	strip_whitespace_edges (val);
	return val;
}

std::string
SessionDialog::session_folder ()
{
	/* Check if a recent session is selected */
	TreeIter iter = recent_session_display.get_selection()->get_selected();
	if (iter) {
		string s = (*iter)[recent_session_columns.fullpath];
		if (Glib::file_test (s, Glib::FILE_TEST_IS_REGULAR)) {
			return Glib::path_get_dirname (s);
		}
		return s;
	}

	/* Check if Choose File was used */
	std::string existing = existing_session_chooser.get_filename();
	if (!existing.empty() && Glib::file_test (existing, Glib::FILE_TEST_IS_REGULAR)) {
		return Glib::path_get_dirname (existing);
	}

	/* New session */
	std::string val = new_name_entry.get_text();
	strip_whitespace_edges (val);
	std::string legal_session_folder_name = legalize_for_path (val);
	return Glib::build_filename (new_folder_chooser.get_filename (), legal_session_folder_name);
}

Temporal::TimeDomain
SessionDialog::session_domain () const
{
	return timebase_chooser.get_active_row_number() == 1 ? Temporal::BeatTime : Temporal::AudioTime;
}

/* ============================================================
 *  RECENT SESSIONS
 * ============================================================ */

void
SessionDialog::setup_recent_sessions ()
{
	recent_session_model = TreeStore::create (recent_session_columns);
	recent_session_model->signal_sort_column_changed().connect (sigc::mem_fun (*this, &SessionDialog::recent_session_sort_changed));

	recent_session_display.set_model (recent_session_model);

	/* Cubase-style: name + date, no headers */
	recent_session_display.append_column (_("Name"), recent_session_columns.visible_name);
	recent_session_display.append_column (_("Date"), recent_session_columns.time_formatted);

	recent_session_display.set_headers_visible (false);
	recent_session_display.get_selection()->set_mode (SELECTION_SINGLE);

	/* Set column properties */
	{
		Gtk::TreeViewColumn* col = recent_session_display.get_column(0);
		if (col) {
			col->set_expand (true);
		}
	}
	{
		Gtk::TreeViewColumn* col = recent_session_display.get_column(1);
		if (col) {
			col->set_expand (false);
			col->set_alignment (1.0);
		}
	}

	recent_session_display.get_selection()->signal_changed().connect (sigc::mem_fun (*this, &SessionDialog::recent_session_row_selected));

	recent_scroller.add (recent_session_display);

	recent_session_display.show();
	recent_session_display.signal_row_activated().connect (sigc::mem_fun (*this, &SessionDialog::recent_row_activated));
	recent_session_display.signal_button_press_event().connect (sigc::mem_fun (*this, &SessionDialog::recent_button_press), false);
}

void
SessionDialog::setup_existing_box ()
{
	/* Hidden file chooser - used only for session_name()/session_folder() interop when Choose File is used */
	existing_session_chooser.set_size_request (1, 1);
	existing_session_chooser.set_current_folder(poor_mans_glob (Config->get_default_session_parent_dir()));

	FileFilter session_filter;
	session_filter.add_pattern (string_compose(X_("*%1"), ARDOUR::statefile_suffix));
	session_filter.set_name (string_compose (_("%1 sessions"), PROGRAM_NAME));
	existing_session_chooser.add_filter (session_filter);

	FileFilter archive_filter;
	archive_filter.add_pattern (string_compose(X_("*%1"), ARDOUR::session_archive_suffix));
	archive_filter.set_name (_("Session Archives"));
	existing_session_chooser.add_filter (archive_filter);

	FileFilter aaf_filter;
	aaf_filter.add_pattern (string_compose(X_("*%1"), ARDOUR::advanced_authoring_format_suffix));
	aaf_filter.set_name (_("Advanced Authoring Format (AAF)"));
	existing_session_chooser.add_filter (aaf_filter);

	FileFilter all_filter;
	all_filter.add_pattern (string_compose(X_("*%1"), ARDOUR::statefile_suffix));
	all_filter.add_pattern (string_compose(X_("*%1"), ARDOUR::session_archive_suffix));
	all_filter.add_pattern (string_compose(X_("*%1"), ARDOUR::advanced_authoring_format_suffix));
	all_filter.set_name (_("All supported files"));
	existing_session_chooser.add_filter (all_filter);

	existing_session_chooser.set_filter (session_filter);
}

void
SessionDialog::existing_file_selected ()
{
	open_button->set_sensitive (false);

	std::string const& s = existing_session_chooser.get_filename ();
	if (!Glib::file_test (s, Glib::FILE_TEST_IS_REGULAR)) {
		return;
	}

	std::string suffix = s.substr (s.find_last_of ('.'));

	if (PBD::downcase (suffix).find (advanced_authoring_format_suffix) == 0) {
		// OK
	}  else if (suffix.find (session_archive_suffix) == 0) {
		// OK
	} else {
		float        sr;
		SampleFormat sf;
		string       pv;

		switch (Session::get_info_from_path (s, sr, sf, pv)) {
			case 1:
			case 0:
				break;
			case -1:
				error << string_compose (_("Session file %1 does not exist"), s) << endmsg;
				return;
			case -3:
				error << string_compose (_("Session %1 is from a newer version of %2"), s, PROGRAM_NAME) << endmsg;
				return;
			default:
				error << string_compose (_("Cannot get existing session information from %1"), s) << endmsg;
				return;
		}
	}

	open_button->set_sensitive(true);
}

void
SessionDialog::session_selected ()
{
}

bool
SessionDialog::open_button_pressed (GdkEventButton* ev)
{
	if (Gtkmm2ext::Keyboard::modifier_state_equals (ev->state, Gtkmm2ext::Keyboard::PrimaryModifier)) {
		_disable_plugins.set_active();
	}
	response (RESPONSE_ACCEPT);
	return true;
}

void
SessionDialog::setup_untitled_session ()
{
	new_name_entry.set_text (string_compose (_("Untitled-%1"), Glib::DateTime::create_now_local().format ("%F-%H-%M-%S")));
	new_name_was_edited = false;
}

void
SessionDialog::delete_selected_template ()
{
	Gtk::TreeModel::const_iterator current_selection = template_chooser.get_selection()->get_selected ();

	if (!current_selection) {
		return;
	}

	if (!current_selection->get_value (session_template_columns.removable)) {
		ArdourMessageDialog msg (("This type of template cannot be deleted"));
		msg.run ();
		return;
	}

	PBD::remove_directory (current_selection->get_value (session_template_columns.path));

	template_model->erase (current_selection);

	populate_session_templates ();
}

bool
SessionDialog::template_button_press (GdkEventButton* ev)
{
	if (Gtkmm2ext::Keyboard::is_context_menu_event (ev)) {
		show_template_context_menu (ev->button, ev->time);
	}
	return false;
}

void
SessionDialog::show_template_context_menu (int button, int time)
{
	using namespace Gtk::Menu_Helpers;
	Gtk::Menu* menu = ARDOUR_UI::instance()->shared_popup_menu ();
	MenuList&  items = menu->items ();
	items.push_back (MenuElem (_("Delete the selected Template"), hide_return (sigc::mem_fun (*this, &SessionDialog::delete_selected_template))));
	menu->popup (button, time);
}

void
SessionDialog::populate_session_templates ()
{
	vector<TemplateInfo> templates;

	find_session_templates (templates, true);

	template_model->clear ();

	/* Get Lua Scripts dedicated to session-setup */
	LuaScriptList scripts (LuaScripting::instance ().scripts (LuaScriptInfo::SessionInit));

	/* Add Lua Action Scripts which can also be used for session-setup */
	LuaScriptList& as (LuaScripting::instance ().scripts (LuaScriptInfo::EditorAction));
	for (LuaScriptList::const_iterator s = as.begin(); s != as.end(); ++s) {
		if ((*s)->subtype & LuaScriptInfo::SessionSetup) {
			scripts.push_back (*s);
		}
	}

	std::sort (scripts.begin(), scripts.end(), LuaScripting::Sorter());

	for (LuaScriptList::const_iterator s = scripts.begin(); s != scripts.end(); ++s) {
		TreeModel::Row row = *(template_model->append ());
		row[session_template_columns.name] = (*s)->name;
		row[session_template_columns.path] = "urn:ardour:" + (*s)->path;
		row[session_template_columns.description] = (*s)->description;
		row[session_template_columns.modified_with_short] = string_compose ("{%1}", _("Factory Template"));
		row[session_template_columns.modified_with_long] = string_compose ("{%1}", _("Factory Template"));
		row[session_template_columns.removable] = false;
	}

	for (vector<TemplateInfo>::iterator x = templates.begin(); x != templates.end(); ++x) {
		TreeModel::Row row;

		row = *(template_model->append ());

		row[session_template_columns.name] = (*x).name;
		row[session_template_columns.path] = (*x).path;
		row[session_template_columns.description] = (*x).description;
		row[session_template_columns.modified_with_long] = (*x).modified_with;
		row[session_template_columns.modified_with_short] = (*x).modified_with.substr(0, (*x).modified_with.find(" "));
		row[session_template_columns.removable] = true;
	}

	TreeModel::Row row = *template_model->prepend ();
	row[session_template_columns.name] = (_("Empty Template"));
	row[session_template_columns.path] = string();
	row[session_template_columns.description] = _("An empty session with factory default settings.\n\nSelect this option if you are importing files to mix.");
	row[session_template_columns.modified_with_short] = ("");
	row[session_template_columns.modified_with_long] = ("");
	row[session_template_columns.removable] = false;

	Gtk::TreeModel::Row first = template_model->children()[0];
	if(first) {
		template_chooser.get_selection()->select(first);
	}
}

void
SessionDialog::setup_new_session_page ()
{
	/* This sets up the new_name_entry, new_folder_chooser, timebase_chooser, and template_chooser
	 * data models. The actual UI is built in the constructor (Cubase Hub layout).
	 * We keep this function to initialize the data structures. */

	new_name_entry.signal_key_press_event().connect (sigc::mem_fun (*this, &SessionDialog::new_name_edited), false);
	new_name_entry.signal_changed().connect (sigc::mem_fun (*this, &SessionDialog::new_name_changed));
	new_name_entry.signal_activate().connect (sigc::mem_fun (*this, &SessionDialog::new_name_activated));

	if (ARDOUR_UI::instance()->the_session ()) {
		string session_parent_dir = Glib::path_get_dirname(ARDOUR_UI::instance()->the_session()->path());
		new_folder_chooser.set_current_folder (session_parent_dir);
		string default_session_folder = poor_mans_glob (Config->get_default_session_parent_dir());

		try {
			new_folder_chooser.add_shortcut_folder (default_session_folder);
		}
		catch (Glib::Error & e) {
			std::cerr << "new_folder_chooser.add_shortcut_folder (" << default_session_folder << ") threw Glib::Error " << e.what() << std::endl;
		}
	} else {
		new_folder_chooser.set_current_folder (poor_mans_glob (Config->get_default_session_parent_dir()));
	}
	new_folder_chooser.set_title (_("Select folder for session"));
	Gtkmm2ext::add_volume_shortcuts (new_folder_chooser);

	timebase_chooser.append (_("Audio Time"));
	timebase_chooser.append (_("Beat Time"));
	timebase_chooser.set_active (Config->get_preferred_time_domain() == Temporal::BeatTime ? 1 : 0);

	/* Template chooser model */
	template_model = TreeStore::create (session_template_columns);
	template_chooser.set_model (template_model);
	template_chooser.append_column (_("Template"), session_template_columns.name);
	template_chooser.set_headers_visible (false);
	template_chooser.get_selection()->set_mode (SELECTION_SINGLE);
	template_chooser.get_selection()->signal_changed().connect (sigc::mem_fun (*this, &SessionDialog::template_row_selected));
	template_chooser.signal_button_press_event ().connect (sigc::mem_fun (*this, &SessionDialog::template_button_press), false);
	template_chooser.set_sensitive (true);
	if (UIConfiguration::instance().get_use_tooltips()) {
		template_chooser.set_tooltip_column(4);
	}
}

bool
SessionDialog::new_name_edited (GdkEventKey* ev)
{
	switch (ev->keyval) {
	case GDK_KP_Enter:
	case GDK_3270_Enter:
	case GDK_Return:
		break;
	default:
		new_name_was_edited = true;
	}

	return false;
}


static bool is_invalid_session_char (char c)
{
	return iscntrl (c) || c == '/' || c == '\\' || c == ':' || c == ';';
}

void
SessionDialog::new_name_changed ()
{
	std::string new_name = new_name_entry.get_text();

	std::string const& illegal = Session::session_name_is_legal (new_name);
	if (!illegal.empty()) {
		ArdourMessageDialog msg (string_compose (_("To ensure compatibility with various systems\nsession names may not contain a '%1' character"), illegal));
		msg.run ();
		new_name.erase (remove_if (new_name.begin(), new_name.end(), is_invalid_session_char), new_name.end());
		new_name_entry.set_text (new_name);
	}

	if (!new_name_entry.get_text().empty()) {
		session_selected ();
		open_button->set_sensitive (true);
	} else {
		open_button->set_sensitive (false);
	}
}

void
SessionDialog::new_name_activated ()
{
	response (RESPONSE_ACCEPT);
}

int
SessionDialog::redisplay_recent_sessions ()
{
	std::vector<std::string> session_directories;
	RecentSessionsSorter cmp;

	recent_session_display.set_model (Glib::RefPtr<TreeModel>(0));
	recent_session_model->clear ();

	ARDOUR::RecentSessions rs;
	ARDOUR::read_recent_sessions (rs);

	if (rs.empty()) {
		recent_session_display.set_model (recent_session_model);
		return 0;
	}

	sort (rs.begin(), rs.end(), cmp);

	for (ARDOUR::RecentSessions::iterator i = rs.begin(); i != rs.end(); ++i) {
		session_directories.push_back ((*i).second);
	}

	int session_snapshot_count = 0;

	for (vector<std::string>::const_iterator i = session_directories.begin(); i != session_directories.end(); ++i) {

		string dirname = *i;

		if (dirname.empty()) {
			continue;
		}

		if (dirname[dirname.length()-1] == '/') {
			dirname = dirname.substr (0, dirname.length()-1);
		}

		if (!Glib::file_test(dirname.c_str(), Glib::FILE_TEST_EXISTS)) {
			continue;
		}

		vector<string> state_file_names = Session::possible_states (dirname);

		if (state_file_names.empty()) {
			continue;
		}

		float sr;
		SampleFormat sf;
		std::string program_version;

		std::string state_file_basename;

		if (state_file_names.size() > 1) {
			state_file_basename = Session::get_snapshot_from_instant (dirname);
			std::string s = Glib::build_filename (dirname, state_file_basename + statefile_suffix);
			if (!Glib::file_test (s, Glib::FILE_TEST_IS_REGULAR)) {
				state_file_basename = "";
			}
		}

		if (state_file_basename.empty()) {
			state_file_basename = state_file_names.front();
		}

		std::string s = Glib::build_filename (dirname, state_file_basename + statefile_suffix);

		int err = Session::get_info_from_path (s, sr, sf, program_version);
		if (err < 0) {
			continue;
		}

#ifdef LIVETRAX
		if (program_version.empty()) {
			continue;
		}
		if (program_version.rfind (PROGRAM_NAME, 0) != 0) {
			continue;
		}
#endif

		GStatBuf gsb;
		g_stat (s.c_str(), &gsb);

		Gtk::TreeModel::Row row = *(recent_session_model->append());
		row[recent_session_columns.fullpath] = s;
		row[recent_session_columns.time_modified] = gsb.st_mtime;


		if (err == 0) {
			row[recent_session_columns.sample_rate] = rate_as_string (sr);
			switch (sf) {
			case FormatFloat:
				row[recent_session_columns.disk_format] = _("32-bit float");
				break;
			case FormatInt24:
				row[recent_session_columns.disk_format] = _("24-bit");
				break;
			case FormatInt16:
				row[recent_session_columns.disk_format] = _("16-bit");
				break;
			}
		} else {
			row[recent_session_columns.sample_rate] = "??";
			row[recent_session_columns.disk_format] = "--";
		}

		if (program_version.empty()) {
			row[recent_session_columns.tip] = Gtkmm2ext::markup_escape_text (dirname);
		} else {
			row[recent_session_columns.tip] = Gtkmm2ext::markup_escape_text (dirname + "\n" + string_compose (_("Last modified with: %1"), program_version));
			row[recent_session_columns.modified_with] = program_version;
		}

		++session_snapshot_count;

		if (state_file_names.size() > 1) {
			row[recent_session_columns.visible_name] = Glib::path_get_basename (dirname);
			int64_t most_recent = 0;

			int kidcount = 0;
			for (std::vector<std::string>::iterator i2 = state_file_names.begin(); i2 != state_file_names.end(); ++i2) {

				s = Glib::build_filename (dirname, *i2 + statefile_suffix);
				Gtk::TreeModel::Row child_row = *(recent_session_model->append (row.children()));

				child_row[recent_session_columns.visible_name] = *i2;
				child_row[recent_session_columns.fullpath] = s;
				child_row[recent_session_columns.tip] = Gtkmm2ext::markup_escape_text (dirname);
				g_stat (s.c_str(), &gsb);
				child_row[recent_session_columns.time_modified] = gsb.st_mtime;

				Glib::DateTime gdt(Glib::DateTime::create_now_local (gsb.st_mtime));
				child_row[recent_session_columns.time_formatted] = gdt.format ("%m/%d/%y  %l:%M%p");

				if (gsb.st_mtime > most_recent) {
					most_recent = gsb.st_mtime;
				}

				if (++kidcount < 5) {
					if (Session::get_info_from_path (s, sr, sf, program_version) == 0) {
						child_row[recent_session_columns.sample_rate] = "";
						child_row[recent_session_columns.disk_format] = "";
					} else {
						child_row[recent_session_columns.sample_rate] = "??";
						child_row[recent_session_columns.disk_format] = "--";
					}
					if (!program_version.empty()) {
						child_row[recent_session_columns.tip] = Gtkmm2ext::markup_escape_text (string_compose (_("Last modified with: %1"), program_version));
					}
				} else {
					child_row[recent_session_columns.sample_rate] = "";
					child_row[recent_session_columns.disk_format] = "";
				}

				++session_snapshot_count;
			}

			assert (most_recent >= row[recent_session_columns.time_modified]);
			row[recent_session_columns.time_modified] = most_recent;

		} else {
			row[recent_session_columns.visible_name] = state_file_basename;
		}

		/* Cubase-style date format */
		Glib::DateTime gdt(Glib::DateTime::create_now_local (row[recent_session_columns.time_modified]));
		row[recent_session_columns.time_formatted] = gdt.format ("%m/%d/%y  %l:%M%p");
	}

	if (UIConfiguration::instance().get_use_tooltips()) {
		recent_session_display.set_tooltip_column(1);
	}
	recent_session_display.set_model (recent_session_model);

	/* Sort by time modified (most recent first) by default */
	Gtk::TreeView::Column* pColumn;
	if ((pColumn = recent_session_display.get_column (0))) {
		pColumn->set_sort_column (recent_session_columns.visible_name);
	}
	if ((pColumn = recent_session_display.get_column (1))) {
		pColumn->set_sort_column (recent_session_columns.time_modified);
	}

	int32_t sort = UIConfiguration::instance().get_recent_session_sort();
	if (abs(sort) != 1 + recent_session_columns.visible_name.index () &&
	    abs(sort) != 1 + recent_session_columns.time_modified.index ()) {
		sort = 1 + recent_session_columns.visible_name.index();
	}
	recent_session_model->set_sort_column (abs (sort) -1, sort < 0 ? Gtk::SORT_DESCENDING : Gtk::SORT_ASCENDING);

	Gtk::TreeModel::Row first = recent_session_model->children()[0];
	if(first) {
		recent_session_display.get_selection()->select(first);
	}

	return session_snapshot_count;
}

void
SessionDialog::recent_session_sort_changed ()
{
	int column;
	SortType order;
	if (recent_session_model->get_sort_column_id (column, order)) {
		int32_t sort = (column + 1) * (order == Gtk::SORT_DESCENDING ? -1 : 1);
		if (sort != UIConfiguration::instance().get_recent_session_sort()) {
			UIConfiguration::instance().set_recent_session_sort(sort);
		}
	}
}

void
SessionDialog::recent_session_row_selected ()
{
	if (recent_session_display.get_selection()->count_selected_rows() > 0) {
		open_button->set_sensitive (true);
		session_selected ();
	} else {
		open_button->set_sensitive (false);
	}
}

void
SessionDialog::template_row_selected ()
{
	if (template_chooser.get_selection()->count_selected_rows() > 0) {
		TreeIter iter = template_chooser.get_selection()->get_selected();

		if (iter) {
			string s = (*iter)[session_template_columns.description];
			template_desc.get_buffer()->set_text (s);
		}
	}
}

void
SessionDialog::recent_row_activated (const Gtk::TreePath&, Gtk::TreeViewColumn*)
{
	response (RESPONSE_ACCEPT);
}

bool
SessionDialog::recent_button_press (GdkEventButton* ev)
{
	if ((ev->type == GDK_BUTTON_PRESS) && (ev->button == 3)) {

		TreeModel::Path path;
		TreeViewColumn* column;
		int cellx, celly;
		if (recent_session_display.get_path_at_pos ((int)ev->x, (int)ev->y, path, column, cellx, celly)) {
			Glib::RefPtr<Gtk::TreeView::Selection> selection = recent_session_display.get_selection();
			if (selection) {
				selection->unselect_all();
				selection->select(path);
			}
		}

		if (recent_session_display.get_selection()->count_selected_rows() > 0) {
			recent_context_mennu (ev);
		}
	}
	return false;
}

void
SessionDialog::recent_context_mennu (GdkEventButton *ev)
{
	using namespace Gtk::Menu_Helpers;

	TreeIter iter = recent_session_display.get_selection()->get_selected();
	assert (iter);
	string s = (*iter)[recent_session_columns.fullpath];
	if (Glib::file_test (s, Glib::FILE_TEST_IS_REGULAR)) {
		s = Glib::path_get_dirname (s);
	}
	if (!Glib::file_test (s, Glib::FILE_TEST_IS_DIR)) {
		return;
	}

	Gtk::TreeModel::Path tpath = recent_session_model->get_path(iter);
	const bool is_child = tpath.up () && tpath.up ();

	Gtk::Menu* m = ARDOUR_UI::instance()->shared_popup_menu ();
	MenuList& items = m->items ();
	items.push_back (MenuElem (s, sigc::bind (sigc::hide_return (sigc::ptr_fun (&PBD::open_folder)), s)));
	if (!is_child) {
		items.push_back (SeparatorElem());
		items.push_back (MenuElem (_("Remove session from recent list"), sigc::mem_fun (*this, &SessionDialog::recent_remove_selected)));
	}
	m->popup (ev->button, ev->time);
}

void
SessionDialog::recent_remove_selected ()
{
	TreeIter iter = recent_session_display.get_selection()->get_selected();
	assert (iter);
	string s = (*iter)[recent_session_columns.fullpath];
	if (Glib::file_test (s, Glib::FILE_TEST_IS_REGULAR)) {
		s = Glib::path_get_dirname (s);
	}
	ARDOUR::remove_recent_sessions (s);
	redisplay_recent_sessions ();
}

void
SessionDialog::disable_plugins_clicked ()
{
	ARDOUR::Session::set_disable_all_loaded_plugins (_disable_plugins.get_active());
}

void
SessionDialog::existing_file_activated ()
{
	std::string s = existing_session_chooser.get_filename ();
	if (Glib::file_test (s, Glib::FILE_TEST_IS_REGULAR)) {
		response (RESPONSE_ACCEPT);
	}
}

void
SessionDialog::updates_button_clicked ()
{
	PBD::open_uri (Config->get_updates_url());
}

bool
SessionDialog::info_scroller_update()
{
	info_scroller_count++;

	char buf[512];
	snprintf (buf, std::min(info_scroller_count,sizeof(buf)-1), "%s", ARDOUR_UI::instance()->announce_string().c_str());
	buf[info_scroller_count] = 0;
	info_scroller_label.set_text (buf);
	info_scroller_label.show();

	if (info_scroller_count > ARDOUR_UI::instance()->announce_string().length()) {
		info_scroller_connection.disconnect();
	}

	return true;
}

bool
SessionDialog::on_delete_event (GdkEventAny* ev)
{
	response (RESPONSE_CANCEL);
	return ArdourDialog::on_delete_event (ev);
}
