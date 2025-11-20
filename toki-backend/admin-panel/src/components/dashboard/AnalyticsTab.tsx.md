# File: AnalyticsTab.tsx

### Summary
This file contains the Analytics Dashboard tab component for the admin panel. It displays four individual line charts in a 2x2 grid, each showing one key metric over time: active users, total accounts, unique logins today, and tokis created today. The component includes summary cards and a time range selector with hour-based options.

### Features
- Four individual line charts in 2x2 grid layout using Recharts library
- Time range selector with 7 options: last hour, 12 hours, 24 hours, 3 days, 7 days, 14 days, 30 days
- Summary cards showing current values for each metric
- Dynamic date formatting (hour format for short ranges, day format for longer ranges)
- Loading and error states
- Responsive design matching admin panel styling

### Fixes Applied log
- Enhanced: Split single combined chart into 4 individual charts in 2x2 grid
- Enhanced: Added hour-based time ranges (1h, 12h, 24h, 3d, 7d, 14d, 30d)
- Enhanced: Updated date formatting to handle both hour and day granularity

### How Fixes Were Implemented
- Refactored AnalyticsTab to use hours parameter instead of days
- Created ChartCard component for individual metric charts
- Arranged charts in CSS Grid with 2 columns
- Updated formatDate function to conditionally format based on time range (groupByHour)
- Added angled X-axis labels for hour-based views
- Each chart displays one metric with its own color and title
- Updated API integration to use hours parameter

