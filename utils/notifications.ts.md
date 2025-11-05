# File: utils/notifications.ts

### Summary
Client-side push notification utilities for Expo. Handles permission requests, token registration, foreground notification handler configuration, and platform-specific setup (Android notification channel).

### Fixes Applied log
- problem: No push notification support for native iOS/Android apps.
- solution: Added `registerForPushNotificationsAsync` to request permissions, create Android channel, and fetch Expo push token. Added `configureForegroundNotificationHandler` to show alert banners when app is in foreground.

### How Fixes Were Implemented
- Implemented `registerForPushNotificationsAsync`: checks if device (not simulator), requests permissions, creates Android default channel, fetches Expo push token.
- Implemented `configureForegroundNotificationHandler`: sets Expo notification handler to show alerts and play sounds when app is open.
- Returns `{ token, platform }` with null token for web/unknown platforms.

