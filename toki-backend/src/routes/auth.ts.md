# File: auth.ts (Login Endpoint Fix)

### Summary
Fixed authentication token issue where users who needed to accept terms couldn't call the `/accept-terms` endpoint because they weren't issued tokens during login.

### Fixes Applied log
- problem: Login endpoint returned `tokens: null` for users needing to accept terms, causing "Please provide a valid authentication token" error when trying to call `/accept-terms`
- solution: Modified login endpoint to always generate and return tokens, even when `requiresTermsAcceptance: true`
- solution: Tokens are still short-lived, and protected routes can still check terms acceptance separately if needed

### How Fixes Were Implemented
- problem: Chicken-and-egg problem - need tokens to accept terms, but weren't issuing tokens until terms accepted
- solution: Moved `generateTokenPair()` call before the terms acceptance check
- solution: Now tokens are always issued during successful login, allowing `/accept-terms` to authenticate the user
- solution: Updated AuthResponse TypeScript interface to reflect that tokens are no longer nullable
- solution: This is secure because tokens are short-lived and the important restriction is on accessing app features, not on accepting terms
