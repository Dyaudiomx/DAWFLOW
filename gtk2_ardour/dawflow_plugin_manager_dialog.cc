/*
 * DawflowPluginManagerDialog implementation
 *
 * Part of the DAWFLOW plugin system (Task 7).
 */

#include "dawflow_plugin_manager_dialog.h"

#include "ardour/session.h"
#include "ardour/dawflow_plugin_host.h"

#include <ytkmm/stock.h>

#include "pbd/i18n.h"

using namespace Gtk;
using namespace Glib;
using namespace ARDOUR;

DawflowPluginManagerDialog::DawflowPluginManagerDialog (Session* session)
	: ArdourDialog (_("DAWFLOW Plugins"))
	, _session (session)
	, _load_button (_("Load"))
	, _unload_button (_("Unload"))
	, _refresh_button (_("Refresh"))
	, _info_label (_("Select a plugin and click Load/Unload"))
{
	set_default_size (500, 300);

	_model = ListStore::create (_columns);
	_tree_view.set_model (_model);

	_tree_view.append_column (_("Name"), _columns.name);
	_tree_view.append_column (_("Version"), _columns.version);
	_tree_view.append_column (_("Author"), _columns.author);
	_tree_view.append_column (_("Status"), _columns.status);

	/* Make columns resizable */
	for (int i = 0; i < 4; i++) {
		_tree_view.get_column (i)->set_resizable (true);
	}
	_tree_view.get_column (0)->set_min_width (150);

	_scroller.set_policy (POLICY_AUTOMATIC, POLICY_AUTOMATIC);
	_scroller.add (_tree_view);

	_button_box.set_spacing (6);
	_button_box.pack_start (_load_button, false, false);
	_button_box.pack_start (_unload_button, false, false);
	_button_box.pack_start (_refresh_button, false, false);

	get_vbox()->set_spacing (8);
	get_vbox()->pack_start (_scroller, true, true);
	get_vbox()->pack_start (_button_box, false, false);
	get_vbox()->pack_start (_info_label, false, false);

	_load_button.signal_clicked().connect (sigc::mem_fun (*this, &DawflowPluginManagerDialog::_on_load_clicked));
	_unload_button.signal_clicked().connect (sigc::mem_fun (*this, &DawflowPluginManagerDialog::_on_unload_clicked));
	_refresh_button.signal_clicked().connect (sigc::mem_fun (*this, &DawflowPluginManagerDialog::_refresh_list));

	add_button (Stock::CLOSE, RESPONSE_CLOSE);

	_refresh_list ();
	show_all_children ();
}

DawflowPluginManagerDialog::~DawflowPluginManagerDialog ()
{
}

void
DawflowPluginManagerDialog::_refresh_list ()
{
	_model->clear ();

	if (!_session) {
		return;
	}

	DawflowPluginHost& host = _session->dawflow_plugin_host ();
	std::vector<DawflowIPC::PluginManifest> manifests = host.available_plugins ();

	for (std::vector<DawflowIPC::PluginManifest>::const_iterator it = manifests.begin (); it != manifests.end (); ++it) {
		TreeModel::Row row = *(_model->append ());
		row[_columns.name]      = ustring (it->name);
		row[_columns.version]   = ustring (it->version);
		row[_columns.author]    = ustring (it->author);
		row[_columns.plugin_id] = ustring (it->id);
		row[_columns.status]    = host.is_plugin_loaded (it->id) ? "Loaded" : "Available";
	}

	_info_label.set_text (std::to_string (manifests.size ()) + _(" plugin(s) found"));
}

void
DawflowPluginManagerDialog::_on_load_clicked ()
{
	Glib::RefPtr<TreeSelection> sel = _tree_view.get_selection ();
	TreeModel::iterator iter = sel->get_selected ();

	if (!iter || !_session) {
		return;
	}

	ustring plugin_id = (*iter)[_columns.plugin_id];

	DawflowPluginHost& host = _session->dawflow_plugin_host ();

	if (host.load_plugin (std::string (plugin_id))) {
		(*iter)[_columns.status] = ustring ("Loaded");
		_info_label.set_text ("Loaded: " + plugin_id);
	} else {
		_info_label.set_text ("Failed to load: " + plugin_id);
	}
}

void
DawflowPluginManagerDialog::_on_unload_clicked ()
{
	Glib::RefPtr<TreeSelection> sel = _tree_view.get_selection ();
	TreeModel::iterator iter = sel->get_selected ();

	if (!iter || !_session) {
		return;
	}

	ustring plugin_id = (*iter)[_columns.plugin_id];

	DawflowPluginHost& host = _session->dawflow_plugin_host ();
	host.unload_plugin (std::string (plugin_id));

	(*iter)[_columns.status] = ustring ("Available");
	_info_label.set_text ("Unloaded: " + plugin_id);
}
