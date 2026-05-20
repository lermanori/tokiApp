# Version Gate E2E Handoff

Date: 2026-05-18
Predecessor: [E2E_SPECS_FIX_HANDOFF.md](E2E_SPECS_FIX_HANDOFF.md) — items #1 (nearby-analytics) and #3 (boost-center) are landed (commit `ecf4b41`). This handoff covers item #4 (`version-gate.e2e.js`).

## Status: RESOLVED (2026-05-18) — by a different path than originally proposed

The spec is **green** as of this date. The plan below (real-backend override route + evaluator refactor) was **not executed**. Diagnosing the failure revealed the actual root cause was a missing native module — fixing that made the existing `MockAuthServer`-based spec work as originally intended.

### Root cause

`services/launchArgs.ts` referenced `NativeModules.TokiLaunchArgs.launchArgs`, but no such native module exists in the codebase (no `.swift`/`.m`/`.h`/podspec for it anywhere). `getLaunchArg()` therefore always returned `undefined`, and the `TOKI_E2E_API_URL` launch arg the `MockAuthServer` set was never read by the app. Compounding this, `getBackendUrl()` in [services/config.ts](../services/config.ts) checked the build-time `EXPO_PUBLIC_E2E_BACKEND_URL` *before* the runtime override, so even a working runtime override would have been ignored.

Net effect: every Detox spec using `MockAuthServer` was secretly talking to whichever backend `EXPO_PUBLIC_E2E_BACKEND_URL` pointed to at build time. `boost-center.e2e.js` worked only because it set `TOKI_E2E_API_URL` to the same URL the build-time env already used — coincidence, not function.

### Fix

- Installed [`react-native-launch-arguments`](https://github.com/iamolegga/react-native-launch-arguments) (standard community package, no custom native code needed). Expo's autolinker (`expo-modules-autolinking react-native-config`, the `config_command` used by `use_native_modules!` in the Podfile) picks the package up automatically from `package.json` — no Podfile edit or config plugin needed. (Verified by running `pod install` with no manual entry; `react-native-launch-arguments` still appears in `Podfile.lock`.)
- Rewrote [services/launchArgs.ts](../services/launchArgs.ts) to use `LaunchArguments.value()`.
- Flipped precedence in [services/config.ts](../services/config.ts) so runtime `TOKI_E2E_API_URL` wins over the build-time `EXPO_PUBLIC_E2E_BACKEND_URL`.
- Updated the `supported` test in [e2e/version-gate.e2e.js](../e2e/version-gate.e2e.js) to poll for either `login-button` or `guest-overlay-login-button` (cold-launch race), per the boost-center pattern.

### Implication for the predecessor handoff

The recommendation in [E2E_SPECS_FIX_HANDOFF.md](E2E_SPECS_FIX_HANDOFF.md) to remove `MockAuthServer` should be revisited. It was based on the assumption that the launchArgs-based mock pattern was awkward/broken. Now that it works, `MockAuthServer` is a legitimate tool for specs that don't need real backend state (no auth, no DB rows, no sessions). Version-gate is exactly that case.

The plan below is preserved for historical reference but should not be executed.

---

## Goal

Port `e2e/version-gate.e2e.js` to the real-backend pattern so it runs against `http://127.0.0.1:3002` instead of `MockAuthServer`. The spec has three tests, all of which need a way to *force* a `BackendVersionPolicy` response from the real backend.

## Current state (`e2e/version-gate.e2e.js`)

Three tests, each `delete: true` cold-launches with `launchArgs: server.getLaunchArgs()` and sets a mock policy first:

1. `allows supported clients to reach the login screen` — `setVersionPolicy('supported')` → expects `login-button`, no `version-gate-screen`.
2. `blocks unsupported clients behind the update screen` — `setVersionPolicy('requires_store')` → expects `version-gate-screen` + text `'Update required'`.
3. `shows maintenance mode before the app tree mounts` — `setVersionPolicy('maintenance')` → expects `version-gate-screen` + text `'Maintenance'`.

The testID `version-gate-screen` **already exists** at [components/version/VersionGateScreen.tsx:33](../components/version/VersionGateScreen.tsx:33) — the predecessor handoff was wrong about it being missing. No app-side testID work needed.

## What the backend needs (new code)

The version-policy endpoint is `GET /api/mobile/bootstrap` ([toki-backend/src/routes/mobile.ts:28](../toki-backend/src/routes/mobile.ts:28)). It calls `evaluateVersionPolicy(client)` ([toki-backend/src/services/versionPolicyService.ts:170](../toki-backend/src/services/versionPolicyService.ts:170)) which inspects request headers to decide a `BackendSupportState`. To force a state from a test, we need a side-channel override that the evaluator checks before its normal logic.

### Two new pieces (template: [toki-backend/src/lib/tokenRevocation.ts](../toki-backend/src/lib/tokenRevocation.ts))

**1. In-memory override store: `toki-backend/src/lib/versionPolicyOverride.ts`**

```ts
import type { BackendSupportState } from '../services/versionPolicyService';

let override: { state: BackendSupportState } | null = null;

export const setVersionPolicyOverride = (state: BackendSupportState | null): void => {
  override = state ? { state } : null;
};

export const getVersionPolicyOverride = (): { state: BackendSupportState } | null => override;
```

**2. New test-only route in [toki-backend/src/routes/test.ts](../toki-backend/src/routes/test.ts)**

```ts
// POST /api/test/version-policy/override   body: { state: 'supported' | 'requires_store' | 'maintenance' | null }
// DELETE /api/test/version-policy/override  (clears it)
```

Mirror the env-gating already in place (`ENABLE_E2E_TEST_ROUTES=1`). Validate `state` against the union in `BackendSupportState` and return `{ success: true }`.

### Wire override into the evaluator

In [toki-backend/src/services/versionPolicyService.ts](../toki-backend/src/services/versionPolicyService.ts), at the top of `evaluateVersionPolicy`:

```ts
const override = getVersionPolicyOverride();
if (override) {
  return buildPolicyForState(override.state, client);
}
```

The cleanest implementation factors the existing per-state branches out into a `buildPolicyForState(state, client)` helper. The strings to match the spec assertions:

- `'requires_store'` → `support.title = 'Update required'`
- `'maintenance'` → `support.title = 'Maintenance'` AND `maintenance.active = true`
- `'supported'` → no override applied to UI (passes through to login)

The mock factory at [e2e/support/mockAuthServer.js:362](../e2e/support/mockAuthServer.js:362) (`createVersionPolicy`) is the source of truth for what the app currently expects — copy that shape into the backend helper. Pay attention to:
- `support.delivery` ('store' for `requires_store`, 'none' otherwise)
- `maintenance.active === true` *only* for `maintenance`
- `policyVersion`, `ttlSeconds`, `validUntil` — keep stable defaults

## What the spec needs (rewrite)

Drop `MockAuthServer` entirely. Each test:

1. `POST /api/test/version-policy/override` with the desired state (or skip for the `'supported'` case).
2. `device.launchApp({ newInstance: true, delete: true })` — no `launchArgs`, no `url`.
3. Assert on `version-gate-screen` / `'Update required'` / `'Maintenance'` / `login-button` as today.
4. `afterEach`: `DELETE /api/test/version-policy/override` so the next test starts clean.

Reuse the `BACKEND_URL` constant pattern from [e2e/auth-entry-flow.e2e.js:8](../e2e/auth-entry-flow.e2e.js:8):
```js
const BACKEND_URL = process.env.TOKI_E2E_BACKEND_URL || 'http://127.0.0.1:3002';
```

The version gate wins the race before the login or guest-overlay rendering, so `ensureOnLoginScreen()` is **not** needed for the `'requires_store'` / `'maintenance'` tests. For the `'supported'` test, follow the boost-center pattern: poll for `login-button` or `guest-overlay-login-button` to handle the cold-launch race.

## How to run

Same as the existing pattern. Backend must be started with the test-routes flag:

```bash
cd toki-backend && ENABLE_E2E_TEST_ROUTES=1 npm run dev
```

Build once (already required for boost-center):

```bash
EXPO_PUBLIC_E2E_BACKEND_URL=http://localhost:3002 npm run detox:build:ios
```

Run only this spec:

```bash
npx detox test --config-path ./detox.config.js --configuration ios.sim.release \
  --device-name "iPhone 17e" --cleanup e2e/version-gate.e2e.js
```

## Gotchas surfaced by the boost-center work

- Detox's `system.element(by.system.label(...))` for iOS system alerts was unreliable for us. If a system prompt appears during this spec (it shouldn't — there's no login in `'requires_store'`/`'maintenance'` paths), prefer suppressing at the source (see the `EXPO_PUBLIC_E2E_BACKEND_URL` gate in [app/login.tsx:441](../app/login.tsx:441)) over runtime dismissal.
- `toBeVisible()` requires ≥75% (or 100% for actions) of the view to be on-screen. If a `version-gate-screen` assertion ever flakes, fall back to `toExist()` since the gate is full-screen anyway.
- Keep Detox synchronization enabled for this spec — there is no warm deep-link sequence that benefits from disabling it, and the gate's UI is static once rendered.

## Cleanup after green

- The version-gate spec is the last consumer of `MockAuthServer` after this lands *except* for `deep-link-auth-routing.e2e.js`. Decide on that spec (rewrite or delete) before removing [e2e/support/mockAuthServer.js](../e2e/support/mockAuthServer.js). Verify with:
  ```bash
  grep -rln "mockAuthServer\|MockAuthServer" e2e/
  ```
- Update [E2E_SPECS_FIX_HANDOFF.md](E2E_SPECS_FIX_HANDOFF.md) "Backend changes likely required" once the override route lands.

## File index

- [e2e/version-gate.e2e.js](../e2e/version-gate.e2e.js) — to rewrite
- [e2e/auth-entry-flow.e2e.js](../e2e/auth-entry-flow.e2e.js) — reference pattern
- [e2e/boost-center.e2e.js](../e2e/boost-center.e2e.js) — reference for the test-only-route pattern
- [e2e/support/mockAuthServer.js:362](../e2e/support/mockAuthServer.js:362) — `createVersionPolicy` shape to port
- [toki-backend/src/routes/test.ts](../toki-backend/src/routes/test.ts) — add `POST/DELETE /api/test/version-policy/override`
- [toki-backend/src/routes/mobile.ts:28](../toki-backend/src/routes/mobile.ts:28) — bootstrap endpoint
- [toki-backend/src/services/versionPolicyService.ts:170](../toki-backend/src/services/versionPolicyService.ts:170) — `evaluateVersionPolicy`, wire override here
- [toki-backend/src/lib/tokenRevocation.ts](../toki-backend/src/lib/tokenRevocation.ts) — template for the override module
- [components/version/VersionGateScreen.tsx:33](../components/version/VersionGateScreen.tsx:33) — gate component (testID already present)
