/*
 * DawflowWebViewPanel – Objective-C++ implementation (macOS / WKWebView)
 *
 * Uses manual retain/release to match the rest of the Ardour codebase
 * (no ARC).  The Obj-C implementation class is hidden behind an opaque
 * void* pointer in the C++ header.
 *
 * Part of the DAWFLOW plugin system (Task 5).
 */

#include "dawflow_webview_panel.h"

#ifdef __APPLE__

#import <WebKit/WebKit.h>

/* ------------------------------------------------------------------ */
/* Objective-C helper that owns the WKWebView instance                */
/* ------------------------------------------------------------------ */
@interface DawflowWebViewImpl : NSObject {
	WKWebView* _webView;
}
@property (nonatomic, readonly) WKWebView* webView;
- (instancetype)initWithFrame:(NSRect)frame;
@end

@implementation DawflowWebViewImpl

- (instancetype)initWithFrame:(NSRect)frame
{
	self = [super init];
	if (self) {
		WKWebViewConfiguration* config = [[WKWebViewConfiguration alloc] init];
		/* Enable the Web Inspector for debugging plugin UIs */
		[config.preferences setValue:@YES forKey:@"developerExtrasEnabled"];
		_webView = [[WKWebView alloc] initWithFrame:frame configuration:config];
		[_webView setAutoresizingMask:NSViewWidthSizable | NSViewHeightSizable];
		[config release];
	}
	return self;
}

- (void)dealloc
{
	[_webView release];
	[super dealloc];
}

- (WKWebView*)webView
{
	return _webView;
}

@end

/* ------------------------------------------------------------------ */
/* C++ wrapper implementation                                          */
/* ------------------------------------------------------------------ */

namespace Dawflow {

WebViewPanel::WebViewPanel (const std::string& plugin_id, const std::string& title)
	: _plugin_id (plugin_id)
	, _title (title)
	, _impl (nil)
{
	DawflowWebViewImpl* impl = [[DawflowWebViewImpl alloc]
		initWithFrame:NSMakeRect (0, 0, 600, 300)];
	_impl = (void*)impl; /* retained by alloc */
}

WebViewPanel::~WebViewPanel ()
{
	if (_impl) {
		DawflowWebViewImpl* impl = (DawflowWebViewImpl*)_impl;
		[impl release];
		_impl = nil;
	}
}

void
WebViewPanel::load_url (const std::string& url)
{
	if (!_impl) return;
	DawflowWebViewImpl* impl = (DawflowWebViewImpl*)_impl;
	NSString* urlStr = [NSString stringWithUTF8String:url.c_str ()];
	NSURL* nsurl = [NSURL URLWithString:urlStr];
	if (nsurl) {
		NSURLRequest* request = [NSURLRequest requestWithURL:nsurl];
		[[impl webView] loadRequest:request];
	}
}

void*
WebViewPanel::native_view ()
{
	if (!_impl) return nil;
	DawflowWebViewImpl* impl = (DawflowWebViewImpl*)_impl;
	return (void*)[impl webView];
}

void
WebViewPanel::set_size (int width, int height)
{
	if (!_impl) return;
	DawflowWebViewImpl* impl = (DawflowWebViewImpl*)_impl;
	[[impl webView] setFrameSize:NSMakeSize (width, height)];
}

} /* namespace Dawflow */

#endif /* __APPLE__ */
