# File: admin.ts

### Summary
This file handles admin authentication endpoints (login, me) and admin-only routes for managing the system. It includes middleware to verify admin role, endpoints for message reports management, and comprehensive waitlist management endpoints with pagination, filtering, statistics, user creation, and email sending capabilities.

### Fixes Applied log
- Enhanced: Updated requireAdmin middleware to check for role = 'admin' in database
- Added: POST /api/admin/login endpoint for admin authentication
- Added: GET /api/admin/me endpoint for fetching current admin user info
- Fixed: Changed NextFunction type import for proper TypeScript typing
- Enhanced: Proper error handling with clear messages
- Added: GET /api/admin/waitlist endpoint with pagination, filtering, and sorting
- Enhanced: GET /api/admin/waitlist now includes `user_exists` boolean (email exists in users)
- Added: GET /api/admin/waitlist/:id endpoint for single entry details
- Added: GET /api/admin/waitlist/stats endpoint for comprehensive statistics
- Added: POST /api/admin/waitlist/:id/user endpoint to create users from waitlist entries
- Added: POST /api/admin/waitlist/:id/email endpoint to send custom emails with template support
- Fixed: Ensure `requireAdmin` always returns `Promise<void>` and returns after `next()` to satisfy TS7030
- Fixed: Avoid returning `Response` from middleware (send response then return) to satisfy TS2322
 - Added: GET /api/admin/users endpoint with pagination, search, role/verified filters, and sorting
 - Added: GET /api/admin/tokis endpoint with pagination, search, category/status/host filters, and sorting
 - Added: POST/PUT/DELETE /api/admin/users endpoints for CRUD
 - Added: POST/PUT/DELETE /api/admin/tokis endpoints for CRUD
 - Added: GET/PUT /api/admin/algorithm endpoints with validation and history row insert
 - Added: Email templates CRUD: GET list/get, POST create, PUT update, DELETE delete

### How Fixes Were Implemented
- Updated requireAdmin middleware to query users table for role column and verify role === 'admin'
- Added admin login endpoint that validates credentials and checks admin role before issuing JWT tokens
- Added /me endpoint that requires authentication and admin role, returns current admin user info
- Used proper TypeScript imports for bcrypt and jwt utilities
- Added clear error messages for unauthorized access attempts
- Implemented waitlist listing with SQL query building for dynamic filtering by location and platform
\- Added `EXISTS (SELECT 1 FROM users ... ) AS user_exists` to list entries so UI can render a ✓/✗ indicator
- Added sorting capabilities with validation for sort columns and order
- Implemented pagination with proper limit/offset handling
- Added statistics endpoint with total count, location breakdown, platform breakdown, and time series data
- Created user creation endpoint that extracts waitlist data, checks for duplicates, generates passwords, and optionally sends welcome emails
- Implemented email sending endpoint with template support, variable replacement (position, city, name, email), and Resend API integration
\- Ensured middleware returns correctly after `next()` to avoid "Not all code paths return a value" TypeScript error; and does not return `Response` to avoid TS2322
\- Implemented users listing with dynamic WHERE clauses for search/filters, and safe sorting
\- Implemented tokis listing with dynamic WHERE clauses and safe sorting on allowlisted columns
\- Implemented algorithm weights validation (range [0,1], sum=1.0) and update with updated_by
\- Implemented email templates CRUD with structured fields and timestamps
\- Implemented safe CRUD handlers for users and tokis with validation and clear error responses

