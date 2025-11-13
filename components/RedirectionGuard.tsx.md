# File: RedirectionGuard.tsx

### Summary
This file contains a RedirectionGuard component that handles post-login redirection logic. It ensures users are properly redirected to their intended destination after authentication and clears the redirection state only when the target page is reached.

### Fixes Applied log
- problem: Race condition in redirection logic causing inconsistent behavior
- solution: Created a dedicated RedirectionGuard component that monitors navigation state and only clears redirection when target page is reached
- problem: Debugging deep linking issues - need to track when and why redirects to explore page happen instead of toki-details
- solution: Added comprehensive logging to track redirection state, returnTo path, returnParams, and conditions that prevent redirection

### How Fixes Were Implemented
- problem: Redirection state was being cleared immediately after router.replace(), causing race conditions
- solution: Moved redirection clearing logic to a separate component that monitors the current route and only clears state when the user actually reaches the target page
- problem: Inconsistent redirection behavior between different navigation scenarios
- solution: Added proper path matching logic to detect when the user has reached their intended destination before clearing the redirection state
- problem: Need visibility into redirection flow to debug why share links redirect to explore instead of toki-details
- solution: Enhanced logging to show:
  - Current path and segments
  - ReturnTo path and parameters
  - Whether conditions are met for redirection
  - Final redirect URL being used
  - Why redirection might not be happening (conditions not met)
- **Problem**: After login with `returnTo=join&code=6I69YTSU`, the redirection was constructing `join?code=6I69YTSU` instead of `/join/6I69YTSU`, causing "This screen doesn't exist" error.
- **Solution**: Added special handling for join route redirection to construct `/join/[code]` path when `returnTo=join` and `code` is in `returnParams`, extracting the code from params and building the correct path format.
