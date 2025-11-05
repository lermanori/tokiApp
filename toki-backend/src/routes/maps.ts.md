### Summary
`routes/maps.ts` proxies Google Maps APIs. Added both forward geocode (address → lat/lng) and reverse geocode (lat/lng → label) endpoints to support profile and Toki flows on web and mobile.

### Fixes Applied log
- problem: Edit Profile relied on Expo reverse geocoding which doesn’t work on web reliably, and precise addresses could be exposed.
- solution: Added `GET /api/maps/reverse-geocode?lat=..&lng=..` using Google Geocoding with caching and safe, approximate labeling (neighborhood/city/region only).
- problem: When only a location string was submitted in profile updates, coordinates were missing or stale.
- solution: Added `GET /api/maps/geocode?address=...` (forward geocoding) to convert typed addresses to coordinates in a consistent, cached manner.

### How Fixes Were Implemented
- Implemented `/reverse-geocode` route that:
  - Validates `lat`/`lng` query params
  - Calls `https://maps.googleapis.com/maps/api/geocode/json`
  - Derives `shortLabel` from coarse components only (neighborhood → city → region → country)
  - Filters out precise components (street, route, house number) and omits `formatted_address`
  - Returns `{ shortLabel, neighborhood, city, region, country, components }`
- Reused the in-memory cache for 5-minute TTL.

- Implemented `/geocode` route that:
  - Validates `address` query param and trims input
  - Calls `https://maps.googleapis.com/maps/api/geocode/json`
  - Returns `{ formatted_address, shortLabel, location: { lat, lng }, components }`
  - Uses the same in-memory cache with 5-minute TTL.

