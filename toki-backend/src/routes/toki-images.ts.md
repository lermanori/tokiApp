# File: toki-backend/src/routes/toki-images.ts

### Summary
Toki image upload/delete/info endpoints. Success logs reduced; warnings/errors consistent.

### Fixes Applied log
- problem: Repeated success logs cluttered output; warnings/errors were inconsistent.
- solution: Demoted successes to `debug`, kept Cloudinary delete failures at `warn`, and standardized errors to `error`.

### How Fixes Were Implemented
- Imported `utils/logger`, replaced `console.*` with appropriate `logger.*` levels.


