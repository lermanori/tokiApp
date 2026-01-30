# Toki Time Handling Flow - Complete Analysis

## Overview

The Toki app uses a **dual-field time system**:
- `timeSlot`: String enum for quick relative time selection (e.g., 'now', '30min', 'tonight')
- `scheduledTime`: Precise absolute datetime (format: `YYYY-MM-DD HH:MM`)

---

## FLOW 1: User Creates a Toki (Manual)

### Step 1: User Selects Time in UI

**File:** `components/TokiForm.tsx`

**Available Time Slots:**
```typescript
const timeSlots = [
  'Now', '30 min', '1 hour', '2 hours', '3 hours', 'Tonight', 'Tomorrow',
  '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM',
  '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM'
];
```

**State Variables:**
```typescript
selectedTime = '30 min'           // The slot or 'custom'
customDateTime = '2025-01-27 14:00'  // YYYY-MM-DD HH:MM format
```

### Step 2: Time Slot -> DateTime Conversion

When user selects a slot, `getScheduledTimeFromSlot()` converts it:

```typescript
// EXAMPLE: User selects "30 min" at 2:00 PM
'30 min' -> new Date(now.getTime() + 30 * 60 * 1000).toISOString()
         -> '2025-01-27T14:30:00.000Z'

// EXAMPLE: User selects "Tonight"
'Tonight' -> tonight.setHours(19, 0, 0, 0) -> '2025-01-27T19:00:00.000Z'

// EXAMPLE: User selects "9:00 AM" (already passed today)
'9:00 AM' -> tomorrow at 9:00 AM -> '2025-01-28T09:00:00.000Z'
```

### Step 3: Form Submission -> AppContext

**TokiForm sends:**
```javascript
{
  time: '30 min',                    // The selected slot
  customDateTime: '2025-01-27 14:30' // Computed datetime (or custom picker value)
}
```

### Step 4: AppContext -> API Service

**File:** `contexts/AppContext.tsx` (createToki function)

**Transforms to:**
```javascript
{
  timeSlot: '30 min',
  scheduledTime: '2025-01-27 14:30',  // From customDateTime or computed
  // ... other fields
}
```

### Step 5: Backend Receives & Stores

**File:** `toki-backend/src/routes/tokis.ts`

**SQL Insert:**
```sql
INSERT INTO tokis (time_slot, scheduled_time, ...)
VALUES ('30 min', '2025-01-27 14:30', ...)
```

**Database Schema:**
```sql
time_slot VARCHAR(50)      -- Stores: '30 min'
scheduled_time TIMESTAMP   -- Stores: 2025-01-27 14:30:00
```

### Step 6: API Response Transformation

**Backend returns:**
```javascript
{
  timeSlot: row.time_slot,  // '30 min'
  scheduledTime: new Date(row.scheduled_time)
                   .toISOString()
                   .replace('T', ' ')
                   .slice(0, 16),  // '2025-01-27 14:30'
}
```

---

## FLOW 2: Fetching & Displaying Tokis

### Step 1: API Response

**GET /tokis returns:**
```json
{
  "id": "abc-123",
  "title": "Coffee Meetup",
  "timeSlot": "30 min",
  "scheduledTime": "2025-01-27 14:30",
  "createdAt": "2025-01-27T14:00:00.000Z"
}
```

### Step 2: Frontend Display Formatting

**File:** `utils/tokiUtils.ts` - `formatTimeDisplay()`

**Logic:**
```typescript
const formatTimeDisplay = (time, scheduledTime) => {
  if (scheduledTime) {
    const date = new Date(scheduledTime + 'Z');  // Treat as UTC

    // Compare to today/tomorrow
    if (isToday(date))     return `today at ${formatTime(date)}`;
    if (isTomorrow(date))  return `tomorrow at ${formatTime(date)}`;
    else                   return `${formatDate(date)} at ${formatTime(date)}`;
  }

  // Fallback to timeSlot
  return time || 'Time TBD';
};
```

### Step 3: Display Examples

| scheduledTime Input | Display Output |
|---------------------|----------------|
| `'2025-01-27 14:30'` (today) | `today at 2:30 PM` |
| `'2025-01-28 09:00'` (tomorrow) | `tomorrow at 9:00 AM` |
| `'2025-02-01 19:00'` (later) | `01/02/25 at 7:00 PM` |
| `null` with timeSlot='Now' | `Now` |
| `null` with timeSlot='30 min' | `30 min` |

---

## FLOW 3: Batch Upload

### Step 1: JSON File Structure

**File:** `toki-backend/BATCH_UPLOAD_LLM_GUIDE.md`

```json
{
  "tokis": [
    {
      "title": "Morning Yoga",
      "location": "Central Park",
      "timeSlot": "morning",
      "scheduledTime": "2025-11-15T09:00:00Z",
      "category": "wellness",
      "host_id": "123e4567-e89b-12d3-a456-426614174000"
    }
  ]
}
```

**Valid timeSlot values (case-sensitive, lowercase):**
```
now, 30min, 1hour, 2hours, 3hours, tonight, tomorrow, morning, afternoon, evening
```

### Step 2: Validation

**File:** `toki-backend/src/utils/batchUploadValidation.ts`

```typescript
const VALID_TIME_SLOTS = [
  'now', '30min', '1hour', '2hours', '3hours',
  'tonight', 'tomorrow', 'morning', 'afternoon', 'evening'
];

// Validation check
if (!VALID_TIME_SLOTS.includes(toki.timeSlot)) {
  errors.push(`Invalid timeSlot: ${toki.timeSlot}`);
}
```

**Note:** `scheduledTime` has no strict format validation - accepts any parseable datetime string.

### Step 3: Database Insert

**File:** `toki-backend/src/routes/admin.ts`

```sql
INSERT INTO tokis (time_slot, scheduled_time, ...)
VALUES ('morning', '2025-11-15 09:00:00', ...)
```

### Step 4: Admin Panel Preview Display

**File:** `toki-backend/admin-panel/src/components/tokis/TokiDetailsPreviewModal.tsx`

```typescript
// Formats for display
formatTimeSlot('morning')  -> 'Morning'
formatTimeSlot('30min')    -> '30 min'

// Shows both fields
<InfoItem label="Time Slot" value="Morning" />
<InfoItem label="Scheduled Time" value="Nov 15, 2025, 9:00 AM" />
```

---

## Concrete Example: Full Round Trip

### Scenario: User creates "Coffee at 3 PM" tomorrow

**1. UI Selection:**
```
User taps: "3:00 PM" time slot
```

**2. TokiForm State:**
```javascript
selectedTime = 'custom'
customDateTime = '2025-01-28 15:00'  // Tomorrow at 3 PM
```

**3. API Request Body:**
```json
{
  "title": "Coffee Chat",
  "timeSlot": "3:00 PM",
  "scheduledTime": "2025-01-28 15:00",
  "category": "coffee"
}
```

**4. Database Row:**
```
time_slot: '3:00 PM'
scheduled_time: 2025-01-28 15:00:00
```

**5. API Response:**
```json
{
  "timeSlot": "3:00 PM",
  "scheduledTime": "2025-01-28 15:00"
}
```

**6. TokiCard Display:**
```
"tomorrow at 3:00 PM"
```

**7. After Tomorrow Passes:**
```
"28/01/25 at 3:00 PM"
```

---

## Key Files Reference

| Component | File Path |
|-----------|-----------|
| Time picker UI | `components/TokiForm.tsx` |
| Create toki logic | `contexts/AppContext.tsx` (lines 1408-1478) |
| API service | `services/api.ts` |
| Backend routes | `toki-backend/src/routes/tokis.ts` |
| Display formatting | `utils/tokiUtils.ts` |
| Toki card | `components/TokiCard.tsx` |
| Toki details | `app/toki-details.tsx` |
| Batch validation | `toki-backend/src/utils/batchUploadValidation.ts` |
| Batch upload | `toki-backend/src/routes/admin.ts` (lines 2563-2785) |
| Database schema | `toki-backend/src/config/database-setup.sql` |

---

## Important Notes

1. **Timezone Handling:** Backend uses `TIMESTAMP` (no timezone). Frontend adds `'Z'` suffix to interpret as UTC.

2. **12-Hour Filter:** Tokis are hidden 12 hours after their `scheduled_time`:
   ```sql
   WHERE scheduled_time >= NOW() - INTERVAL '12 hours'
   ```

3. **Batch vs Manual TimeSlots:** Batch upload uses lowercase (`'30min'`), manual UI uses display format (`'30 min'`).

4. **scheduledTime Priority:** Display logic uses `scheduledTime` if available, falls back to `timeSlot` text.
