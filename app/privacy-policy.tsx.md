# File: privacy-policy.tsx

### Summary
Displays the public Privacy Policy screen using the same gradient layout, header with back button, and scrollable card styling as the Terms of Use page so legal copy is easy to read on mobile and web.

### Fixes Applied log
- problem: The app had no dedicated privacy policy screen, preventing users from viewing mandatory legal language inside the product.
- solution: Added a `privacy-policy.tsx` screen that mirrors `terms-of-use.tsx`, loads the approved policy content, and exposes it via a scrollable layout with consistent typography.
- problem: Policy text inside the screen still referenced February 2025 and had uneven indentation, making it appear outdated.
- solution: Synced the screen’s copy with the refreshed markdown source, using dash bullets for sub-points and updating the “Last updated” line to November 24, 2025.

### How Fixes Were Implemented
- Cloned the structural components from `terms-of-use.tsx` (LinearGradient wrapper, SafeAreaView, header/back button, ScrollView content card).
- Embedded the canonical privacy policy text from `privacy-policy-content.md` in a `PRIVACY_POLICY_CONTENT` constant and rendered it within the page body.
- Reused the same styling system (Inter fonts, card shadow, padding) to keep the legal experience visually consistent.
- Replaced the previous paragraph/bare-line formatting with structured dash bullets and updated metadata so the screen reflects the latest legal copy.
