# File: parseApiError.ts

### Summary
This utility file provides error parsing functionality to normalize API errors into a consistent format for display in the ErrorModal component. It extracts error information from various error sources and maps HTTP status codes to user-friendly titles and messages.

### Fixes Applied log
- problem: Need consistent error handling across create/edit flows
- solution: Created parseApiError function that normalizes thrown errors from API calls into a structured ParsedError format with title, message, optional details array, and status code

### How Fixes Were Implemented
- problem: Different error sources (API responses, network errors, validation errors) need unified handling
- solution: Implemented parseApiError that:
  - Extracts status codes and messages from error objects
  - Maps status codes (400, 401, 403, 404, 409, 500+) to appropriate user-facing titles
  - Provides context-aware titles based on 'create' or 'edit' operations
  - Handles edge cases like string errors and missing error properties
  - Returns a consistent ParsedError type with title, message, optional details array, and status code

