# File: toki-backend/src/routes/tokis.ts

### Summary
This file contains the Toki routes including creation, retrieval, filtering, and nearby search functionality. The nearby endpoint supports pagination and returns total count for infinite scroll implementation.

### Fixes Applied log
- problem: Nearby endpoint did not support pagination, limiting results to 20 tokis and returning incorrect total count.
- solution: Added page parameter support, implemented COUNT query to get accurate total, added OFFSET for pagination, and returned pagination metadata with total count, totalPages, and hasMore flag.

### How Fixes Were Implemented
- Added `page` query parameter (defaults to 1) to `/nearby` endpoint
- Created separate COUNT query with identical WHERE conditions to get accurate total count before pagination
- Added OFFSET clause: `OFFSET = (page - 1) * limit` for pagination
- Updated response to include pagination metadata: `{ page, limit, total, totalPages, hasMore }`
- Changed `totalFound` in `searchParams` to use COUNT query result instead of `tokis.length`
