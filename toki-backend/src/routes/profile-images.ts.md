# File: toki-backend/src/routes/profile-images.ts

### Summary
Profile image upload/remove/info endpoints. Database updates and verification logs are now debug-only.

### Fixes Applied log
- problem: Success and verification logs added noise in normal operation.
- solution: Demoted success/verification to `debug`, kept Cloudinary deletion failures at `warn`, errors at `error`.

### How Fixes Were Implemented
- Imported `utils/logger` and replaced `console.log` with `logger.debug` for successes.
- Replaced `console.warn` with `logger.warn` and `console.error` with `logger.error`.


