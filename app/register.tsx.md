# File: register.tsx

### Summary
This file contains the registration screen for users who have received an invitation. Validates invitation codes and allows users to create accounts that skip the waitlist. Includes location autocomplete and current location functionality.

### Fixes Applied log
- Added location autocomplete using Google Places API
- Added "Use current location" button with location permissions
- Changed redirect after successful registration to go to login page instead of auto-login
- Added latitude and longitude support for location

### How Fixes Were Implemented
- Imported Location from expo-location and getBackendUrl from services/config
- Added state for placesPredictions, showAutocomplete, placesSessionToken, isLocating, latitude, longitude
- Implemented handleLocationTextChange to fetch autocomplete suggestions from backend
- Implemented handlePredictionSelect to get place details and set location with coordinates
- Implemented useCurrentLocation to get GPS location and reverse geocode to address
- Updated location input UI with MapPin icon and "Use current" button
- Added autocomplete dropdown with predictions
- Changed success redirect from '/(tabs)' to '/login'
- Removed auto-login logic (no longer saves tokens or updates user state)
- Updated backend to accept and store latitude/longitude in invitation registration
