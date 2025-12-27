# Apple App Review Compliance - Task List

**Status**: 🟡 In Progress (2/4 Critical Tasks Complete)  
**Priority**: 🔴 Critical - Required for App Store Approval  
**Last Updated**: 2025-12-27

## Overview

Apple rejected the app due to missing user-generated content moderation features. This document outlines all tasks required to comply with **App Review Guideline 1.2 - Safety - User-Generated Content**.

### Apple's Requirements:
1. ✅ **COMPLETE** - Require users to agree to terms (EULA) with clear "no tolerance" language
2. ✅ **COMPLETE** - Method for filtering objectionable content (reporting + blocking)
3. ✅ **COMPLETE** - Mechanism for users to flag objectionable content (all types)
4. ⚠️ **PARTIAL** - Mechanism for users to block abusive users (needs developer notification)

---

## Phase 1: Critical Requirements (Must Complete for Resubmission)

### Task 1.1: EULA Agreement System
**Status**: ✅ COMPLETE  
**Priority**: 🔴 Critical  
**Completed**: December 27, 2025

#### Database Changes
- [x] Add `terms_accepted_at` column to `users` table
- [x] Add `terms_version` column to `users` table (to track which version was accepted)
- [x] Create migration script for database changes

#### Backend Implementation
- [x] Update registration endpoint (`POST /api/auth/register`) to require `termsAccepted: true`
- [x] Update registration endpoint to store `terms_accepted_at` timestamp
- [x] Update login endpoint to check if user has accepted current terms version
- [x] Create new endpoint: `POST /api/auth/accept-terms` for accepting terms after login
- [x] Add validation to reject registration/login if terms not accepted

#### Frontend Implementation
- [x] Update `app/register.tsx`:
  - [x] Add checkbox: "I agree to the Terms of Use and Privacy Policy"
  - [x] Make checkbox required (disable submit button if unchecked)
  - [x] Add links to Terms and Privacy Policy
  - [x] Send `termsAccepted: true` in registration request
- [x] Update `app/login.tsx`:
  - [x] Check if user has accepted terms on successful login
  - [x] Show Terms Agreement Modal if terms not accepted
  - [x] Prevent app access until terms accepted
- [x] Create `components/TermsAgreementModal.tsx`:
  - [x] Display Terms of Use content
  - [x] Display Privacy Policy content
  - [x] Require checkbox to accept
  - [x] Call accept-terms API endpoint
  - [x] Handle acceptance and proceed with login

#### Terms of Use Updates
- [x] Review `app/terms-of-use.tsx` content
- [x] Add explicit "NO TOLERANCE" section for objectionable content
- [x] Strengthen language about abusive users
- [x] Add clear consequences section (account termination, etc.)
- [x] Update "Last Updated" date

**Implementation Summary**: See `EULA_AGREEMENT_SYSTEM_IMPLEMENTATION.md`

**Files to Modify:**
- `toki-backend/src/config/database-setup.sql`
- `toki-backend/src/routes/auth.ts`
- `toki-backend/src/routes/users.ts` (or create new route)
- `app/register.tsx`
- `app/login.tsx`
- `app/terms-of-use.tsx`
- `components/TermsAgreementModal.tsx` (new file)

---

### Task 1.2: Expand Reporting System
**Status**: ✅ COMPLETE (with Enhanced Admin Review)  
**Priority**: 🔴 Critical  
**Completed**: December 27, 2025

#### Database Changes
- [x] Create `content_reports` table with all fields
- [x] Add indexes for performance (6 indexes created)
- [x] Add unique constraint for duplicate prevention

#### Backend Implementation
- [x] Create `toki-backend/src/routes/reports.ts`:
  - [x] `POST /api/reports/tokis/:tokiId` - Report a Toki (with auto-hide)
  - [x] `POST /api/reports/users/:userId` - Report a user profile
  - [x] `GET /api/reports/my-reports` - Get current user's reports
- [x] Update message reporting to use unified `content_reports` table
- [x] Add validation:
  - [x] Prevent users from reporting themselves
  - [x] Prevent duplicate reports (same user, same content)
  - [x] Require reason text
- [x] Add logging for all reports
- [x] **Enhanced admin routes**:
  - [x] Context-rich queries with LEFT JOINs for full metadata
  - [x] Block/unblock Toki endpoint (`PATCH /admin/tokis/:tokiId/block`)
  - [x] Smart unhide on dismissed reports

#### Frontend Implementation
- [x] Update `app/toki-details.tsx`:
  - [x] Add "Report Toki" button
  - [x] Create report modal with reason input
  - [x] Auto-hide reported Toki and navigate back
- [x] Update `app/user-profile/[userId].tsx`:
  - [x] Add "Report User" button
  - [x] Create report modal with reason input
- [x] Update `app/chat.tsx`:
  - [x] Add Flag icon button next to messages (replaced long-press)
  - [x] One-tap reporting mechanism
- [x] Create `components/ReportModal.tsx`:
  - [x] Reusable modal for reporting any content type
  - [x] Reason input field (required, 500 char max)
  - [x] Submit handler with validation
  - [x] Success/error handling

#### Admin Panel Updates
- [x] Update `toki-backend/admin-panel/src/components/dashboard/ReportsTab.tsx`:
  - [x] Unified view for all content types (Tokis, users, messages)
  - [x] **Context-rich display**:
    - [x] Tokis: title, host, location, category, schedule, visibility, status
    - [x] Messages: full text in quote, sender, type (Direct/Group), timestamp
    - [x] Users: name and profile info
  - [x] **Block Toki feature**:
    - [x] Block/Unblock button (Toki reports only)
    - [x] Changes status to 'blocked'/'active'
    - [x] Confirmation dialog
    - [x] Auto-resolves report
  - [x] Filter by content type and status
  - [x] Actions: review, resolve, dismiss
  - [x] Notes field for admin comments
  - [x] Pagination
- [x] Add `blockToki()` method to admin API service

#### Additional Enhancements
- [x] Auto-hide reported Tokis from reporter's view
- [x] Filter blocked Tokis from all public feeds
- [x] Hosts can see their blocked Tokis in my-tokis
- [x] All Toki queries filter `WHERE status = 'active'`

**Implementation Summary**: See `TASK_1.2_IMPLEMENTATION_SUMMARY.md`

**Files to Modify:**
- `toki-backend/src/config/database-setup.sql`
- `toki-backend/src/routes/reports.ts` (new file)
- `toki-backend/src/routes/admin.ts`
- `app/toki-details.tsx`
- `app/user-profile/[userId].tsx`
- `components/TokiCard.tsx`
- `components/ReportModal.tsx` (new file)
- `services/api.ts` (add report methods)
- `contexts/AppContext.tsx` (add report actions)

---

### Task 1.3: Enhanced Blocking with Developer Notifications
**Status**: ⬜ Not Started  
**Priority**: 🔴 Critical  
**Estimated Time**: 4-6 hours

#### Backend Implementation
- [ ] Update `toki-backend/src/routes/blocks.ts`:
  - [ ] Add email notification when user is blocked:
    - [ ] Send email to admin/support email
    - [ ] Include blocker info, blocked user info, reason
    - [ ] Include timestamp
  - [ ] Add admin panel notification/log entry
  - [ ] Optional: Add webhook notification for integrations
- [ ] Ensure instant content removal:
  - [ ] Verify Toki queries filter blocked users immediately
  - [ ] Verify message queries filter blocked users immediately
  - [ ] Verify connection queries filter blocked users (already done)
  - [ ] Test that blocked user's content disappears instantly

#### Frontend Implementation
- [ ] Update blocking flow to refresh feeds immediately:
  - [ ] After blocking in `app/connections.tsx`, refresh Toki feed
  - [ ] After blocking in `app/user-profile/[userId].tsx`, refresh feeds
  - [ ] Show confirmation: "User blocked. Their content has been removed from your feed."
- [ ] Update `app/connections.tsx` blocking UI:
  - [ ] Show clear message about what blocking does
  - [ ] Confirm content will be removed instantly

#### Email/Notification Setup
- [ ] Configure email service for admin notifications (if not already set up)
- [ ] Create email template for block notifications
- [ ] Add environment variable for admin email address

**Files to Modify:**
- `toki-backend/src/routes/blocks.ts`
- `toki-backend/src/utils/email.ts` (or create notification utility)
- `app/connections.tsx`
- `app/user-profile/[userId].tsx`
- `contexts/AppContext.tsx` (refresh feeds after block)

---

### Task 1.4: Content Filtering System
**Status**: ⬜ Not Started  
**Priority**: 🔴 Critical  
**Estimated Time**: 8-12 hours

#### Backend Implementation
- [ ] Create `toki-backend/src/utils/contentFilter.ts`:
  - [ ] Basic keyword/profanity filter function
  - [ ] Integration with content moderation API (Google Cloud, AWS, or Perspective API)
  - [ ] Function to check text content: `filterContent(text: string): { isObjectionable: boolean, severity: 'low' | 'medium' | 'high', reasons: string[] }`
  - [ ] Configurable threshold for blocking content
- [ ] Add filtering to:
  - [ ] Toki creation (`POST /api/tokis`)
  - [ ] Toki updates (`PUT /api/tokis/:id`)
  - [ ] User profile updates (`PUT /api/users/profile`)
  - [ ] Message sending (`POST /api/messages/...`)
- [ ] Return appropriate errors when content is flagged:
  - [ ] Reject if severity is 'high'
  - [ ] Warn but allow if severity is 'low' or 'medium' (optional)

#### Content Moderation API Setup
- [ ] Choose content moderation service:
  - [ ] Option A: Google Cloud Content Moderation API
  - [ ] Option B: AWS Comprehend
  - [ ] Option C: Perspective API (free tier available)
  - [ ] Option D: Basic keyword list (less robust, but faster to implement)
- [ ] Set up API credentials and configuration
- [ ] Add environment variables for API keys
- [ ] Implement API integration in content filter

#### Frontend Implementation
- [ ] Show warnings when content is flagged:
  - [ ] In Toki creation form
  - [ ] In message input
  - [ ] In profile edit form
- [ ] Prevent submission if content is highly objectionable
- [ ] Show user-friendly error messages

#### Keyword List (Basic Filter)
- [ ] Create initial keyword list for:
  - [ ] Profanity
  - [ ] Hate speech indicators
  - [ ] Spam patterns
  - [ ] Other objectionable content
- [ ] Store in config file or database
- [ ] Make it easy to update/maintain

**Files to Modify:**
- `toki-backend/src/utils/contentFilter.ts` (new file)
- `toki-backend/src/routes/tokis.ts`
- `toki-backend/src/routes/messages.ts`
- `toki-backend/src/routes/users.ts` (profile updates)
- `toki-backend/src/config/keywords.ts` (new file, optional)
- `app/edit-toki.tsx` (show warnings)
- `app/chat.tsx` (show warnings)
- `app/edit-profile.tsx` (show warnings)

---

## Phase 2: Important Enhancements (Recommended)

### Task 2.1: Instant Content Removal on Block
**Status**: ⬜ Not Started  
**Priority**: 🟡 High  
**Estimated Time**: 2-3 hours

#### Implementation
- [ ] Verify all Toki queries exclude blocked users
- [ ] Verify all message queries exclude blocked users
- [ ] Add real-time feed refresh after blocking:
  - [ ] Refresh Discover feed
  - [ ] Refresh My Tokis
  - [ ] Refresh Saved Tokis
  - [ ] Refresh Connections
- [ ] Test that content disappears immediately (no page refresh needed)

**Files to Modify:**
- `toki-backend/src/routes/tokis.ts` (verify filters)
- `toki-backend/src/routes/messages.ts` (verify filters)
- `app/connections.tsx` (refresh after block)
- `app/user-profile/[userId].tsx` (refresh after block)
- `contexts/AppContext.tsx` (add refresh methods)

---

### Task 2.2: Admin Moderation Dashboard Improvements
**Status**: ⬜ Not Started  
**Priority**: 🟡 High  
**Estimated Time**: 4-6 hours

#### Implementation
- [ ] Update admin panel to show all report types in unified view
- [ ] Add filters: by type, by status, by date
- [ ] Add bulk actions: review multiple reports
- [ ] Add statistics dashboard:
  - [ ] Total reports by type
  - [ ] Reports by status
  - [ ] Recent blocking activity
- [ ] Add quick actions:
  - [ ] View reported content
  - [ ] View reporter and reported user profiles
  - [ ] Block user from admin panel
  - [ ] Delete content from admin panel

**Files to Modify:**
- `toki-backend/admin-panel/src/components/...` (admin panel components)
- `toki-backend/src/routes/admin.ts`

---

## Phase 3: Testing & Documentation

### Task 3.1: Comprehensive Testing
**Status**: ⬜ Not Started  
**Priority**: 🔴 Critical  
**Estimated Time**: 4-6 hours

#### Test Cases
- [ ] **EULA Agreement:**
  - [ ] Cannot register without accepting terms
  - [ ] Cannot login without accepting terms (if not previously accepted)
  - [ ] Terms acceptance is stored in database
  - [ ] Terms modal appears on login if not accepted
  
- [ ] **Content Filtering:**
  - [ ] Profanity in Toki title is blocked
  - [ ] Profanity in Toki description is blocked
  - [ ] Profanity in message is blocked
  - [ ] Profanity in user bio is blocked
  - [ ] Appropriate error messages shown
  
- [ ] **Reporting:**
  - [ ] Can report a Toki
  - [ ] Can report a user profile
  - [ ] Can report a message (existing)
  - [ ] Cannot report own content
  - [ ] Cannot create duplicate reports
  - [ ] Reports appear in admin panel
  
- [ ] **Blocking:**
  - [ ] Blocking user sends notification to admin
  - [ ] Blocked user's Tokis disappear from feed instantly
  - [ ] Blocked user's messages disappear instantly
  - [ ] Blocked user cannot see blocker's content
  - [ ] Blocked user cannot message blocker
  - [ ] Unblocking restores visibility

#### Manual Testing Checklist
- [ ] Test on iOS device
- [ ] Test on Android device
- [ ] Test on Web
- [ ] Test all user flows end-to-end
- [ ] Test error handling
- [ ] Test edge cases

---

### Task 3.2: Documentation Updates
**Status**: ⬜ Not Started  
**Priority**: 🟡 Medium  
**Estimated Time**: 2-3 hours

#### Documentation to Create/Update
- [ ] Update `PROJECT_DOCUMENTATION.md` with new features
- [ ] Create `CONTENT_MODERATION.md` explaining the system
- [ ] Update API documentation with new endpoints
- [ ] Create admin guide for reviewing reports
- [ ] Document content filter configuration

---

## Implementation Order

### Week 1: Critical Path
1. **Day 1-2**: Task 1.1 (EULA Agreement System)
2. **Day 3-4**: Task 1.2 (Expand Reporting System)
3. **Day 5**: Task 1.3 (Enhanced Blocking) + Task 1.4 start

### Week 2: Complete & Test
4. **Day 6-7**: Task 1.4 (Content Filtering) completion
5. **Day 8**: Task 2.1 (Instant Removal) + Task 2.2 (Admin Dashboard)
6. **Day 9-10**: Task 3.1 (Testing) + Task 3.2 (Documentation)

---

## Success Criteria

✅ **Ready for Resubmission when:**
- [ ] All Phase 1 tasks completed
- [ ] All test cases passing
- [ ] Terms of Use updated with "no tolerance" language
- [ ] Users must accept terms to register/login
- [ ] Content filtering active on all user inputs
- [ ] Reporting available for Tokis, users, and messages
- [ ] Blocking sends notifications and removes content instantly
- [ ] Admin can review all reports

---

## Notes

- **Content Moderation API**: Recommend starting with Perspective API (free tier) or basic keyword filter, then upgrading to paid service if needed
- **Email Notifications**: Use existing email service if available, or set up simple SMTP
- **Database Migrations**: Create proper migration scripts, don't modify database-setup.sql directly
- **Testing**: Test thoroughly before resubmission - Apple will check these features

---

## Questions/Decisions Needed

- [ ] Which content moderation API to use? (Recommendation: Start with keyword filter + Perspective API)
- [ ] What email address for admin notifications?
- [ ] Should we show warnings for medium-severity content or just block high-severity?
- [ ] Should users be able to see their own reports status?

---

## Progress Tracking

**Total Critical Tasks**: 4  
**Completed**: 2 (Tasks 1.1, 1.2) ✅  
**In Progress**: 0  
**Remaining**: 2 (Tasks 1.3, 1.4)  

**Estimated Remaining Time**: 12-18 hours

### Completed Work
- ✅ Task 1.1: EULA Agreement System (100%)
- ✅ Task 1.2: Expand Reporting System with Enhanced Admin Review (100%)

### Next Priority
- 🔴 Task 1.3: Enhanced Blocking with Developer Notifications
- 🔴 Task 1.4: Content Filtering System

---

*Last updated: December 27, 2025*

