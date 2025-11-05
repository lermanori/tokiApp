# File: app.config.js

### Summary
Expo app configuration file. Defines app metadata, build settings, plugins, and platform-specific configurations (iOS, Android, web).

### Fixes Applied log
- problem: No expo-notifications plugin configured, and iOS/Android push notification settings missing.
- solution: Added `expo-notifications` plugin, iOS `UIBackgroundModes: ["remote-notification"]` for background push delivery, and Android notification channel configuration.

### How Fixes Were Implemented
- Added `"expo-notifications"` to plugins array to enable native push notification support.
- Added iOS `infoPlist.UIBackgroundModes: ["remote-notification"]` to allow background push delivery (for badge updates, silent notifications).
- Added Android `notification` config with icon path and color (#B49AFF) for default notification channel appearance.
- Android notification channel is created programmatically in `utils/notifications.ts`; this config sets defaults.

