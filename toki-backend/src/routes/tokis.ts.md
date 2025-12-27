# File: tokis.ts

### Summary
This file handles all Toki-related endpoints including listing, creating, updating, joining, invites, and more. It contains the main GET / endpoint for fetching Tokis with filters and the GET /nearby endpoint for location-based discovery.

### Fixes Applied Log
- **Problem**: Reported Tokis were still visible to the reporter in all feeds
- **Solution**: Added `user_hidden_activities` filter to both main GET / endpoint (line 566-569) and GET /nearby endpoint (line 1047-1052)

### How Fixes Were Implemented
- **Problem**: The main Tokis query filtered `toki_hidden_users` but not `user_hidden_activities`
- **Solution**: Added `NOT EXISTS` subquery checking `user_hidden_activities` table for the current user's hidden Tokis
- **Problem**: The nearby endpoint also didn't filter hidden activities
- **Solution**: Added the same `user_hidden_activities` filter to the whereConditions clause, accounting for userId parameter position
- **Result**: Reported Tokis are now immediately hidden from all feeds for the reporter until admin decision
