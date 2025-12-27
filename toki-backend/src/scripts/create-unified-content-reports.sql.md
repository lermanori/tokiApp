# File: create-unified-content-reports.sql

### Summary
Database migration script that creates the unified `content_reports` table for Apple App Review compliance. This table centralizes reporting for all content types (Tokis, Users, Messages) with proper indexes and constraints.

### Fixes Applied
- Created: New unified reporting table for Task 1.2
- Added: Performance indexes on commonly queried columns
- Added: Unique constraint to prevent duplicate pending reports
- Added: Composite index for type+ID queries

### How Fixes Were Implemented
- Created table with flexible content_type field to support multiple content types
- Added status tracking for report lifecycle (pending → reviewed/resolved/dismissed)
- Implemented unique constraint that only applies to pending reports (allows historical tracking)
- Added proper foreign key references with CASCADE deletes for data integrity
