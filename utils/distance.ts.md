# File: distance.ts

### Summary
This utility file provides a shared function for formatting distance display consistently across the application. It handles both string format (legacy) and object format ({km, miles}) distances.

### Fixes Applied log
- problem: Distance formatting was duplicated in multiple components, leading to inconsistencies.
- solution: Created shared `formatDistanceDisplay` utility function that handles both string and object distance formats with consistent formatting rules.

### How Fixes Were Implemented
- problem: Inconsistent distance display between TokiCard and toki-details pages.
- solution: Extracted the distance formatting logic into a shared utility that:
  - Accepts either a string (e.g., "1.6 km") or an object with {km, miles}
  - Formats distances < 1km as meters (e.g., "500m")
  - Formats distances < 10km with one decimal (e.g., "1.6km")
  - Formats distances >= 10km as whole numbers (e.g., "15km")
  - Returns empty string if distance is undefined

