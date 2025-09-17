# File: toki-backend/src/routes/auth.ts

### Summary
Authentication routes. Verbose debug prints on `/me` and search endpoints are now gated behind debug.

### Fixes Applied log
- problem: `/me` and search emitted many query/result logs each request.
- solution: Moved detailed prints to `debug`. Kept errors as errors.

### How Fixes Were Implemented
- Imported `utils/logger` and replaced noisy `console.log` with `logger.debug`.
- Converted `console.error` to `logger.error` consistently.


