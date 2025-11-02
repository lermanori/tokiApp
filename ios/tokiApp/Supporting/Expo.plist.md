# File: ios/tokiApp/Supporting/Expo.plist

### Summary
This file configures Expo Updates (OTA updates) for the iOS app. It sets up how the app checks for and downloads updates from the Expo Updates service.

### Fixes Applied log
- problem: `expo-updates` was failing with error "channel-name: Required" when checking for updates because the request headers didn't include the channel name.
- solution: Added `EXUpdatesRequestHeaders` dictionary with `expo-channel-name` key set to "beta" to match the build profile channel configuration in `eas.json`.

### How Fixes Were Implemented
- Added `EXUpdatesRequestHeaders` dictionary to the plist file containing:
  - `expo-channel-name` key with value `"beta"` to match the build profile channel defined in `eas.json`.
- This ensures that when `expo-updates` makes requests to the Expo Updates service, it includes the required channel header so updates can be properly matched to the build's channel.

