# File: admin-tools.ts

### Summary
This file contains the admin-only MCP tools for creating, updating, and deleting Tokis. It handles API key authentication, validates inputs, and performs database operations with proper transaction management.

### Fixes Applied log
- **problem**: Location strings were not being automatically geocoded to latitude/longitude coordinates when coordinates were not explicitly provided, unlike the frontend behavior. Additionally, the location label was not being updated with the formatted address from Google, causing inconsistent location display.
- **solution**: Added automatic geocoding logic using Google Maps Geocoding API in both `create_toki` and `update_toki` handlers. If only a location string is provided (and coordinates are missing), the handler now automatically geocodes the location, extracts coordinates, and updates the location field with a formatted short label (e.g., "Rabin Square, Tel Aviv") using the same `buildShortLabel` function used by the frontend.

### How Fixes Were Implemented
- **Reused `buildShortLabel` function**: Exported `buildShortLabel` from `src/routes/maps.ts` and imported it in `admin-tools.ts` to ensure consistent address formatting across the application. This function formats addresses as "neighborhood, city" or "name, city" or "route, city", falling back to the first 2 parts of the formatted address.
- **Geocoding in `create_toki`**: Added geocoding logic after visibility validation and before database connection. If `latitude` and `longitude` are not provided but `location` is a valid string, the handler:
  1. Calls Google Maps Geocoding API to convert the location string to coordinates
  2. Extracts `formatted_address` and `address_components` from the response
  3. Uses `buildShortLabel` to create a concise location label (e.g., "Rabin Square, Tel Aviv")
  4. Updates `finalLocation` with the short label (or falls back to formatted address if no components)
  5. Uses the geocoded coordinates (`finalLatitude`, `finalLongitude`) and formatted location (`finalLocation`) in the database INSERT
- **Geocoding in `update_toki`**: Added similar geocoding logic after API key validation and before building the dynamic update query. If `location` is being updated but coordinates are not explicitly provided, the handler geocodes the location and updates both coordinates and location label. The geocoded coordinates and formatted location are then added to the update query only if the location was updated.
- **Error handling**: Both handlers include proper error handling with logging:
  - Success: Logs the formatted location label and coordinates with ✅ emoji
  - API errors: Logs warning with ⚠️ emoji and error details
  - Missing API key: Logs warning that geocoding is skipped
  - Exceptions: Logs error with ❌ emoji
- **Fallback behavior**: If geocoding fails or API key is missing, the handlers fall back to the original location string and `null` for coordinates (for create) or skip coordinate/location updates (for update), ensuring the operation doesn't fail due to geocoding issues.

