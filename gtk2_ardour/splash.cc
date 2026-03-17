/*
 * Copyright (C) 2008-2012 David Robillard <d@drobilla.net>
 * Copyright (C) 2008-2016 Paul Davis <paul@linuxaudiosystems.com>
 * Copyright (C) 2009-2012 Carl Hetherington <carl@carlh.net>
 * Copyright (C) 2012-2014 Tim Mayberry <mojofunk@gmail.com>
 * Copyright (C) 2012-2017 Robin Gareus <robin@gareus.org>
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
#include "gtk2ardour-version.h"
#endif

#include <string>

#include <cairo.h>

#include "pbd/failed_constructor.h"
#include "pbd/file_utils.h"

#include "ardour/ardour.h"
#include "ardour/filesystem_paths.h"

#include "gtkmm2ext/utils.h"

#ifdef check
#undef check
#endif

#include "gui_thread.h"
#include "opts.h"
#include "splash.h"
#include "ui_config.h"

#include "pbd/i18n.h"

#ifndef VERSIONSTRING
#define VERSIONSTRING PROGRAM_VERSION
#endif

using namespace Gtk;
using namespace Glib;
using namespace PBD;
using namespace std;
using namespace ARDOUR;

Splash* Splash::the_splash = 0;

Splash*
Splash::instance()
{
	if (!the_splash) {
		the_splash = new Splash;
	}
	return the_splash;
}

bool
Splash::exists ()
{
	return the_splash;
}

void
Splash::drop ()
{
	delete the_splash;
	the_splash = 0;
}

Splash::Splash ()
{
	assert (the_splash == 0);

	darea.set_size_request (splash_width, splash_height);
	pop_front ();
	set_position (WIN_POS_CENTER);
	darea.add_events (Gdk::BUTTON_PRESS_MASK|Gdk::BUTTON_RELEASE_MASK);
	darea.set_double_buffered (true);

	layout = create_pango_layout ("");
	current_message = string_compose (_("%1 loading ..."), PROGRAM_NAME);

	/* Load logo image */
	std::string logo_file;
	Searchpath logo_rc (ARDOUR::ardour_data_search_path());
	logo_rc.add_subdirectory_to_paths ("resources");
	if (find_file (logo_rc, PROGRAM_NAME "-splash.png", logo_file)) {
		try {
			logo_pixbuf = Gdk::Pixbuf::create_from_file (logo_file);
			/* Scale logo to fit splash width with padding */
			int target_w = splash_width / 2;
			int target_h = (logo_pixbuf->get_height() * target_w) / logo_pixbuf->get_width();
			logo_pixbuf = logo_pixbuf->scale_simple (target_w, target_h, Gdk::INTERP_BILINEAR);
		} catch (...) {
			/* logo loading failed, will draw text only */
		}
	}

	darea.show ();
	darea.signal_expose_event().connect (sigc::mem_fun (*this, &Splash::expose));

	add (darea);

	set_default_size (splash_width, splash_height);
	set_resizable (false);
	set_type_hint(Gdk::WINDOW_TYPE_HINT_SPLASHSCREEN);
	the_splash = this;

	expose_done = false;
	expose_is_the_one = false;

	if (!ARDOUR_COMMAND_LINE::no_splash) {
		ARDOUR::BootMessage.connect (msg_connection, invalidator (*this), std::bind (&Splash::boot_message, this, _1), gui_context());
		ARDOUR::PluginScanMessage.connect (scan_connection, invalidator (*this), std::bind (&Splash::plugin_scan_message, this, _1, _2, _3), gui_context());
		present ();
	}
}

Splash::~Splash ()
{
	idle_connection.disconnect ();
	expose_done = true;
	hide ();
	the_splash = 0;
}

void
Splash::pop_back_for (Gtk::Window& win)
{
	set_keep_above (false);
#if defined  __APPLE__ || defined PLATFORM_WINDOWS
	/* April 2013: window layering on OS X is a bit different to X Window. at present,
	 * the "restack()" functionality in GDK will only operate on windows in the same
	 * "level" (e.g. two normal top level windows, or two utility windows) and will not
	 * work across them. The splashscreen is on its own "StatusWindowLevel" so restacking
	 * is not going to work.
	 *
	 * So for OS X, we just hide ourselves.
	 *
	 * Oct 2014: The Windows situation is similar, although it should be possible
	 * to play tricks with gdk's set_type_hint() or directly hack things using
	 * SetWindowLong() and UpdateLayeredWindow()
	 */
	(void) win;
	hide();
#else
	if (UIConfiguration::instance().get_hide_splash_screen ()) {
		hide ();
	} else if (get_mapped ()) {
		get_window()->restack (win.get_window(), false);
		if (0 == win.get_transient_for ()) {
			win.set_transient_for (*this);
		}
	}
#endif
	_window_stack.insert (&win);
}

void
Splash::pop_front_for (Gtk::Window& win)
{
#ifndef NDEBUG
	assert (1 == _window_stack.erase (&win));
#else
	_window_stack.erase (&win);
#endif
	if (_window_stack.empty ()) {
		display ();
	}
}

void
Splash::pop_front ()
{
	if (!_window_stack.empty ()) {
		return;
	}

	if (ARDOUR_COMMAND_LINE::no_splash) {
		return;
	}

	if (get_window()) {
#if defined  __APPLE__ || defined PLATFORM_WINDOWS
		show ();
#else
		if (UIConfiguration::instance().get_hide_splash_screen ()) {
			show ();
		} else {
			unset_transient_for ();
			gdk_window_restack (get_window()->gobj(), NULL, true);
		}
#endif
		set_keep_above (true);
	}
}

void
Splash::hide ()
{
	Gtk::Window::hide();
}

void
Splash::on_realize ()
{
	Window::on_realize ();
	get_window()->set_decorations (Gdk::WMDecoration(0));
}

bool
Splash::on_button_release_event (GdkEventButton* ev)
{
	RefPtr<Gdk::Window> window = get_window();

	if (!window || ev->window != window->gobj()) {
		return false;
	}

	hide ();
	return true;
}

bool
Splash::expose (GdkEventExpose* ev)
{
	RefPtr<Gdk::Window> window = darea.get_window();
	if (!window) {
		return true;
	}

	Cairo::RefPtr<Cairo::Context> cr = window->create_cairo_context ();

	/* clip to exposed area */
	cr->rectangle (ev->area.x, ev->area.y, ev->area.width, ev->area.height);
	cr->clip ();

	/* dark background */
	cr->set_source_rgb (0.118, 0.118, 0.118); /* #1e1e1e */
	cr->rectangle (0, 0, splash_width, splash_height);
	cr->fill ();

	/* Logo image centered */
	int logo_bottom = splash_height / 2 - 40;
	if (logo_pixbuf) {
		int lw = logo_pixbuf->get_width ();
		int lh = logo_pixbuf->get_height ();
		double lx = (splash_width - lw) / 2.0;
		double ly = logo_bottom - lh;
		gdk_cairo_set_source_pixbuf (cr->cobj(), logo_pixbuf->gobj(), lx, ly);
		cr->paint ();
		logo_bottom = ly + lh + 8;
	}

	/* Title: "DAWFLOW" centered below logo */
	{
		Glib::RefPtr<Pango::Layout> title_layout = darea.create_pango_layout ("");
		Pango::FontDescription title_font ("Sans Bold 36");
		title_layout->set_font_description (title_font);
		title_layout->set_text ("DAWFLOW");
		int tw, th;
		title_layout->get_pixel_size (tw, th);
		cr->set_source_rgb (1.0, 1.0, 1.0);
		cr->move_to ((splash_width - tw) / 2.0, logo_bottom);
		title_layout->show_in_cairo_context (cr);
	}

	/* Subtitle: "Digital Audio Workstation" centered */
	{
		Glib::RefPtr<Pango::Layout> sub_layout = darea.create_pango_layout ("");
		Pango::FontDescription sub_font ("Sans 16");
		sub_layout->set_font_description (sub_font);
		sub_layout->set_text ("Digital Audio Workstation");
		int sw, sh;
		sub_layout->get_pixel_size (sw, sh);
		cr->set_source_rgb (0.533, 0.533, 0.533); /* #888888 */
		cr->move_to ((splash_width - sw) / 2.0, (splash_height / 2.0) + 4);
		sub_layout->show_in_cairo_context (cr);
	}

	/* Version info bottom left */
	{
		Glib::RefPtr<Pango::Layout> ver_layout = darea.create_pango_layout ("");
		Pango::FontDescription ver_font ("Sans 11");
		ver_layout->set_font_description (ver_font);
		string ver_text = string_compose ("Version %1 (Apple Silicon)", VERSIONSTRING);
		ver_layout->set_text (ver_text);
		cr->set_source_rgb (0.4, 0.4, 0.4); /* #666666 */
		cr->move_to (14, splash_height - 52);
		ver_layout->show_in_cairo_context (cr);
	}

	/* Boot message bottom left */
	{
		Glib::RefPtr<Pango::Layout> msg_layout = darea.create_pango_layout ("");
		Pango::FontDescription msg_font ("Sans 11");
		msg_layout->set_font_description (msg_font);
		msg_layout->set_text (current_message);
		msg_layout->set_width ((splash_width - 28) * PANGO_SCALE);
		msg_layout->set_ellipsize (Pango::ELLIPSIZE_END);
		cr->set_source_rgb (0.533, 0.533, 0.533); /* #888888 */
		cr->move_to (14, splash_height - 30);
		msg_layout->show_in_cairo_context (cr);
	}

	/* this must execute AFTER the GDK idle update mechanism */
	if (expose_is_the_one) {
		idle_connection = Glib::signal_idle().connect (
				sigc::mem_fun (this, &Splash::idle_after_expose),
				GDK_PRIORITY_REDRAW+2);
	}

	return true;
}

void
Splash::boot_message (std::string msg)
{
	if (!get_visible() && _window_stack.empty ()) {
		display ();
	}
	message (msg);
}

void
Splash::plugin_scan_message (std::string type, std::string plugin, bool /*scanning*/)
{
	/* Show per-plugin progress: "Scanning VST3 (12/45): FabFilter Pro-Q 3" */
	std::string basename = Glib::path_get_basename (plugin);
	/* Remove file extension for cleaner display */
	std::string::size_type dot = basename.rfind ('.');
	if (dot != std::string::npos) {
		basename = basename.substr (0, dot);
	}
	std::string msg = type + ": " + basename;
	message (msg);
}

bool
Splash::idle_after_expose ()
{
	expose_done = true;
	return false;
}

void
Splash::display ()
{
	bool was_mapped = get_mapped ();

	if (ARDOUR_COMMAND_LINE::no_splash) {
		return;
	}

	if (!was_mapped) {
		expose_done = false;
		expose_is_the_one = false;
	}

	pop_front ();
	present ();

	if (!was_mapped) {
		int timeout = 50;
		darea.queue_draw ();
		while (!expose_done && --timeout) {
			gtk_main_iteration ();
		}
		gdk_display_flush (gdk_display_get_default());
	}
}

void
Splash::message (const string& msg)
{
	current_message = msg;

	Glib::RefPtr<Gdk::Window> win = darea.get_window();

	if (win) {
		if (win->is_visible ()) {
			/* invalidate the bottom strip where the message is drawn */
			win->invalidate_rect (Gdk::Rectangle (0, splash_height - 60, splash_width, 60), true);
		} else {
			darea.queue_draw ();
		}
		if (expose_done) {
			ARDOUR::GUIIdle ();
		}
	}
}

bool
Splash::on_map_event (GdkEventAny* ev)
{
	expose_is_the_one = true;
	return Window::on_map_event (ev);
}
