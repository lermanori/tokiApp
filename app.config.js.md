# File: app.config.js

### Summary
Expo app configuration file. Defines app metadata, build settings, plugins, and platform-specific configurations (iOS, Android, web).

### Fixes Applied log
- problem: No expo-notifications plugin configured, and iOS/Android push notification settings missing.
- solution: Added `expo-notifications` plugin, iOS `UIBackgroundModes: ["remote-notification"]` for background push delivery, and Android notification channel configuration.
- problem: Invalid `android.notification` property in Expo config schema causing expo-doctor validation error.
- solution: Removed `android.notification` property as it's not a valid Expo config field. Android notification configuration should be handled programmatically.
- problem: Version bump needed for new release.
- solution: Bumped app version from 1.0.1 to 1.0.9, runtimeVersion from 1.0.0 to 1.0.1, and iOS buildNumber from 2 to 3.
- problem: Version bump needed for new release.
- solution: Bumped app version from 1.0.9 to 1.0.10.

### How Fixes Were Implemented
- Added `"expo-notifications"` to plugins array to enable native push notification support.
- Added iOS `infoPlist.UIBackgroundModes: ["remote-notification"]` to allow background push delivery (for badge updates, silent notifications).
- Removed invalid `android.notification` config block (icon and color properties) from Expo config. Android notification channels are configured programmatically in `utils/notifications.ts`.

