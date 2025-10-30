### Feature Plan: Profile Activity Visibility + Show as member

**Date**: 2025-10-30

**Goal**: Let users display the public Tokis they are going to on their profile and control per-Toki visibility. Provide a "Show as member" preview on the profile tab.

---

### Scope
- **Owner profile (Profile tab)**: New "My Activity" horizontal list of upcoming/joined public Tokis with per-item hide/show, plus a "Show as member" preview toggle.
- **Public profile (`app/user-profile/[userId].tsx`)**: Display that user’s public activity (honors hidden items + private Tokis rules).
- **Backend**: Endpoints to list activity and toggle hidden state; migration for `user_hidden_activities`.

---

### Deliverables
- DB migration: `user_hidden_activities(user_id, toki_id, created_at)` with unique (user_id, toki_id).
- API routes:
  - `GET /api/activity/me/activity` – owner list with `is_hidden` flag.
  - `GET /api/activity/users/:userId/activity` – public list (excludes hidden/private).
  - `POST /api/activity/me/activity/:tokiId/hide` – hide.
  - `DELETE /api/activity/me/activity/:tokiId/hide` – unhide.
- Client API methods in `services/api.ts` for the above.
- UI updates:
  - Profile tab section between stats and the rest: My Activity + toggle per item; "Show as member" button.
  - Public profile: Activity list (no toggles).

---

### Tasks
- [ ] Migration: create `user_hidden_activities` table and indexes
- [ ] Backend: add `routes/activity.ts` with list/hide/unhide
- [ ] Backend: register routes in `src/index.ts`
- [ ] Services: add `getMyActivity`, `getUserActivity`, `hideActivity`, `showActivity`
- [ ] Profile tab UI: add My Activity list + Eye/EyeOff per card
- [ ] Profile tab UI: add "Show as member" preview toggle
- [ ] Public profile UI: render user activity after stats
- [ ] Write/update sibling `.md` docs for changed files per workspace rule
- [ ] QA: verify privacy and visibility edge cases (see checklist)

---

### UX/Content
- Section title: "My Activity" (owner), "<FirstName>'s Activity" (public profile)
- Toggle button label: "Show as member" (when off), "Exit preview" (when on)
- Eye icons: EyeOff = visible to public (tap to hide), Eye = hidden (tap to show)

---

### Data & Rules
- Only Tokis with `tp.status IN ('approved','joined')` and `t.status='active'` are candidates.
- Public list excludes `t.visibility='private'` unless viewer is host/participant/invitee (out of scope here; we simply exclude private in public endpoint).
- Hidden overrides: if user hid a Toki, it is never shown publicly.

---

### QA Checklist
- [ ] Owner sees Eye/EyeOff controls; others do not
- [ ] Hidden item disappears in preview and on another account’s view
- [ ] Private Tokis never appear publicly
- [ ] Performance: lists capped (e.g., 50), horizontal scroll smooth
- [ ] No leakage across blocked relationships (existing block filters respected)
- [ ] Works on web, iOS; responsive layouts

---

### Rollout
- Migrate DB
- Deploy backend first, then frontend
- Monitor errors/latency on new endpoints

---

### Metrics
- Number of activity cards rendered per user profile
- Hide/show action counts and error rate
- Time-to-first-activity render on profile screens


