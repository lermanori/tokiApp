# Apple App Review Compliance - Implementation Log

This file tracks all implementations for Apple App Review Guideline 1.2 - Safety - User-Generated Content compliance.

---

## Task 1.1: EULA Agreement System ✅ COMPLETED

**Date Completed:** December 27, 2025  
**Commit:** feat: Implement EULA Agreement System for Apple App Review compliance

### Summary
Implemented complete Terms of Use acceptance system with database tracking, backend validation, and frontend UI for registration and login flows.

### What Was Implemented

#### Database Changes
- Added `terms_accepted_at` (TIMESTAMPTZ) column to users table
- Added `terms_version` (VARCHAR) column to users table  
- Created database migration with index for performance
- Added Migration 15 to run-migrations.ts

#### Backend Implementation
- Added `CURRENT_TERMS_VERSION` constant ('2025-12-27')
- Updated `POST /api/auth/register` to require `termsAccepted` parameter
- Updated `POST /api/auth/register/invite` with same validation
- Modified `POST /api/auth/login` to check terms version and return `requiresTermsAcceptance` flag
- Created `POST /api/auth/accept-terms` endpoint for post-login acceptance
- Fixed: Login now always issues tokens (even when terms acceptance needed) to allow calling accept-terms endpoint

#### Frontend Implementation
- Added terms acceptance checkbox to registration form (required to submit)
- Created `TermsAgreementModal.tsx` component with scrollable content
- Added terms modal handling to login flow
- Updated API service with `acceptTerms()` method
- Modified `AuthResponse` interface to handle terms acceptance flow

#### Terms of Use Updates
- Added Section 4.6: "NO TOLERANCE POLICY FOR OBJECTIONABLE CONTENT AND ABUSIVE BEHAVIOR"
- Updated "Last Updated" date to December 27, 2025
- Included explicit consequences: immediate termination, permanent ban, legal action

### Apple Requirements Met
✅ Require users to agree to terms (EULA) with clear "no tolerance" language

### Testing Checklist
- [ ] New users can register with terms checkbox
- [ ] Registration blocked without checking terms
- [ ] Existing users see terms modal on login
- [ ] Terms acceptance tracked in database
- [ ] Terms modal blocks app access until accepted
- [ ] Links to full Terms of Use work

---

## Task 1.2: Expand Reporting System ✅ COMPLETED

**Date Completed:** December 27, 2025  
**Commit:** feat: Implement comprehensive content reporting with auto-hide functionality

### Summary
Implemented unified content reporting system for Tokis, users, and messages with instant content hiding for reporters. Added complete admin panel interface for report management with smart visibility restoration.

### What Was Implemented

#### Database Changes
- Created `content_reports` table with fields:
  - id, content_type, content_id, reporter_id, reason
  - status (pending/reviewed/resolved/dismissed), reviewed_by, reviewed_at, notes
  - created_at, reported_at timestamps
- Added 6 indexes for query performance
- Implemented unique constraint to prevent duplicate pending reports
- Leveraged existing `user_hidden_activities` table for auto-hide functionality
- Added Migration 16 to run-migrations.ts

#### Backend Implementation
- **Created** `toki-backend/src/routes/reports.ts` (217 lines)
  - `POST /api/reports/tokis/:tokiId` - Report a Toki + auto-hide it
  - `POST /api/reports/users/:userId` - Report a user profile
  - `GET /api/reports/my-reports` - Get user's submitted reports
  - Validation: no self-reporting, no duplicates, reason required
  
- **Updated** `toki-backend/src/routes/admin.ts`
  - Modified `GET /api/admin/reports` with LEFT JOINs for all content types
  - Added contentType filter (all/toki/user/message)
  - Created `PATCH /api/admin/reports/:reportId` for admin actions
  - Smart unhide: dismissed Toki reports restore visibility via `user_hidden_activities` deletion
  
- **Updated** `toki-backend/src/routes/tokis.ts`
  - Added `user_hidden_activities` filter to main GET / endpoint
  - Added `user_hidden_activities` filter to GET /nearby endpoint
  - Ensures reported Tokis don't appear in any feed for reporter
  
- **Updated** `toki-backend/src/index.ts`
  - Registered reports router at `/api/reports`

#### Frontend Implementation
- **Created** `components/ReportModal.tsx` (226 lines)
  - Reusable modal for all content types
  - Reason textarea with 500 char limit + counter
  - Validation, loading states, success/error handling
  
- **Updated** `services/api.ts`
  - Added `reportToki()`, `reportUser()`, `getMyReports()` methods
  
- **Updated** `contexts/AppContext.tsx`
  - Added `reportToki` and `reportUser` action methods
  
- **Updated** `app/toki-details.tsx`
  - Added Report button with Flag icon (only for non-hosts)
  - Integrated ReportModal
  - Calls `loadTokis()` and navigates back after successful report
  
- **Updated** `app/user-profile/[userId].tsx`
  - Added Report User button (only for other users)
  - Integrated ReportModal

#### Admin Panel Implementation
- **Created** `toki-backend/admin-panel/src/components/dashboard/ReportsTab.tsx` (570 lines)
  - Complete reports management interface
  - Filters: status (pending/reviewed/resolved/dismissed) + content type
  - Table with colored badges (blue/yellow/green/gray)
  - Review modal with Resolve/Dismiss/Cancel actions
  - Notes textarea for admin documentation
  - Pagination controls
  
- **Updated** `toki-backend/admin-panel/src/services/adminApi.ts`
  - Added `getReports()` and `updateReport()` methods
  
- **Updated** `toki-backend/admin-panel/src/components/dashboard/Dashboard.tsx`
  - Added Reports tab with Flag icon
  - Conditional ReportsTab rendering
  - Successfully built: 645.38 kB

### Key Features
✅ **Instant Feedback**: Reported Tokis immediately disappear from reporter's feeds
✅ **Smart Visibility Management**: 
   - Report → Toki hidden
   - Admin resolves → Stays hidden
   - Admin dismisses → Toki becomes visible again
✅ **Comprehensive Filtering**: Hidden Tokis excluded from main feed, nearby, and all endpoints
✅ **Duplicate Prevention**: Can't report same content twice (pending reports only)
✅ **Self-Report Prevention**: Can't report own Tokis or profile
✅ **Admin Control**: Full review system with notes and status tracking

### Apple Requirements Met
✅ Method for filtering objectionable content
✅ Mechanism for users to flag objectionable content (all types)

### Files Created (5)
1. toki-backend/src/scripts/create-unified-content-reports.sql
2. toki-backend/src/routes/reports.ts
3. components/ReportModal.tsx
4. toki-backend/admin-panel/src/components/dashboard/ReportsTab.tsx
5. toki-backend/src/routes/tokis.ts.md

### Files Modified (9)
1. toki-backend/src/index.ts
2. toki-backend/src/routes/admin.ts
3. toki-backend/src/routes/tokis.ts
4. services/api.ts
5. contexts/AppContext.tsx
6. app/toki-details.tsx
7. app/user-profile/[userId].tsx
8. toki-backend/admin-panel/src/components/dashboard/Dashboard.tsx
9. toki-backend/admin-panel/src/services/adminApi.ts

### Bug Fixes During Implementation
1. **TypeScript Error**: Missing logger import in admin.ts → Added import
2. **Database Error**: Wrong column name `hidden_at` → Changed to use default `created_at`
3. **Admin Panel Build Errors**: Unused imports + unknown type → Cleaned up imports + added type assertions
4. **Visibility Bug**: Reported Tokis still showing → Added filters to tokis.ts endpoints
5. **Message Reports Not Showing**: Messages using old `message_reports` table → Updated to `content_reports`
6. **Poor UX for Message Reporting**: Long-press gesture not discoverable → Added visible Flag icon button

---

## Task 1.3: Enhanced Blocking with Developer Notifications ⏳ PENDING

**Status:** Not Started  
**Priority:** Critical  
**Estimated Time:** 4-6 hours

### Requirements
- Add email notification when user is blocked
- Send to admin/support email with blocker/blocked info
- Verify instant content removal (tokis, messages from blocked users)
- Update blocking UI with clear explanations

### Apple Requirements to Meet
❌ Mechanism for users to block abusive users (with developer notification + instant removal)

---

## Task 1.4: Content Filtering System ⏳ PENDING

**Status:** Not Started  
**Priority:** Critical  
**Estimated Time:** 8-12 hours

### Requirements
- Create `contentFilter.ts` utility with keyword/profanity filter
- Integration with content moderation API (Perspective API recommended)
- Add filtering to: toki creation, toki updates, profile updates, message sending
- Return appropriate errors when content is flagged
- Show warnings in frontend forms

### Apple Requirements to Meet
❌ Method for filtering objectionable content

---

## Next Steps

1. Complete Task 1.2 (Expand Reporting System)
2. Complete Task 1.3 (Enhanced Blocking)
3. Complete Task 1.4 (Content Filtering)
4. Test all features thoroughly
5. Update this document with completion dates and commits
6. Prepare for App Store resubmission

---

_Last Updated: December 27, 2025_
