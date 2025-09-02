# File: discover.tsx

### Summary
This file contains the Discover screen component that displays Toki events with an interactive map and list view. It includes advanced search filters, map integration, and attendee counters.

### Fixes Applied log
- **problem**: Attendee counters showing "-" instead of actual participant numbers
- **solution**: Fixed property name mismatch between AppContext and Discover screen data mapping
- **problem**: Excessive debug logging cluttering the console
- **solution**: Removed all debug console.log statements for production readiness
- **problem**: Pressing host avatar/name initiated `startConversation`, creating conversations prematurely
- **solution**: Updated `onHostPress` to navigate to `/chat` with `otherUserId` only; conversation is now created on first message send in `chat.tsx`

### How Fixes Were Implemented

#### **Attendee Counter Fix**
The issue was a property name mismatch in the data flow:
1. **Backend** sends `currentAttendees` and `maxAttendees`
2. **AppContext** maps `apiToki.currentAttendees` → `attendees` property
3. **Discover screen** was incorrectly accessing `toki.currentAttendees` instead of `toki.attendees`

**Fixed by changing:**
```typescript
// BEFORE (wrong):
attendees: toki.currentAttendees || 0,

// AFTER (correct):
attendees: toki.attendees || 0,
```

**Data flow now correct:**
- Backend → `currentAttendees: 2, maxAttendees: 10`
- AppContext → Maps to `attendees: 2, maxAttendees: 10`
- Discover Screen → Accesses `toki.attendees` and `toki.maxAttendees`
- Display → Shows "2/10 people" ✅

#### **Debug Log Cleanup**
Removed all debugging console.log statements:
- `🔍 [TRANSFORM] Toki attendee data:` - Attendee data logging
- `🗺️ [DISCOVER] Raw backend Tokis:` - Backend data logging
- `🔍 [DEBUG] State tokis length:` - State debugging
- `🗺️ [DISCOVER] Raw coordinate data:` - Coordinate debugging
- `🗺️ [DISCOVER] Marker diagnostics` - Map marker diagnostics
- `🔄 [DISCOVER] Manual refresh triggered` - Refresh logging
- `✅ [DISCOVER] Tokis refreshed successfully` - Success logging
- `🔄 [DISCOVER] Screen focused, refreshing Tokis...` - Focus logging

**Kept essential error logging:**
- `❌ [DISCOVER] Failed to refresh Tokis:` - Error handling
- `🗺️ [DISCOVER] Marker diagnostics error` - Map error handling

### Current Status
- ✅ Attendee counters now display correct participant numbers
- ✅ Debug logging cleaned up for production
- ✅ Map integration working with custom markers
- ✅ Advanced search filters functional (date range, sorting)
- ✅ Auto-refresh on screen focus working
- ⏳ Radius-based filtering deferred for future enhancement

### Notes
The linter errors shown are pre-existing CSS compatibility issues between React Native and web platforms, not related to the attendee counter fix or debug cleanup. These are cosmetic and don't affect functionality.
