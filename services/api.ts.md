# File: api.ts

### Summary
This file provides the API service for making HTTP requests to the backend, managing authentication tokens, and handling all API interactions.

### Fixes Applied log
- problem: Hosts needed a way to mark Tokis as completed through the API.
- solution: Added completeToki method to the ApiService class for completing Tokis.

### How Fixes Were Implemented
- Added `completeToki(id: string)` method to the ApiService class.
- The method makes a PUT request to `/tokis/${id}/complete` endpoint.
- Returns a standardized response format with success status and optional message.
- Includes proper error handling and logging for debugging.
- This enables the frontend to communicate with the backend to mark Tokis as completed, which will trigger the rating system.
