/*
 * DawflowPluginManagerDialog - UI dialog for managing DAWFLOW plugins
 *
 * Provides a TreeView list of available .dawflow plugins with
 * Load / Unload / Refresh controls.
 *
 * Part of the DAWFLOW plugin system (Task 7).
 */

#ifndef DAWFLOW_PLUGIN_MANAGER_DIALOG_H
#define DAWFLOW_PLUGIN_MANAGER_DIALOG_H

#include "ardour_dialog.h"

#include <ytkmm/treeview.h>
#include <ytkmm/liststore.h>
#include <ytkmm/scrolledwindow.h>
#include <ytkmm/button.h>
#include <ytkmm/box.h>
#include <ytkmm/label.h>

namespace ARDOUR {
	class Session;
}

class DawflowPluginManagerDialog : public ArdourDialog
{
public:
	DawflowPluginManagerDialog (ARDOUR::Session*);
	~DawflowPluginManagerDialog ();

private:
	void _refresh_list ();
	void _on_load_clicked ();
	void _on_unload_clicked ();

	ARDOUR::Session* _session;

	/* Tree model columns */
	struct Columns : public Gtk::TreeModel::ColumnRecord {
		Columns () {
			add (name);
			add (version);
			add (author);
			add (status);
			add (plugin_id);
		}
		Gtk::TreeModelColumn<Glib::ustring> name;
		Gtk::TreeModelColumn<Glib::ustring> version;
		Gtk::TreeModelColumn<Glib::ustring> author;
		Gtk::TreeModelColumn<Glib::ustring> status;
		Gtk::TreeModelColumn<Glib::ustring> plugin_id;  /* hidden */
	};

	Columns              _columns;
	Glib::RefPtr<Gtk::ListStore> _model;
	Gtk::TreeView        _tree_view;
	Gtk::ScrolledWindow  _scroller;
	Gtk::HBox            _button_box;
	Gtk::Button          _load_button;
	Gtk::Button          _unload_button;
	Gtk::Button          _refresh_button;
	Gtk::Label           _info_label;
};

#endif /* DAWFLOW_PLUGIN_MANAGER_DIALOG_H */
