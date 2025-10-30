# Invite Links Feature

## Overview

The Invite Links feature allows Toki hosts to generate shareable URLs that enable direct joining of events without requiring individual invitations. This feature provides a convenient way to share events publicly while maintaining control over access.

## Features

- **Generate Invite Links**: Create unique, shareable URLs for any Toki
- **Custom Messages**: Add personalized messages for invitees
- **Usage Limits**: Set maximum number of uses (or unlimited)
- **Link Management**: View, regenerate, and deactivate links
- **Public Access**: Anyone with the link can view event details and join
- **Usage Tracking**: Monitor how many times a link has been used

## Backend Implementation

### Database Schema

```sql
CREATE TABLE toki_invite_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  toki_id UUID NOT NULL REFERENCES tokis(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invite_code VARCHAR(32) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  max_uses INTEGER DEFAULT NULL,
  used_count INTEGER DEFAULT 0,
  custom_message TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### API Endpoints

#### Generate Invite Link
- **POST** `/api/tokis/:id/invite-links`
- **Auth**: Host only
- **Body**: `{ maxUses?: number, message?: string }`
- **Response**: `{ success: boolean, data: InviteLink }`

#### Join by Invite Code
- **POST** `/api/tokis/join-by-link`
- **Auth**: Any authenticated user
- **Body**: `{ inviteCode: string }`
- **Response**: `{ success: boolean, message: string, data: { toki, joinedAt } }`

#### Get Link Info (Public)
- **GET** `/api/tokis/invite-links/:code`
- **Auth**: None (public endpoint)
- **Response**: `{ success: boolean, data: { toki, host, inviteLink, isActive } }`

#### List Links for Toki
- **GET** `/api/tokis/:id/invite-links`
- **Auth**: Host only
- **Response**: `{ success: boolean, data: { toki, links, activeLink } }`

#### Regenerate Link
- **POST** `/api/tokis/:id/invite-links/regenerate`
- **Auth**: Host only
- **Body**: `{ maxUses?: number, message?: string }`
- **Response**: `{ success: boolean, message: string, data: InviteLink }`

#### Deactivate Link
- **DELETE** `/api/tokis/invite-links/:linkId`
- **Auth**: Host only
- **Response**: `{ success: boolean, message: string }`

### Services

#### Link Generation Service (`inviteLinkUtils.ts`)
- `generateInviteCode()`: Creates unique 8-character codes
- `deactivateExistingLinks()`: Deactivates old links when generating new ones
- `validateInviteLink()`: Checks if link is active and valid
- `incrementLinkUsage()`: Updates usage count
- `isUserParticipant()`: Checks if user is already a participant
- `addUserToToki()`: Adds user to toki participants

## Frontend Implementation

### API Service Methods

```typescript
// Generate invite link
generateInviteLink(tokiId: string, opts?: { maxUses?: number; message?: string })

// Regenerate invite link
regenerateInviteLink(tokiId: string, opts?: { maxUses?: number; message?: string })

// Deactivate invite link
deactivateInviteLink(linkId: string)

// Get invite links for toki
getInviteLinksForToki(tokiId: string)

// Get public link info
getInviteLinkInfo(code: string)

// Join by invite code
joinByInviteCode(inviteCode: string)
```

### AppContext Actions

```typescript
// Invite Link Management
generateInviteLink: (tokiId: string, opts?: { maxUses?: number | null; message?: string | null }) => Promise<any>
regenerateInviteLink: (tokiId: string, opts?: { maxUses?: number | null; message?: string | null }) => Promise<any>
deactivateInviteLink: (linkId: string) => Promise<boolean>
getInviteLinksForToki: (tokiId: string) => Promise<any>
getInviteLinkInfo: (code: string) => Promise<any>
joinByInviteCode: (inviteCode: string) => Promise<boolean>
```

### UI Components

#### InviteLinkManager Modal
- **Location**: `app/toki-details.tsx`
- **Trigger**: "Invite Link" button in host actions
- **Features**:
  - Display active link with copy functionality
  - Show usage statistics
  - Generate new links with custom options
  - Regenerate existing links
  - Deactivate links
  - Form for custom message and usage limits

#### UI Elements
- **Invite Link Button**: Purple-themed button in host actions section
- **Link Display**: Shows full URL with copy button
- **Usage Stats**: Displays used/total uses and creation date
- **Action Buttons**: Regenerate (purple) and Deactivate (red)
- **Generation Form**: Input fields for message and usage limits

## Usage Flow

### For Hosts

1. **Generate Link**: Click "Invite Link" button in toki details
2. **Configure Options**: Set custom message and usage limits (optional)
3. **Share Link**: Copy the generated URL and share via any platform
4. **Monitor Usage**: View usage statistics in the management modal
5. **Manage Links**: Regenerate or deactivate links as needed

### For Invitees

1. **Receive Link**: Get the invite URL from the host
2. **View Details**: Click link to see event information (public)
3. **Join Event**: Click join button to automatically join the toki
4. **Access Chat**: Once joined, access the toki group chat

## Security Features

- **Unique Codes**: 8-character alphanumeric codes prevent guessing
- **Host Verification**: Only toki hosts can manage invite links
- **Usage Limits**: Optional limits prevent abuse
- **Link Deactivation**: Hosts can deactivate links at any time
- **Participant Check**: Prevents duplicate joins
- **Toki Validation**: Ensures toki is active and not full

## Testing

### Test Script
- **Location**: `message-scripts/test-invite-links.sh`
- **Coverage**: Complete lifecycle testing
- **Steps**:
  1. Generate invite link with custom options
  2. Verify public link information
  3. Join toki via invite code
  4. Verify participant status
  5. Test link management (regenerate, deactivate)
  6. Verify link deactivation

### Test Results
```
🎉 Invite Links Feature Test Complete!
==================================
✅ All tests passed successfully

Summary:
- Generated invite link with custom message and usage limit
- Retrieved public link information
- Successfully joined toki via invite link
- Verified participant status
- Listed invite links from host perspective
- Regenerated invite link (deactivating old one)
- Verified old link deactivation
- Verified new link functionality
- Deactivated invite link
- Verified final deactivation
```

## Technical Details

### Link Format
- **URL**: `https://app.toki.com/join/{inviteCode}`
- **Code Length**: 8 characters
- **Character Set**: Alphanumeric (A-Z, 0-9)
- **Uniqueness**: Guaranteed by database constraint

### Database Indexes
```sql
CREATE INDEX idx_toki_invite_links_code ON toki_invite_links(invite_code);
CREATE INDEX idx_toki_invite_links_toki ON toki_invite_links(toki_id);
CREATE INDEX idx_toki_invite_links_active ON toki_invite_links(is_active);
CREATE INDEX idx_toki_invite_links_created_by ON toki_invite_links(created_by);
```

### Error Handling
- **Invalid Code**: Returns 404 for non-existent codes
- **Inactive Link**: Returns 400 for deactivated links
- **Already Participant**: Returns 400 if user already joined
- **Toki Full**: Returns 400 if max attendees reached
- **Invalid Toki**: Returns 404 for non-existent or inactive tokis

## Future Enhancements

- **QR Code Generation**: Generate QR codes for invite links
- **Expiration Dates**: Set time-based expiration for links
- **Analytics**: Track link performance and conversion rates
- **Bulk Management**: Manage multiple links at once
- **Custom Domains**: Support for custom invite domains
- **Social Sharing**: Built-in social media sharing options










