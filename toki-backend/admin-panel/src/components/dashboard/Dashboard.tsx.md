# File: Dashboard.tsx

### Summary
Admin dashboard container with tab navigation. Added a new Settings tab to manage security settings like password link expiry hours.

### Fixes Applied log
- Added `Settings` tab and integrated `SettingsTab` into the tabbed layout.
- Extended internal tab state to include `'settings'`.

### How Fixes Were Implemented
- Imported `SettingsTab` and rendered it when the active tab is `'settings'`.
- Added a new tab button labeled “Settings”. 


