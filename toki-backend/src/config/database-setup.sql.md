# File: database-setup.sql

### Summary
Database schema setup file for the Toki backend. Defines all tables, indexes, triggers, and functions needed for the application.

### Fixes Applied log
- problem: Added support for unlimited max attendees (NULL value)
- solution: Updated max_attendees column comment to indicate NULL means unlimited

- problem: Added auto-approve feature for join requests
- solution: Added auto_approve BOOLEAN column with DEFAULT FALSE to tokis table

### How Fixes Were Implemented
- Updated max_attendees column comment to clarify NULL = unlimited
- Added auto_approve BOOLEAN DEFAULT FALSE column to tokis table to enable automatic approval of join requests when enabled by the host
