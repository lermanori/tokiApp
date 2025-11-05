# File: index.ts

### Summary
Main Express server entrypoint. Configures security (Helmet), CORS, parsing, static asset serving (uploads and admin panel), API routes, WebSocket server, and error handlers.

### Fixes Applied log
- problem: Admin page blocked Google Fonts by CSP, breaking external stylesheet load.
- solution: Allowed `https://fonts.googleapis.com` in `style-src`/`style-src-elem` and `https://fonts.gstatic.com` in `font-src`.
- problem: Admin CSS under `/admin/static/...` returned JSON 500/404 and wrong MIME type.
- solution: Serve the entire admin build directory under `/admin` so all assets resolve correctly.
 - problem: CORS middleware intercepted static admin asset requests causing 500 JSON responses.
 - solution: Scope CORS to `/api` routes only and implement a strict allowlist including same deploy domains.

### How Fixes Were Implemented
- Updated Helmet configuration to include:
  - `styleSrc` and `styleSrcElem`: `"https://fonts.googleapis.com"`
  - `fontSrc`: `"https://fonts.gstatic.com"`, plus `data:` for inlined fonts if needed
- Replaced `app.use('/admin/static', express.static(path.join(adminBuildPath, 'static')))` with `app.use('/admin', express.static(adminBuildPath))` to expose the full admin build (including `index.html` and `static` assets) at `/admin`.
 - Limited CORS to API routes via `corsMiddleware` and an `origin` allowlist (localhost, Netlify, toki-app.com, Railway domains). Added `/favicon.ico` route to serve admin build favicon.
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
- problem: Push notification routes not registered in server.
- solution: Imported `pushRoutes` and added `app.use('/api/push', corsMiddleware, pushRoutes);` to expose token registration and test endpoints.
- solution:
  - Imported `./routes/push` as `pushRoutes`.
  - Mounted routes at `/api/push` with CORS middleware.
  - Enables client to register/unregister tokens and send test notifications.


