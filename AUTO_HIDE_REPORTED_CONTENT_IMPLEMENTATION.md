# Auto-Hide Reported Content - Implementation Complete

## Summary

Implemented automatic hiding of reported Tokis from the reporter's view until admin review is complete. This provides immediate feedback and removes potentially offensive content from their feed.

## Changes Made

### Backend - Auto-Hide on Report

**File**: `toki-backend/src/routes/reports.ts`

After successfully creating a Toki report, the system now automatically:
1. Inserts the Toki into `user_hidden_activities` table for the reporter
2. Uses `ON CONFLICT DO NOTHING` to handle cases where user already manually hid it
3. Logs the auto-hide action

**Result**: Reported Toki is immediately hidden from reporter's discover feed, saved tokis, and all other views.

### Backend - Conditional Unhide on Admin Decision

**File**: `toki-backend/src/routes/admin.ts`

When admin reviews a report:
- **If Dismissed** (false alarm): Automatically unhides the Toki for the reporter by removing from `user_hidden_activities`
- **If Resolved** (content was problematic): Keeps the Toki hidden for the reporter
- Includes error handling so unhide failures don't break the review process

**Result**: Fair outcome - false alarms restore content, valid reports keep content hidden.

### Frontend - Enhanced Report Flow

**File**: `app/toki-details.tsx`

Updated `handleReportToki` to:
1. Submit the report (backend auto-hides it)
2. Refresh the discover feed to remove from view
3. Show detailed success message explaining what happened
4. Automatically navigate back since Toki is now hidden

**Success message**: "Thank you for your report. This Toki has been hidden from your feed while we review it. You'll be able to see it again if our review determines it doesn't violate our guidelines."

## User Experience Flow

### Reporting Flow:
1. User sees inappropriate Toki
2. Clicks "Report Toki" button (red flag icon)
3. Enters reason and submits
4. **Backend auto-hides Toki** (new!)
5. Feed refreshes and Toki disappears
6. Success message explains what happened
7. Navigates back automatically

### Admin Review Flow:
1. Admin sees report in Reports tab
2. Reviews the content
3. **If Dismissed**: Toki automatically unhidden for reporter (new!)
4. **If Resolved**: Toki stays hidden for reporter (new!)

## Technical Details

### Database Operations

**On Report Creation:**
```sql
INSERT INTO user_hidden_activities (user_id, toki_id, hidden_at)
VALUES (reporter_id, toki_id, NOW())
ON CONFLICT (user_id, toki_id) DO NOTHING
```

**On Admin Dismissal:**
```sql
DELETE FROM user_hidden_activities 
WHERE user_id = reporter_id AND toki_id = content_id
```

### Edge Cases Handled

1. ✅ User reports Toki they already manually hid → No error (ON CONFLICT)
2. ✅ Admin dismisses report → Toki reappears in feed
3. ✅ Admin resolves report → Toki stays hidden permanently
4. ✅ Unhide operation fails → Doesn't break report status update
5. ✅ Multiple users report same Toki → Each has it hidden independently

## Files Modified

1. `toki-backend/src/routes/reports.ts` - Added auto-hide after report creation
2. `toki-backend/src/routes/admin.ts` - Added conditional unhide on admin decision
3. `app/toki-details.tsx` - Updated report handler with feed refresh and better messaging

## Testing Checklist

- [ ] Report a Toki → Verify it disappears from discover feed
- [ ] Check database → Verify entry in user_hidden_activities
- [ ] Admin dismisses report → Verify Toki reappears in feed
- [ ] Admin resolves report → Verify Toki stays hidden
- [ ] Report already-hidden Toki → Verify no error
- [ ] Success message displays correctly
- [ ] Navigation back works after report

## Benefits

1. **Immediate Feedback**: User sees instant action on their report
2. **Improved Safety**: Potentially offensive content removed immediately
3. **Fair Outcomes**: False alarms restore content, valid reports keep it hidden
4. **Better UX**: Clear messaging about what happened and what to expect
5. **Leverages Existing System**: Uses proven user_hidden_activities infrastructure

## Next Steps

1. Test the reporting flow end-to-end
2. Test admin review and dismissal flow
3. Verify edge cases work correctly
4. Consider adding similar auto-hide for reported user profiles (optional)

Implementation complete and ready for testing!
