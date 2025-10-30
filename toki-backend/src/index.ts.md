### Summary
Express server setup and route registration for the Toki backend, including security, CORS, static assets, sockets, and API mounting.

### Fixes Applied log
- problem: New activity feature routes not exposed.
- solution: Registered `activityRoutes` at `/api/activity`.

### How Fixes Were Implemented
- Imported `./routes/activity` and added `app.use('/api/activity', activityRoutes);` alongside other route mounts.

# File: toki-backend/src/index.ts

### Summary
Main server and Socket.IO entrypoint. Now uses centralized logger and reduces verbose room membership logs.

### Fixes Applied log
- problem: Connection/join/leave logs cluttered the console.
- solution: Kept connect/disconnect at info; moved join/leave and member counts to debug; standardized startup logs at info.

### How Fixes Were Implemented
- Imported `utils/logger` and replaced `console.*` with `logger.*`.
- Demoted room membership details to `debug` while preserving key lifecycle messages.


