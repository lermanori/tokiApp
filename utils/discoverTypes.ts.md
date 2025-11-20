# File: utils/discoverTypes.ts

### Summary
Type definitions for Discover screens: TokiEvent interface and related types for filtering and map regions.

### Fixes Applied log
- problem: `createdAt` field was missing from `TokiEvent` interface, preventing creation date sorting from working.
- solution: Added `createdAt?: string;` to the `TokiEvent` interface to match the API response structure.

### How Fixes Were Implemented
- Added optional `createdAt` field to `TokiEvent` interface to support sorting by creation date.
- This field is populated from the API response and used by the sorting utility in `sortTokis.ts`.

