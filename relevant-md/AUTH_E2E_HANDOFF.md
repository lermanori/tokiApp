# Auth E2E Handoff

Date: 2026-05-18

## TL;DR

All 5 auth tests in [e2e/auth-entry-flow.e2e.js](/Users/orilerman/Desktop/tokiApp/e2e/auth-entry-flow.e2e.js) pass reliably against the local backend.

```
✓ allows regular login from an unauthenticated launch
✓ bypasses login on relaunch when valid credentials already exist
✓ refreshes the session on relaunch when the access token is expired but refresh is still valid
✓ lets a guest view exMap until the first protected click sends them to login
✓ lets a guest view toki details until the first protected click sends them to login
```

## How to run

### Backend

```bash
cd toki-backend && ENABLE_E2E_TEST_ROUTES=1 npm run dev
```

Without `ENABLE_E2E_TEST_ROUTES=1` the `/api/test/*` routes are not mounted, and the refresh-on-relaunch test will fail.

### Build the iOS release app pointed at local backend

```bash
EXPO_PUBLIC_E2E_BACKEND_URL=http://localhost:3002 npm run detox:build:ios
```

`EXPO_PUBLIC_*` env vars are inlined at build time by Expo. The bundle then ignores the normal Railway production URL and talks to your machine's `localhost:3002`. The flag is only baked in when the env var is set — production builds without the var work exactly as before.

### Run

```bash
# All 5
npx detox test --config-path ./detox.config.js --configuration ios.sim.release \
  --device-name "iPhone 17e" --cleanup e2e/auth-entry-flow.e2e.js

# Just one
npx detox test --config-path ./detox.config.js --configuration ios.sim.release \
  --device-name "iPhone 17e" --cleanup e2e/auth-entry-flow.e2e.js \
  -t "<test name>"
```

### Prerequisites

- `test@example.com` / `password123` exists in your local postgres (it does on the dev machine where these were authored).
- Simulator named `iPhone 17e` exists. Override default in `detox.config.js` or pass `DETOX_DEVICE` env var.
- At least one toki in local DB at lat 32.0853, lon 34.7818 (test #5 fetches a real toki dynamically via `/api/tokis/nearby`).

## Architecture decisions

### Why the app talks to local backend, not Railway prod

Test #3 (refresh on relaunch) needs to invalidate the user's access token server-side, then verify the app refreshes on relaunch. That requires test-only backend routes that must NOT exist in production. Solution:

- Test-only routes (`toki-backend/src/routes/test.ts`) gated by `ENABLE_E2E_TEST_ROUTES=1`
- App URL pointed at local backend via `EXPO_PUBLIC_E2E_BACKEND_URL` at build time (services/config.ts:79)
- The previously-attempted iOS native launch-args bridge (`NativeModules.TokiLaunchArgs`) is a dead end — it was never actually implemented. `services/launchArgs.ts` reads from a module that does not exist, so launch-arg-based URL override has never worked. Avoid going down that path.

### Why `device.tap({x, y})` instead of `element.tap()` in test #5

After scrolling the Report button into view, no Detox element-based tap (`tap()`, `multiTap()`, `longPress()`, by-text, with `disableSynchronization`) fired the TouchableOpacity's `onPress` handler. The touch reached the view (no error) but the handler never ran. This is a known RN-new-architecture + Detox issue tracked in [facebook/react-native#36710](https://github.com/facebook/react-native/issues/36710) and similar Detox issues — `onPressIn`/`onPressOut` fire but `onPress` doesn't.

Workaround used in test #5:

1. Swipe the ScrollView until `waitFor(...).toBeVisible()` succeeds for the button
2. Wait ~200ms for scroll deceleration to settle
3. Read the button's real screen-space frame via `element(...).getAttributes().frame`
4. Send a raw simulator tap via `device.tap({ x, y })` at the frame's center

`device.tap()` bypasses Detox's element-based touch synthesizer and goes through the same path that manual user taps use, so `onPress` fires reliably.

### Why the "cold launch" tests use a flexible `loginThroughUi()`

After `delete: true`, the app races between rendering `/login` and `/(tabs)/exMap` with the "Login to watch Tokis map" guest overlay. Either can win on any given run. The new helper [`ensureOnLoginScreen()`](/Users/orilerman/Desktop/tokiApp/e2e/auth-entry-flow.e2e.js) waits for *either* `email-input` OR `guest-overlay-login-button` and taps the overlay if it appears. Without this the test is 50/50 flaky on cold launches.

## What changed (this branch, uncommitted)

### Backend (intentional, ship as-is)

- `toki-backend/src/lib/tokenRevocation.ts` — new in-memory revocation store. User-level (`revokedBeforeByUserId`). Refresh tokens unaffected.
- `toki-backend/src/middleware/auth.ts` — checks revocation in `authenticateToken`. Returns 401 if the token was issued before the user's recorded revocation time.
- `toki-backend/src/routes/test.ts` — new test-only routes (env-gated).
- `toki-backend/src/index.ts` — mounts `/api/test` only when `ENABLE_E2E_TEST_ROUTES === '1'`. Logs a warning at startup if enabled.

Currently exposed test route:
```
POST /api/test/auth/expire-access-tokens-for-user
Body: { "email": "..." }
Effect: marks all access tokens issued before now() invalid for that user.
        Refresh token still works → app refreshes → recovers.
```

### Frontend

- `services/config.ts` — adds `BUILD_TIME_E2E_BACKEND_URL` from `process.env.EXPO_PUBLIC_E2E_BACKEND_URL`. When unset, behaves identically to before.
- `app/_layout.tsx` — removed the forced `/toki-details → /login` redirect block for guests. Anonymous landing handles guest viewing.
- `app/toki-details.tsx` — removed the in-component forced-redirect for guests. The screen uses `getPublicToki` when there's no token, so guests can view the page.
- `app/toki-details.tsx` — added `testID="toki-details-scroll"` to the ScrollView for Detox.
- `app/(tabs)/exMap.tsx` — added `testID="guest-overlay-login-button"` to the guest overlay's Login button.

### Test files

- `e2e/auth-entry-flow.e2e.js` — all 5 tests, see TL;DR.
  - New `ensureOnLoginScreen()` helper handles the cold-launch race.
  - Test #3 uses the backend revoke endpoint (real refresh flow).
  - Test #5 uses raw screen-coord `device.tap()` after scrolling.

### Reverted / unused

- `e2e/deep-link-auth-routing.e2e.js` (untracked) — superseded by `auth-entry-flow.e2e.js`. Can be deleted.
- The native `TokiLaunchArgs` bridge mentioned in `services/launchArgs.ts` — does not exist; do not try to use launch args for runtime config.

## Known limitations / next steps

1. **`MockAuthServer` is dead weight.** The mock server in `e2e/support/mockAuthServer.js` does nothing useful in `auth-entry-flow.e2e.js` (the launch-args bridge that would route the app to it doesn't exist). Tests now hit the real local backend. Consider removing the mock from this spec entirely.

2. **Other e2e specs are broken.** `login-session.e2e.js`, `version-gate.e2e.js`, `nearby-analytics.e2e.js`, `deep-link-auth-routing.e2e.js`, `boost-center.e2e.js` all have failures, largely from the same two underlying issues: (a) mock server doesn't actually reach the app, (b) the cold-launch race we fixed for `auth-entry-flow.e2e.js`. Apply the same pattern (real backend, flexible `loginThroughUi`, real toki IDs) if you want to fix them.

3. **Test #3 dependency**: only works when local backend is running with `ENABLE_E2E_TEST_ROUTES=1` AND the app build has `EXPO_PUBLIC_E2E_BACKEND_URL`. If the env var is omitted at build time, the app will hit Railway prod and the test will fail (revoke endpoint hits a different backend than the app uses).

4. **CI integration** is not done. To integrate, CI would need to:
   - Spin up postgres + run migrations + seed `test@example.com`
   - Start `toki-backend` with `ENABLE_E2E_TEST_ROUTES=1`
   - Build with `EXPO_PUBLIC_E2E_BACKEND_URL=http://localhost:3002`
   - Run detox

5. **`detox.config.js` default device** was bumped from `iPhone 16` → `iPhone 17` so `npm run detox:build:ios` works without a `DETOX_DEVICE` override. If your laptop only has `iPhone 16`, set `DETOX_DEVICE=iPhone\ 16` or revert.

## File index

- [e2e/auth-entry-flow.e2e.js](/Users/orilerman/Desktop/tokiApp/e2e/auth-entry-flow.e2e.js)
- [services/config.ts](/Users/orilerman/Desktop/tokiApp/services/config.ts)
- [toki-backend/src/lib/tokenRevocation.ts](/Users/orilerman/Desktop/tokiApp/toki-backend/src/lib/tokenRevocation.ts)
- [toki-backend/src/middleware/auth.ts](/Users/orilerman/Desktop/tokiApp/toki-backend/src/middleware/auth.ts)
- [toki-backend/src/routes/test.ts](/Users/orilerman/Desktop/tokiApp/toki-backend/src/routes/test.ts)
- [toki-backend/src/index.ts](/Users/orilerman/Desktop/tokiApp/toki-backend/src/index.ts)
- [app/_layout.tsx](/Users/orilerman/Desktop/tokiApp/app/_layout.tsx)
- [app/toki-details.tsx](/Users/orilerman/Desktop/tokiApp/app/toki-details.tsx)
- [app/(tabs)/exMap.tsx](/Users/orilerman/Desktop/tokiApp/app/(tabs)/exMap.tsx)
- [detox.config.js](/Users/orilerman/Desktop/tokiApp/detox.config.js)
