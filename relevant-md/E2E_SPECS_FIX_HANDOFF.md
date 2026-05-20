# E2E Specs Fix Handoff

Date: 2026-05-18
Predecessor: [AUTH_E2E_HANDOFF.md](AUTH_E2E_HANDOFF.md)

## Status: RESOLVED (2026-05-18)

Per-spec outcomes:

| Item | Outcome |
|---|---|
| #1 `nearby-analytics.e2e.js` migration | ✅ Done, commit `ecf4b41`. |
| #2 `login-session.e2e.js` migration | ✅ Disqualified — file no longer exists; coverage rolled into `auth-entry-flow.e2e.js`. |
| #3 `boost-center.e2e.js` migration | ✅ Done, commit `ecf4b41`. Stabilized further (1s settle after scroll) in `4d0140d`. |
| #4 `version-gate.e2e.js` migration | ✅ Resolved via a different path: the real root cause was a missing native launchArgs module, not a flawed mock pattern. Installed `react-native-launch-arguments` (commit `b8cbb29`); the existing mock-based spec now passes as-is. The "build a real-backend override route" plan below was not executed and is not needed. See [VERSION_GATE_E2E_HANDOFF.md](VERSION_GATE_E2E_HANDOFF.md). |
| #5 `deep-link-auth-routing.e2e.js` rewrite/delete | ✅ Deleted; replaced by `e2e/deep-link-auth.e2e.js` covering the real user journey (WhatsApp-style deep link → toki details, with all four auth states). Commit `a70a16c`. |
| Backend: `POST /api/test/version-policy/override` | Disqualified — never built; not needed once launchArgs worked. |
| Backend: verify `/api/analytics/nearby-request-count` shape | ✅ Implicit — spec passes. |
| Backend: verify `/boosts/tiers` shape | ✅ Implicit — spec passes. |
| Cleanup: delete `mockAuthServer.js` | Disqualified — still used by `version-gate.e2e.js` (legitimate, stateless test fit). Decision documented in `VERSION_GATE_E2E_HANDOFF.md`. |
| Cleanup: update `AUTH_E2E_HANDOFF.md` known limitations | ✅ Updated in this same series of commits. |

Full Detox suite is now 5/5 green (15/15 tests).

The original plan is preserved below for historical reference but should not be executed.

---

## Goal

Bring the remaining Detox specs to the same "real local backend + flexible cold-launch" pattern that `e2e/auth-entry-flow.e2e.js` uses, so they actually run. Most of them are broken because they still talk to `MockAuthServer` via a launch-arg bridge that was never implemented.

## The reference pattern (from auth-entry-flow.e2e.js)

1. **No `MockAuthServer`.** Talk to the real local backend at `http://127.0.0.1:3002`.
2. **No `launchArgs` for URL routing.** The app reads its backend URL from the build-time env var `EXPO_PUBLIC_E2E_BACKEND_URL` baked in by `npm run detox:build:ios`.
3. **`ensureOnLoginScreen()` helper** — after `delete: true`, the app races between rendering `/login` and the guest exMap overlay. Wait for *either* `email-input` OR `guest-overlay-login-button` and tap the overlay if it appears.
4. **Real tokis from `/api/tokis/nearby`** — don't hardcode IDs that won't exist in a fresh local DB.
5. **`device.tap({x, y})` fallback** — when an element-based tap fires `onPressIn` but not `onPress` (RN new-arch + Detox bug). See test #5 in auth-entry-flow for the pattern.
6. **Backend test routes** — env-gated by `ENABLE_E2E_TEST_ROUTES=1`, mounted under `/api/test/...`. Add new ones to `toki-backend/src/routes/test.ts`.

## How to run (assumes you already built per AUTH_E2E_HANDOFF)

```bash
# Backend with test routes
cd toki-backend && ENABLE_E2E_TEST_ROUTES=1 npm run dev

# Build once with backend override baked in
EXPO_PUBLIC_E2E_BACKEND_URL=http://localhost:3002 npm run detox:build:ios

# Run a single spec
npx detox test --config-path ./detox.config.js --configuration ios.sim.release \
  --device-name "iPhone 17e" --cleanup e2e/<spec-name>.e2e.js
```

## Per-spec work

Ordered easiest → hardest. Each block is a self-contained task.

### 1. `nearby-analytics.e2e.js` — Small

What it tests: nearby-request count metric increments after login.

What's wrong:
- Direct `email-input` waitFor with no overlay fallback → flaky on cold launch.
- Uses `/api/analytics/nearby-request-count` — verify endpoint exists in `toki-backend/src/routes/`.

Fix:
- Copy `ensureOnLoginScreen()` from `auth-entry-flow.e2e.js` and call it before `loginThroughUi()`.
- If the analytics endpoint doesn't exist, either add it to a real route or move the assertion to whatever metric the backend actually exposes.

### 2. `login-session.e2e.js` — Small

What it tests: session restore & token refresh lifecycle.

What's wrong:
- Imports `MockAuthServer` and passes `launchArgs` for backend routing — both dead weight.
- Direct `email-input` waitFor, no overlay fallback.

Fix:
- Drop `MockAuthServer` import and all `server.start/stop/reset/setScenario` calls (mirror commit `3d7e565` on `auth-entry-flow.e2e.js`).
- Remove `launchArgs` from `device.launchApp(...)`.
- Add `ensureOnLoginScreen()`.
- If the spec needs to simulate access-token expiry on relaunch, use the existing `POST /api/test/auth/expire-access-tokens-for-user` route (see commit `1a3c247`).

### 3. `boost-center.e2e.js` (untracked) — Small

What it tests: boost tier display + payment request flow.

Already well-architected: talks to real backend, creates a real toki, no MockAuthServer.

What's wrong:
- Calls `/boosts/tiers` (line 109) — verify the endpoint exists in `toki-backend/src/routes/boosts.ts` and returns objects with `id` + `name`.

Fix:
- Run the spec as-is and address whatever the tier-card assertion surfaces. Likely a one-line endpoint-path or field-name fix.

### 4. `version-gate.e2e.js` — Medium

What it tests: bootstrap version policy blocking + maintenance mode gating.

What's wrong:
- Imports `MockAuthServer` and passes `launchArgs`.
- References `testID="version-gate-screen"` which doesn't exist in the app.
- The whole spec depends on being able to *force* a version mismatch — currently the mock did that.

Fix:
- Add `testID="version-gate-screen"` to whichever component renders the gate (search `versionGate`, `forceUpdate`, `maintenanceMode` in `app/` and `components/`).
- Drop `MockAuthServer` + `launchArgs`.
- Add a new test-only route in `toki-backend/src/routes/test.ts` to force a version-policy response, e.g.:
  ```
  POST /api/test/version-policy/override
  Body: { mode: "force_update" | "maintenance" | "ok", minBuild?: number }
  ```
  Then have the version-policy endpoint check the override on read (in-memory, same pattern as `tokenRevocation.ts`). Clear it in `afterEach`.
- Add `ensureOnLoginScreen()` for consistency, even though the gate should win the race.

### 5. `deep-link-auth-routing.e2e.js` (untracked) — Large

What it tests: deep-link routing with token refresh and session expiry.

What's wrong:
- Imports `MockAuthServer` and passes `launchArgs`.
- Hardcodes toki ID `'deep-link-auth-routing-toki'` — won't exist in a fresh DB.
- Calls `MockAuthServer.getMockTokiTitle()` (lines 53, 69, 87) — there is no real-backend equivalent.

Fix:
- Drop `MockAuthServer` + `launchArgs`.
- Replace hardcoded toki ID with a `/api/tokis/nearby` fetch (mirror test #5 in `auth-entry-flow.e2e.js`).
- Replace `getMockTokiTitle()` with the real toki's `title` field from the nearby fetch — assert on that text instead.
- For the session-expiry leg, reuse `POST /api/test/auth/expire-access-tokens-for-user`.
- Consider whether this spec still adds coverage beyond `auth-entry-flow.e2e.js`. The original handoff lists it as superseded; if the deep-link-specific assertions are already covered, the right move is to delete this file instead of fixing it.

## Backend changes likely required

Net-new test routes (add to `toki-backend/src/routes/test.ts`, follow `expire-access-tokens-for-user` as the template):

- `POST /api/test/version-policy/override` — for `version-gate.e2e.js`.

Possibly missing real routes (verify before assuming):

- `GET /api/analytics/nearby-request-count` (or whatever path nearby-analytics expects)
- `GET /boosts/tiers` shape (id + name fields)

## After fixes

- Delete `e2e/support/mockAuthServer.js` once no spec imports it. Verify with `grep -rln "mockAuthServer\|MockAuthServer" e2e/`.
- Update [AUTH_E2E_HANDOFF.md](AUTH_E2E_HANDOFF.md) "Known limitations" #1 and #2 to reflect what's been cleared.

## File index

- [e2e/auth-entry-flow.e2e.js](../e2e/auth-entry-flow.e2e.js) — reference pattern
- [e2e/login-session.e2e.js](../e2e/login-session.e2e.js)
- [e2e/version-gate.e2e.js](../e2e/version-gate.e2e.js)
- [e2e/nearby-analytics.e2e.js](../e2e/nearby-analytics.e2e.js)
- [e2e/deep-link-auth-routing.e2e.js](../e2e/deep-link-auth-routing.e2e.js) *(untracked)*
- [e2e/boost-center.e2e.js](../e2e/boost-center.e2e.js) *(untracked)*
- [e2e/support/mockAuthServer.js](../e2e/support/mockAuthServer.js) — delete after all specs are fixed
- [toki-backend/src/routes/test.ts](../toki-backend/src/routes/test.ts) — add new test-only routes here
- [toki-backend/src/lib/tokenRevocation.ts](../toki-backend/src/lib/tokenRevocation.ts) — template for new in-memory override stores
