# File: app.config.js

### Summary
This file contains the Expo app configuration for the Toki application, including iOS and Android settings, plugins, and app metadata.

### Fixes Applied log
- **problem**: Missing location permission purpose strings (NSLocationWhenInUseUsageDescription and NSLocationAlwaysUsageDescription) required by iOS for location permission requests.
- **solution**: Added both location permission description strings to the iOS infoPlist configuration with the text: "Your location is used to show nearby scenes and events on the map and help you discover what's happening around you."
- **problem**: Version and build number bump needed for new release.
- **solution**: Bumped app version from 1.0.15 to 1.0.16, iOS buildNumber from 4 to 5, and Android versionCode from 4 to 5.
- **problem**: Version and build number bump needed for new release.
- **solution**: Bumped app version from 1.0.16 to 1.0.17, iOS buildNumber from 5 to 6, and Android versionCode from 5 to 6.
- **problem**: Version and build number bump needed for new release.
- **solution**: Bumped app version from 1.0.17 to 1.0.18, iOS buildNumber from 6 to 7, and Android versionCode from 6 to 7.
- **problem**: Build number bump needed for new release.
- **solution**: Bumped iOS buildNumber from 7 to 8, and Android versionCode from 7 to 8 (version remains 1.0.18).
- **problem**: Missing camera permission purpose string (NSCameraUsageDescription) required by iOS for camera permission requests.
- **solution**: Added NSCameraUsageDescription to the iOS infoPlist configuration with the text: "The camera is used to take profile photos and to capture photos when creating or uploading an event, for example when adding images during event setup."
- **problem**: Build number bump needed for new release.
- **solution**: Bumped iOS buildNumber from 8 to 9, and Android versionCode from 8 to 9 (version remains 1.0.18).

### How Fixes Were Implemented
- **problem**: iOS requires explicit permission purpose strings in Info.plist to explain to users why the app needs location access. Without these strings, location permission requests may be ignored or the app may be rejected by Apple.
- **solution**: Added `NSLocationWhenInUseUsageDescription` and `NSLocationAlwaysUsageDescription` keys to the `ios.infoPlist` object in the Expo configuration. These strings will be included in the iOS Info.plist file when the app is built, and will be displayed to users when the app requests location permissions.
