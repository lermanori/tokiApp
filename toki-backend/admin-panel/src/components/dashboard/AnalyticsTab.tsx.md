# File: AnalyticsTab.tsx

### Summary
This file contains the Analytics Dashboard tab component for the admin panel. It displays a line chart showing four key metrics over time: active users, total accounts, unique logins today, and tokis created today. The component includes summary cards and a time range selector.

### Features
- Line chart with 4 metrics using Recharts library
- Time range selector (7, 30, 90, 180 days)
- Summary cards showing current values for each metric
- Loading and error states
- Responsive design matching admin panel styling

### Fixes Applied
- N/A (new component)

### How Fixes Were Implemented
- Created AnalyticsTab component with Recharts LineChart
- Integrated with adminApi.getAnalytics endpoint
- Added time range selector with dropdown
- Implemented summary cards matching WaitlistStats styling
- Added proper error handling and loading states
- Used glassmorphism styling consistent with admin panel design system

