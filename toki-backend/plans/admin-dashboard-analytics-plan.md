# Admin Dashboard Analytics Plan

## Overview
Add an Analytics Dashboard tab to the admin panel with a line chart showing key metrics over time.

## Metrics to Display

### 1. Active Users
- **Definition**: Users who have been active (updated_at) within the last 7 days
- **Time Series**: Daily count of active users (users with updated_at in that day)

### 2. Overall Account Number
- **Definition**: Total count of all user accounts
- **Time Series**: Cumulative count of users created up to each day

### 3. Unique Logins Today
- **Definition**: Count of unique users who logged in today (using updated_at as proxy)
- **Time Series**: Daily count of unique logins

### 4. Tokis Created Today
- **Definition**: Count of tokis created on each day
- **Time Series**: Daily count of tokis created

## Implementation Steps

### Backend (toki-backend/src/routes/admin.ts)

1. **Create `/api/admin/analytics` endpoint**
   - Accept query params: `days` (default: 30) for time range
   - Return time-series data for all 4 metrics
   - Data structure:
     ```typescript
     {
       success: true,
       data: {
         timeSeries: [
           {
             date: "2025-01-15",
             activeUsers: 45,
             totalAccounts: 1200,
             uniqueLoginsToday: 38,
             tokisCreatedToday: 12
           },
           // ... more dates
         ],
         summary: {
           currentActiveUsers: 45,
           totalAccounts: 1200,
           uniqueLoginsToday: 38,
           tokisCreatedToday: 12
         }
       }
     }
     ```

2. **SQL Queries Needed**:
   - Active users per day: `SELECT DATE(updated_at) as date, COUNT(DISTINCT id) FROM users WHERE updated_at >= NOW() - INTERVAL 'X days' GROUP BY DATE(updated_at)`
   - Total accounts per day: `SELECT DATE(created_at) as date, COUNT(*) OVER (ORDER BY DATE(created_at)) FROM users GROUP BY DATE(created_at)`
   - Unique logins today: `SELECT COUNT(DISTINCT id) FROM users WHERE DATE(updated_at) = CURRENT_DATE`
   - Tokis created per day: `SELECT DATE(created_at) as date, COUNT(*) FROM tokis GROUP BY DATE(created_at)`

### Frontend (toki-backend/admin-panel)

1. **Install Charting Library**
   - Add `recharts` to package.json dependencies
   - Recharts is React-friendly and works well with TypeScript

2. **Create AnalyticsTab Component**
   - Location: `admin-panel/src/components/dashboard/AnalyticsTab.tsx`
   - Features:
     - Line chart with 4 lines (one per metric)
     - Time range selector (7, 30, 90 days)
     - Summary cards showing current values
     - Loading and error states
     - Responsive design matching admin panel styling

3. **Update Dashboard Component**
   - Add "Analytics" tab to navigation
   - Use BarChart icon from lucide-react
   - Add AnalyticsTab to content area

4. **Update adminApi Service**
   - Add `getAnalytics(days?: number)` method

## Design Considerations

### Chart Styling
- Match admin panel color scheme (purple gradients)
- Use distinct colors for each metric line
- Add legend for clarity
- Responsive width/height

### Data Aggregation
- Fill missing dates with 0 values for smooth chart rendering
- Handle edge cases (no data, single data point)

### Performance
- Cache analytics data if needed (optional)
- Limit default time range to 30 days
- Use efficient SQL queries with proper indexes

## File Structure

```
toki-backend/
├── src/
│   └── routes/
│       └── admin.ts (add analytics endpoint)
└── admin-panel/
    ├── package.json (add recharts)
    └── src/
        ├── components/
        │   └── dashboard/
        │       └── AnalyticsTab.tsx (new)
        └── services/
            └── adminApi.ts (add getAnalytics method)
```

## Testing Checklist

- [ ] Backend endpoint returns correct data structure
- [ ] Chart displays all 4 metrics correctly
- [ ] Time range selector works
- [ ] Summary cards show current values
- [ ] Handles empty data gracefully
- [ ] Responsive on different screen sizes
- [ ] Matches admin panel design system

