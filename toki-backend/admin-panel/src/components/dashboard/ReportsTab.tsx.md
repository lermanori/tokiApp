# File: ReportsTab.tsx

### Summary
This component provides the admin panel interface for managing content reports. It displays reported Tokis, users, and messages with context-rich information and allows admins to review, resolve, dismiss reports, and block/unblock Tokis.

### Features Implemented

#### Enhanced Context Display
- **Toki Reports:** Shows title, host name, location, category, scheduled time, visibility badge, and current status badge
- **Message Reports:** Shows full message text in styled quote box, sender name, message type badge (Direct/Group), and timestamp
- **User Reports:** Shows user name

#### Block Toki Functionality
- Admin can block Tokis directly from report review modal
- Block button appears only for Toki reports
- Button text changes based on current status:
  - "🚫 Block Toki" (orange) when active
  - "✓ Unblock Toki" (green) when blocked
- Blocking action:
  - Sets Toki status to 'blocked' in database
  - Hides Toki from all public feeds
  - Keeps Toki in database for records
  - Automatically marks report as resolved
- Confirmation dialog before blocking/unblocking

#### Report Management
- Filter by status: pending, reviewed, resolved, dismissed
- Filter by content type: all, toki, user, message
- Pagination for large report lists
- Detailed review modal with notes field
- Admin actions: Resolve, Dismiss, Cancel

### How Fixes Were Implemented

**Problem:** Report modal only showed generic content preview without context

**Solution:** 
- Enhanced backend query to include LEFT JOINs for hosts and senders
- Added content-specific metadata fields to Report interface
- Created conditional rendering in modal based on content_type
- Styled different content types with appropriate badges and layouts

**Problem:** No way to block problematic Tokis from admin panel

**Solution:**
- Created new PATCH /admin/tokis/:tokiId/block endpoint
- Added blockToki method to adminApi service
- Added handleBlockToki function in component
- Integrated block button with confirmation dialog
- Linked blocking action to automatically resolve report

**Problem:** Blocked Tokis were still visible in feeds

**Solution:**
- All public Toki endpoints already filter WHERE status = 'active'
- Updated /my-tokis endpoint to show all statuses for hosts only
- Hosts can see their blocked Tokis with status indicator

### Component Structure

1. **State Management:**
   - reports: Array of Report objects
   - selectedReport: Currently selected report for review modal
   - reviewNotes: Admin's notes for the review
   - showReviewModal: Boolean for modal visibility
   - Filters: statusFilter, contentTypeFilter
   - Pagination: page, totalPages

2. **Functions:**
   - loadReports(): Fetches reports from API with filters
   - handleReviewReport(): Updates report status (resolve/dismiss)
   - handleBlockToki(): Blocks or unblocks a Toki
   - getContentTypeColor(): Returns badge color for content type
   - formatDate(): Formats timestamp for display

3. **UI Sections:**
   - Header with title and description
   - Filters section (status + content type dropdowns)
   - Reports table with Type, Content, Reason, Reporter, Date columns
   - Review modal with enhanced context display
   - Action buttons (Block/Unblock, Resolve, Dismiss, Cancel)

### Status Badges

**Toki Status:**
- Active: Green (#D1FAE5 / #065F46)
- Blocked: Red (#FEE2E2 / #991B1B)
- Completed: Blue (#E0E7FF / #3730A3)
- Other: Gray (#F3F4F6 / #6B7280)

**Visibility:**
- Public: Blue (#DBEAFE / #1E40AF)
- Friends: Yellow (#FEF3C7 / #92400E)
- Private: Purple (#F3E8FF / #6B21A8)

**Message Type:**
- Direct: Purple (#E0E7FF / #4338CA)
- Group: Blue (#DBEAFE / #1E40AF)

### Integration Points

- **Admin API Service:** `adminApi.getReports()`, `adminApi.updateReport()`, `adminApi.blockToki()`
- **Backend Routes:** `/admin/reports`, `/admin/reports/:reportId`, `/admin/tokis/:tokiId/block`
- **Database:** Queries `content_reports`, `tokis`, `messages`, `users` tables
