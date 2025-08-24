# Frontend-Backend Integration Test Checklist
## Date: July 26, 2025

## Authentication & User Management
- [x] User Login (email/password)
- [x] User Registration (name/email/password)
- [x] JWT Token Management (access/refresh)
- [x] Automatic Token Refresh
- [x] Logout Functionality
- [ ] Password Reset Request
- [ ] Password Reset (with token)
- [ ] Email Verification
- [x] Get Current User Profile
- [x] Update User Profile (name, bio, location)
- [ ] Upload User Avatar
- [x] Update Social Links (Instagram, TikTok, LinkedIn, Facebook)
- [x] Get User Statistics (tokis created, joined, connections, rating)
- [x] Profile Data Refresh
- [x] Block List Management
- [x] Auto-load User Data on Mount
- [x] Manual Refresh Button
- [x] Loading States
- [x] Error Handling
- [x] Rating Display Fix (NaN → 0.0)
- [x] Avatar Fallback Image
- [x] Member Since Fallback Text
- [x] Backend Data Structure Fix (nested response)
- [x] API Service Field Mapping Fix
- [x] Edit Profile Data Population Fix
- [x] Profile Data Loading Fix
- [x] Authentication Persistence Fix
- [x] Token Validation & Refresh
- [x] Session Expiration Handling
- [x] Logout Functionality

## Toki Management
- [x] Get All Tokis (with pagination, filtering, search)
- [x] Get Single Toki by ID
- [x] Create New Toki (title, description, location, time, category, max attendees, visibility, tags)
- [x] Update Toki (host only)
- [x] Delete Toki (host only)
- [ ] Upload Toki Image
- [ ] Get Toki Categories
- [ ] Get Popular Tags
- [ ] Search Tags
- [ ] Get Nearby Tokis (by location)
- [ ] Get Toki Participants
- [x] Join Toki Request (Frontend + Simulated Backend)
- [ ] Leave Toki
- [ ] Approve Join Request (host only)
- [ ] Decline Join Request (host only)

## User Connections
- [x] Get User Connections
- [x] Get Pending Connection Requests
- [x] Send Connection Request
- [x] Accept Connection Request
- [x] Decline Connection Request
- [x] Remove Connection

## User Ratings & Reviews
- [x] Get User Ratings/Reviews
- [x] Submit Rating/Review
- [x] Update Rating/Review
- [x] Delete Rating/Review
- [x] Get My Ratings (given by current user)

## User Blocking
- [x] Block User
- [x] Unblock User
- [x] Get Blocked Users
- [x] Get Users Who Blocked Me
- [x] Check Block Status

## User Search & Discovery
- [ ] Search Users (by name, location)
- [ ] Get User Profile by ID
- [ ] Get User's Created Tokis
- [ ] Get User's Joined Tokis
- [ ] Verify User (admin function)

## Messages (Not Yet Implemented)
- [ ] Get Toki Messages
- [ ] Send Message
- [ ] Delete Message
- [ ] Report Message

## Saved Tokis (Not Yet Implemented)
- [ ] Get Saved Tokis
- [ ] Save Toki
- [ ] Remove Saved Toki

## Notifications (Not Yet Implemented)
- [ ] Get Notifications
- [ ] Mark Notification as Read
- [ ] Mark All Notifications as Read
- [ ] Delete Notification

## UI Components & Pages
- [x] Login Screen
- [x] Registration Screen
- [x] Explore Feed (shows real data)
- [x] Create Toki Screen
- [x] Toki Details Screen
- [x] Edit/Delete Toki (host only)
- [x] User Profile Screen
- [x] Edit Profile Screen
- [x] Connections Screen
- [x] Messages Screen (UI ready, backend pending Phase 4)
- [x] Discover Map Screen
- [x] My Tokis Screen
- [ ] Saved Tokis Screen
- [ ] Notifications Screen

## Error Handling & UX
- [x] Backend Connection Status
- [x] Authentication Error Handling
- [x] Loading States
- [ ] Form Validation
- [ ] Image Upload Progress
- [ ] Offline Mode Handling
- [ ] Error Messages Display

## Testing Status
- [x] Backend Health Check
- [x] Authentication Flow
- [x] Toki Data Loading
- [ ] Toki Creation Flow
- [ ] User Profile Management
- [ ] Connection System
- [ ] Rating/Review System
- [ ] Blocking System

## Notes
- Backend is running on port 3002
- Frontend is running on port 8081/8082
- Test user: test@example.com / password123
- Sample Tokis are created in database
- CORS is configured for localhost:3000, 8081, 8082 