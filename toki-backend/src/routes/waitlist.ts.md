# File: waitlist.ts

### Summary
This file handles the waitlist signup endpoint. It stores user information (email, phone, location, reason, platform) in the database, counts their position in the waitlist, and sends them a welcome email using the Resend API. It prevents duplicate signups by checking if the email already exists.

### Fixes Applied log
- Enhanced: Removed CREATE TABLE statement from route handler (following best practices - schema management should be handled via migrations)
- Enhanced: Added automatic welcome email functionality using Resend API
- Enhanced: Added user position tracking based on total signups count
- Enhanced: Returns user position in API response
- Enhanced: Made email sending non-blocking (doesn't fail signup if email fails)
- Enhanced: Added duplicate email prevention - checks if email exists before inserting
- Enhanced: Only sends welcome email to new signups (not duplicates)

### How Fixes Were Implemented
- Removed the table creation logic from the route to follow production best practices where schema changes are managed separately via migrations
- Integrated Resend API to send automated welcome emails to new signups with personalized position number and city
- Added COUNT query to determine user position in the waitlist
- Email sending is wrapped in a conditional that checks for RESEND_API_KEY environment variable
- Email failures are logged but don't affect the signup success
- Response now includes the user's position in the waitlist
- Added check for existing email before inserting to prevent duplicates
- Only sends welcome email when isNewSignup flag is true
- Uses SELECT query first to check if email exists, then conditionally inserts only if not found

