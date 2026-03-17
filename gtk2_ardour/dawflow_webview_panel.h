/*
 * DawflowWebViewPanel - Embedded WebView for DAWFLOW Plugin UIs
 *
 * Wraps a native WKWebView (macOS) behind an opaque pointer so that
 * plugins can render their UI inside the DAW.  The Objective-C types
 * are hidden from pure C++ translation units.
 *
 * Part of the DAWFLOW plugin system (Task 5).
 */

#ifndef DAWFLOW_WEBVIEW_PANEL_H
#define DAWFLOW_WEBVIEW_PANEL_H

#include <string>

namespace Dawflow {

class WebViewPanel {
public:
	WebViewPanel (const std::string& plugin_id, const std::string& title);
	~WebViewPanel ();

	/** Navigate to the given URL (http://, https://, or file://). */
	void load_url (const std::string& url);

	/** Returns the native NSView* as void* for embedding in a GdkWindow. */
	void* native_view ();

	/** Resize the underlying web view. */
	void set_size (int width, int height);

	const std::string& plugin_id () const { return _plugin_id; }
	const std::string& title () const { return _title; }

private:
	std::string _plugin_id;
	std::string _title;
	void*       _impl; /* opaque – DawflowWebViewImpl* on macOS */
};

} /* namespace Dawflow */

#endif /* DAWFLOW_WEBVIEW_PANEL_H */
