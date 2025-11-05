# File: distance.ts

### Summary
This utility file provides shared functions for calculating and formatting distance display consistently across the application. It includes the Haversine formula for distance calculation and formatting functions for both string format (legacy) and object format ({km, miles}) distances.

### Fixes Applied log
- problem: Distance formatting was duplicated in multiple components, leading to inconsistencies.
- solution: Created shared `formatDistanceDisplay` utility function that handles both string and object distance formats with consistent formatting rules.
- problem: Distance was not being calculated when loading toki details, only using stale data from state.tokis
- solution: Added `calculateDistance` function using Haversine formula to calculate distance on the client side when needed

### How Fixes Were Implemented
- problem: Inconsistent distance display between TokiCard and toki-details pages.
- solution: Extracted the distance formatting logic into a shared utility that:
  - Accepts either a string (e.g., "1.6 km") or an object with {km, miles}
  - Formats distances < 1km as meters (e.g., "500m")
  - Formats distances < 10km with one decimal (e.g., "1.6km")
  - Formats distances >= 10km as whole numbers (e.g., "15km")
  - Returns empty string if distance is undefined
- problem: Distance not updating in toki details when navigating directly to the page
- solution:
  - Added `calculateDistance` function using Haversine formula (same as backend implementation)
  - Function takes two coordinate pairs (lat1, lon1, lat2, lon2) and returns distance in kilometers
  - Uses Earth's radius of 6371 km for accurate calculation
  - Rounds to 2 decimal places for consistency
  - Now toki-details can calculate distance on the client side using user's current location and toki's coordinates

