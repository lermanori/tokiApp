### Summary
`routes/maps.ts` proxies Google Maps APIs. Added a reverse geocode endpoint to convert lat/lng to a concise neighborhood/city label for web and mobile.

### Fixes Applied log
- problem: Edit Profile relied on Expo reverse geocoding which doesn’t work on web reliably, and precise addresses could be exposed.
- solution: Added `GET /api/maps/reverse-geocode?lat=..&lng=..` using Google Geocoding with caching and safe, approximate labeling (neighborhood/city/region only).

### How Fixes Were Implemented
- Implemented `/reverse-geocode` route that:
  - Validates `lat`/`lng` query params
  - Calls `https://maps.googleapis.com/maps/api/geocode/json`
  - Derives `shortLabel` from coarse components only (neighborhood → city → region → country)
  - Filters out precise components (street, route, house number) and omits `formatted_address`
  - Returns `{ shortLabel, neighborhood, city, region, country, components }`
- Reused the in-memory cache for 5-minute TTL.

