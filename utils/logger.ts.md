# File: utils/logger.ts

### Summary
Frontend logger that gates `console.*` output by level (`error`, `warn`, `info`, `debug`). Initialized early so existing logs are filtered without refactors.

### Fixes Applied log
- problem: Excessive frontend logs (tokens, API calls, socket room ops) made dev console noisy.
- solution: Introduced centralized log level and changed noisy areas to use lower levels.

### How Fixes Were Implemented
- Patched `console.*` at import time; default level `warn` unless overridden by `EXPO_PUBLIC_LOG_LEVEL`.
- Adjusted `services/api.ts` and `services/socket.ts` to use `info` for lifecycle, `debug` for verbose details, `error` for failures.


