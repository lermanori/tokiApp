# File: blocks.ts

### Summary
This file contains the blocking functionality for the Toki app, allowing users to block other users. It includes endpoints for blocking, unblocking, checking block status, and retrieving blocked users. Enhanced with developer notifications for Apple App Review compliance.

### Fixes Applied log
- **problem**: Missing email notification to admin when user is blocked (required for Apple App Review)
- **solution**: Added email notification system that sends detailed block information to admin email address using Resend API (preferred) or SMTP fallback.

- **problem**: No admin panel logging for block actions
- **solution**: Added admin_logs table integration to track all block actions with detailed context (blocker info, blocked user info, reason, timestamp).

- **problem**: Generic success message didn't inform users about instant content removal
- **solution**: Updated success message to explicitly state "Their content has been removed from your feed" to clarify immediate effect.

### How Fixes Were Implemented
- **Email Notification**: 
  - Fetches blocker and blocked user details from database
  - Generates HTML email template with comprehensive block information
  - Attempts to send via Resend API first (if configured), falls back to SMTP
  - Uses ADMIN_EMAIL or SUPPORT_EMAIL environment variable
  - Email includes: blocker info, blocked user info, reason, timestamp, and actions taken
  - Non-blocking: if email fails, block operation still succeeds

- **Admin Logging**:
  - Inserts record into admin_logs table with action_type 'user_block'
  - Stores blocker_id, target_id (blocked user), target_type 'user', and JSON details
  - Handles case where table doesn't exist yet (graceful degradation)
  - Provides audit trail for admin panel review

- **Enhanced User Feedback**:
  - Updated API response message to be more descriptive
  - Frontend now shows confirmation that content is instantly removed
  - Feeds automatically refresh after blocking to show immediate effect

### Dependencies
- Requires `admin_logs` table in database (added to database-setup.sql)
- Requires ADMIN_EMAIL or SUPPORT_EMAIL environment variable
- Optional: RESEND_API_KEY for production email delivery
- Uses existing email utility from `../utils/email.ts`
