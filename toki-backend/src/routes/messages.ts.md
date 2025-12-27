# File: messages.ts

### Summary
This file handles all message-related endpoints including sending messages, fetching conversations, marking as read, and reporting messages.

### Fixes Applied Log
- **Problem**: Message reporting was using old `message_reports` table instead of unified `content_reports` table
- **Solution**: Updated POST /messages/:messageId/report endpoint to insert into `content_reports` with content_type='message'

### How Fixes Were Implemented
- **Problem**: Message reports weren't showing in admin panel because admin queries `content_reports` table
- **Solution**: Changed INSERT query from `message_reports` to `content_reports` with proper content_type field
- **Added**: ON CONFLICT clause to prevent duplicate reports (same as Toki/user reports)
- **Added**: Check for duplicate report and return 409 status with appropriate message
- **Result**: Message reports now appear in unified admin panel Reports tab alongside Toki and user reports
