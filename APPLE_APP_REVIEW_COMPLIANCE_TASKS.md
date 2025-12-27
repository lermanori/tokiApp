# Apple App Review Compliance - Task List

**Status**: 🟡 In Progress  
**Priority**: 🔴 Critical - Required for App Store Approval  
**Last Updated**: 2025-01-XX

## Overview

Apple rejected the app due to missing user-generated content moderation features. This document outlines all tasks required to comply with **App Review Guideline 1.2 - Safety - User-Generated Content**.

### Apple's Requirements:
1. ✅ Require users to agree to terms (EULA) with clear "no tolerance" language
2. ❌ Method for filtering objectionable content
3. ❌ Mechanism for users to flag objectionable content (all types)
4. ❌ Mechanism for users to block abusive users (with developer notification + instant removal)

---

## Phase 1: Critical Requirements (Must Complete for Resubmission)

### Task 1.1: EULA Agreement System
**Status**: ⬜ Not Started  
**Priority**: 🔴 Critical  
**Estimated Time**: 4-6 hours

#### Database Changes
- [ ] Add `terms_accepted_at` column to `users` table
- [ ] Add `terms_version` column to `users` table (to track which version was accepted)
- [ ] Create migration script for database changes

#### Backend Implementation
- [ ] Update registration endpoint (`POST /api/auth/register`) to require `termsAccepted: true`
- [ ] Update registration endpoint to store `terms_accepted_at` timestamp
- [ ] Update login endpoint to check if user has accepted current terms version
- [ ] Create new endpoint: `POST /api/users/accept-terms` for accepting terms after login
- [ ] Add validation to reject registration/login if terms not accepted

#### Frontend Implementation
- [ ] Update `app/register.tsx`:
  - [ ] Add checkbox: "I agree to the Terms of Use and Privacy Policy"
  - [ ] Make checkbox required (disable submit button if unchecked)
  - [ ] Add links to Terms and Privacy Policy
  - [ ] Send `termsAccepted: true` in registration request
- [ ] Update `app/login.tsx`:
  - [ ] Check if user has accepted terms on successful login
  - [ ] Show Terms Agreement Modal if terms not accepted
  - [ ] Prevent app access until terms accepted
- [ ] Create `components/TermsAgreementModal.tsx`:
  - [ ] Display Terms of Use content
  - [ ] Display Privacy Policy content
  - [ ] Require checkbox to accept
  - [ ] Call accept-terms API endpoint
  - [ ] Handle acceptance and proceed with login

#### Terms of Use Updates
- [ ] Review `app/terms-of-use.tsx` content
- [ ] Add explicit "NO TOLERANCE" section for objectionable content
- [ ] Strengthen language about abusive users
- [ ] Add clear consequences section (account termination, etc.)
- [ ] Update "Last Updated" date

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
**Status**: ⬜ Not Started  
**Priority**: 🔴 Critical  
**Estimated Time**: 6-8 hours

#### Database Changes
- [ ] Create `content_reports` table:
  ```sql
  CREATE TABLE content_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type VARCHAR(50) NOT NULL, -- 'toki', 'user', 'message'
    content_id UUID NOT NULL,
    reporter_id UUID NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL,
    reported_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'dismissed'
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- [ ] Add indexes for performance:
  - [ ] Index on `content_type` and `content_id`
  - [ ] Index on `reporter_id`
  - [ ] Index on `status`
  - [ ] Index on `reported_at`

#### Backend Implementation
- [ ] Create `toki-backend/src/routes/reports.ts`:
  - [ ] `POST /api/reports/tokis/:tokiId` - Report a Toki
  - [ ] `POST /api/reports/users/:userId` - Report a user profile
  - [ ] `GET /api/reports/my-reports` - Get current user's reports
- [ ] Update existing message reports to use unified `content_reports` table (or keep separate but add to admin view)
- [ ] Add validation:
  - [ ] Prevent users from reporting themselves
  - [ ] Prevent duplicate reports (same user, same content)
  - [ ] Require reason text
- [ ] Add logging for all reports

#### Frontend Implementation
- [ ] Update `app/toki-details.tsx`:
  - [ ] Add "Report Toki" button/menu option
  - [ ] Create report modal with reason input
  - [ ] Call report API endpoint
  - [ ] Show success/error feedback
- [ ] Update `app/user-profile/[userId].tsx`:
  - [ ] Add "Report User" button (if not already present)
  - [ ] Create report modal with reason input
  - [ ] Call report API endpoint
  - [ ] Show success/error feedback
- [ ] Update `components/TokiCard.tsx`:
  - [ ] Add "Report" option to menu/actions (if menu exists)
  - [ ] Or add report button in card footer
- [ ] Create `components/ReportModal.tsx`:
  - [ ] Reusable modal for reporting any content type
  - [ ] Reason input field (required)
  - [ ] Submit handler
  - [ ] Success/error handling

#### Admin Panel Updates
- [ ] Update `toki-backend/src/routes/admin.ts`:
  - [ ] Update `/api/admin/reports` to include all content types (Tokis, users, messages)
  - [ ] Add filtering by content type
  - [ ] Update report detail endpoint to handle all types
  - [ ] Add actions: review, resolve, dismiss

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

**Total Tasks**: 12  
**Completed**: 0  
**In Progress**: 0  
**Not Started**: 12  

**Estimated Total Time**: 40-50 hours

---

*Last updated: [Date]*

