#ifdef __APPLE__
#import <Cocoa/Cocoa.h>
#include <string>

std::string dawflow_native_open_dialog(const std::string& title, const std::string& start_dir)
{
    @autoreleasepool {
        NSOpenPanel* panel = [NSOpenPanel openPanel];
        [panel setTitle:[NSString stringWithUTF8String:title.c_str()]];
        [panel setCanChooseDirectories:YES];
        [panel setCanChooseFiles:YES];
        [panel setAllowsMultipleSelection:NO];

        // Set allowed file types for DAWFLOW/Ardour sessions
        NSArray* types = @[@"ardour", @"dawflow"];
        [panel setAllowedFileTypes:types];
        [panel setAllowsOtherFileTypes:YES];

        if (!start_dir.empty()) {
            NSURL* dirURL = [NSURL fileURLWithPath:[NSString stringWithUTF8String:start_dir.c_str()]];
            [panel setDirectoryURL:dirURL];
        }

        if ([panel runModal] == NSModalResponseOK) {
            NSURL* url = [[panel URLs] firstObject];
            if (url) {
                return std::string([[url path] UTF8String]);
            }
        }
        return "";
    }
}
#endif
