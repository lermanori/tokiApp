# File: toki-backend/src/utils/logger.ts

### Summary
Lightweight backend logger with levels (`error`, `warn`, `info`, `debug`) to keep logs concise in dev and production. Defaults to `warn` unless overridden via `LOG_LEVEL`.

### Fixes Applied log
- problem: Backend logs were noisy (payload dumps, timestamp spam, frequent socket room updates).
- solution: Introduced a centralized logger with levels and refactored hot spots to use it.

### How Fixes Were Implemented
- Created `logger` that gates output by level; level is controlled by `process.env.LOG_LEVEL`.
- Replaced raw `console.*` in socket server and routes with `logger.*`, demoting verbose logs to `debug` and keeping errors/warnings.
- Standardized info-level messages to concise event/room markers; payloads moved to `debug`.


