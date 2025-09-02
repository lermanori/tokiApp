# Chat Profile Navigation Fix

## Problem
When clicking on a user's name in the chat header on the messages page, the navigation to the user profile was failing with "Profile Not Found" error. This was happening because the chat component was incorrectly using `conversationId` (the UUID of the chat conversation) as the `userId` when navigating to the profile page.

## Root Cause
The issue was in two places:

1. **Messages Page (`app/(tabs)/messages.tsx`)**: When navigating to the chat screen, it was not passing the `other_user_id` parameter, only the `conversationId` and `otherUserName`.

2. **Chat Screen (`app/chat.tsx`)**: The navigation logic was using `params.conversationId` as the `userId` instead of the actual user ID of the other person in the conversation.

## Solution

### 1. Updated Messages Page Navigation
**File**: `app/(tabs)/messages.tsx`
**Lines**: 162-170

**Before**:
```typescript
router.push({
  pathname: '/chat',
  params: { 
    conversationId: conversation.id,
    otherUserName: conversation.other_user_name,
    isGroup: 'false'
  }
});
```

**After**:
```typescript
router.push({
  pathname: '/chat',
  params: { 
    conversationId: conversation.id,
    otherUserId: conversation.other_user_id,  // Added this line
    otherUserName: conversation.other_user_name,
    isGroup: 'false'
  }
});
```

### 2. Updated Chat Screen Navigation
**File**: `app/chat.tsx`
**Lines**: 87, 617-625

**Before**:
```typescript
const conversationId = params.conversationId as string;
const tokiId = params.tokiId as string;
const otherUserName = params.otherUserName as string;
const isGroup = params.isGroup === 'true';

// Navigation logic
if (!isGroup && params.conversationId) {
  router.push({
    pathname: '/user-profile/[userId]',
    params: { userId: params.conversationId }  // Wrong: using conversationId
  });
}
```

**After**:
```typescript
const conversationId = params.conversationId as string;
const tokiId = params.tokiId as string;
const otherUserId = params.otherUserId as string;  // Added this line
const otherUserName = params.otherUserName as string;
const isGroup = params.isGroup === 'true';

// Navigation logic
if (!isGroup && otherUserId) {
  router.push({
    pathname: '/user-profile/[userId]',
    params: { userId: otherUserId }  // Fixed: using actual user ID
  });
}
```

## Data Flow
1. **Backend API** (`/api/messages/conversations`) returns conversation data including `other_user_id`
2. **Messages Page** receives this data and now passes `other_user_id` to the chat screen
3. **Chat Screen** uses the correct `other_user_id` for profile navigation

## Testing
- ✅ Navigation from messages page to chat works correctly
- ✅ Clicking user name in chat header navigates to correct user profile
- ✅ No linting errors introduced
- ✅ Maintains backward compatibility for group chats

## Files Modified
- `app/(tabs)/messages.tsx` - Added `otherUserId` parameter to chat navigation
- `app/chat.tsx` - Updated to use `otherUserId` for profile navigation

## Related Issues
This fix resolves the issue where clicking "Daniela Krol" in the chat header was showing "Profile Not Found" because it was trying to use the conversation UUID instead of the actual user ID.
