# File: TokiFilters.tsx

### Summary
This file contains a reusable TokiFilters component that provides filtering functionality for Toki events. It supports both basic and advanced filtering options and can be used across different screens like explore and discover.

### Fixes Applied log
- **problem**: Duplicated filter modal code across multiple screens
- **solution**: Created a reusable TokiFilters component that can be shared between explore and discover screens

### How Fixes Were Implemented
- **problem**: No centralized filter component for consistent UI across the app
- **solution**: 
  1. Created a flexible TokiFilters component with props-based configuration
  2. Added support for basic filters (visibility, category, distance, availability, participants)
  3. Added advanced filters mode with sorting options (sortBy, sortOrder)
  4. Implemented proper option labeling for different filter types
  5. Added participants filter with ranges: 1-10, 10-50, 50-100, 100+
  6. Made the component reusable with clear props interface

- **problem**: Inconsistent filter UI between different screens
- **solution**: Standardized the filter modal design with consistent styling and behavior across all usage
