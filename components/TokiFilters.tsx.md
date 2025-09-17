# File: TokiFilters.tsx

### Summary
This file contains a reusable TokiFilters component that provides filtering functionality for Toki events. It supports both basic and advanced filtering options and can be used across different screens like explore and discover.

### Fixes Applied log
- **problem**: Duplicated filter modal code across multiple screens
- **solution**: Created a reusable TokiFilters component that can be shared between explore and discover screens
- **problem**: Missing time-based filtering (today/tomorrow/custom date)
- **solution**: Added a Time section with Today, Tomorrow, and Custom (date picker) that sets `dateFrom`/`dateTo` day ranges.

### How Fixes Were Implemented
- **problem**: No centralized filter component for consistent UI across the app
- **solution**: 
  1. Created a flexible TokiFilters component with props-based configuration
  2. Added support for basic filters (visibility, category, distance, availability, participants)
  3. Added advanced filters mode with sorting options (sortBy, sortOrder)
  4. Implemented proper option labeling for different filter types
  5. Added participants filter with ranges: 1-10, 10-50, 50-100, 100+
  6. Made the component reusable with clear props interface
  7. Added new "Time" filter:
     - Today/Tomorrow set `dateFrom` to start-of-day and `dateTo` to end-of-day (ISO)
     - Custom opens `react-native-ui-datepicker`; choosing a date sets `dateFrom/dateTo` for that date
