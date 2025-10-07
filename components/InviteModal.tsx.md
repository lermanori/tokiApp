# File: InviteModal.tsx

### Summary
Reusable modal for inviting connections and managing visibility for a Toki. Extracted from `app/toki-details.tsx` to simplify that screen and make the modal reusable.

### Fixes Applied log
-problem: Invite modal lived inline in `toki-details`, making it large and harder to maintain.
-solution: Moved modal into `components/InviteModal.tsx` with props for data, state, and actions.

### How Fixes Were Implemented
-problem: Inline JSX and styles increased complexity and duplicated logic.
-solution: Pulled over the JSX for the modal, connection list, and invite link controls. Localized styles inside the component to avoid leaking style concerns to pages. Exposed callbacks: `onCreateInviteLink`, `onRegenerateInviteLink`, `onCopyInviteLink`, `onToggleInvitee`, `onUnhideUser`, `onClose`, `onConfirm`. Updated `app/toki-details.tsx` to render the new component and wire existing handlers.
