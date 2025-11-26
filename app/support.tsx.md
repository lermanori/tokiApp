# File: support.tsx

### Summary
Public-facing Support screen with the same gradient layout and scrollable card treatment used on other legal pages so users can quickly find Toki’s help contact info.

### Fixes Applied log
- problem: There was no `/support` route or screen in the app, so users had no in-app reference for contacting Toki.
- solution: Added a `support.tsx` page that mirrors the existing legal layout and surfaces the official support email address.

### How Fixes Were Implemented
- Duplicated the layout from `privacy-policy.tsx`, including LinearGradient background, SafeAreaView wrapper, header with back button, and scrollable card container.
- Rendered the supplied support copy inside a `SUPPORT_CONTENT` string.
- Styled typography with slightly larger font size/line height for better readability on short content.
