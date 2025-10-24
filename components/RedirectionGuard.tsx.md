# File: RedirectionGuard.tsx

### Summary
This file contains a RedirectionGuard component that handles post-login redirection logic. It ensures users are properly redirected to their intended destination after authentication and clears the redirection state only when the target page is reached.

### Fixes Applied log
- problem: Race condition in redirection logic causing inconsistent behavior
- solution: Created a dedicated RedirectionGuard component that monitors navigation state and only clears redirection when target page is reached

### How Fixes Were Implemented
- problem: Redirection state was being cleared immediately after router.replace(), causing race conditions
- solution: Moved redirection clearing logic to a separate component that monitors the current route and only clears state when the user actually reaches the target page
- problem: Inconsistent redirection behavior between different navigation scenarios
- solution: Added proper path matching logic to detect when the user has reached their intended destination before clearing the redirection state
