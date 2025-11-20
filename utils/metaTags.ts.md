# File: metaTags.ts

### Summary
TypeScript interfaces for meta tag data used in SEO and social sharing.

### Fixes Applied log
- problem: TokiMetaData interface doesn't support unlimited max attendees or autoApprove
- solution: Updated TokiMetaData interface to allow maxAttendees as number | null and added autoApprove field

### How Fixes Were Implemented
- Updated TokiMetaData interface: maxAttendees from number | undefined to number | null | undefined, added autoApprove?: boolean field

