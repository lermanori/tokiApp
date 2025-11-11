### Summary
Tokis routes including listing, nearby search, and tag utilities. Updated to enforce a 500 km default/cap for proximity filtering.

### Fixes Applied log
- problem: Nearby endpoint defaulted to 10 km and capped at 100 km.
- solution: Increased default to 500 km and cap to 500 km in `/tokis/nearby`.
- problem: Main `/tokis` endpoint calculated distance but did not filter by radius.
- solution: Added Haversine WHERE clause using `userLatitude`, `userLongitude`, and `radius` with default/cap at 500 km.

### How Fixes Were Implemented
- Changed the default `radius` to `'500'` and computed `radiusKm = Math.min(parseFloat(radius) || 500, 500)` in `/nearby`.
- In the main list route, when `userLatitude`/`userLongitude` are provided, appended a distance condition `<= radiusKm`, pushing parameters in order `[lat, lng, radiusKm]`.

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
