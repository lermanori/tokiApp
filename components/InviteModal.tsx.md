# File: InviteModal.tsx

### Summary
Reusable modal for inviting connections and managing visibility for a Toki. Extracted from `app/toki-details.tsx` to simplify that screen and make the modal reusable.

### Fixes Applied log
- **Problem**: Invite modal lived inline in `toki-details`, making it large and harder to maintain.
- **Solution**: Moved modal into `components/InviteModal.tsx` with props for data, state, and actions.
- **Problem**: Invite link section was showing in both 'invite' and 'manage visibility' modes.
- **Solution**: Added conditional rendering to only show invite link section when mode is 'invite'.

### How Fixes Were Implemented
- **Problem**: Inline JSX and styles increased complexity and duplicated logic.
- **Solution**: Pulled over the JSX for the modal, connection list, and invite link controls. Localized styles inside the component to avoid leaking style concerns to pages. Exposed callbacks: `onCreateInviteLink`, `onRegenerateInviteLink`, `onCopyInviteLink`, `onToggleInvitee`, `onUnhideUser`, `onClose`, `onConfirm`. Updated `app/toki-details.tsx` to render the new component and wire existing handlers.
- **Problem**: Invite link functionality was appearing in 'Manage Visibility' mode where it shouldn't be shown.
- **Solution**: Wrapped the entire invite link section (`inviteLinkSection`) in a conditional `{mode === 'invite' && (...)}` to only display when the modal is in invite mode, not when managing visibility.
