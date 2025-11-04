# File: Login.tsx

### Summary
Admin login form component. Submits credentials to `/api/admin/login`, stores the received token, and transitions to the admin dashboard UI.

### Fixes Applied log
- problem: After successful login, the app stayed on the login page due to separate `useAdminAuth` instances not sharing auth state.
- solution: Trigger a full reload to `/admin/` after successful login so the app-level auth check re-reads the token and route guards render the dashboard.
 - problem: TypeScript error TS6133 due to unused `navigate` variable after switching to full reload.
 - solution: Removed `useNavigate` import and the unused `navigate` reference.

### How Fixes Were Implemented
- Replaced client-side `navigate('/')` with `window.location.replace('/admin/')` in the submit handler. This ensures `App` runs `checkAuth()` on reload, reads `localStorage.admin_token`, sets `isAuthenticated=true`, and routes to the dashboard.

