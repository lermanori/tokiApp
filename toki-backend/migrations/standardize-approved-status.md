# Migration: Standardize Participant Status to 'approved'

## Summary
This migration standardizes the participant status system to use only 'approved' instead of having both 'approved' and 'joined' statuses. This fixes the inconsistency where most participants had 'approved' status but the database trigger only counted 'joined' status.

## Changes Made

### 1. Database Trigger
- Updated `update_participant_count()` function in `database-setup.sql` to count 'approved' status instead of 'joined'
- All trigger conditions now check for 'approved' status

### 2. Code Updates
- **tokis.ts**: Updated all status assignments and COUNT queries
- **inviteLinkUtils.ts**: Updated status checks and assignments
- **saved-tokis.ts**: Updated COUNT query
- **messages.ts**: Updated all status checks
- **auth.ts**: Updated status checks
- **activity.ts**: Updated status checks
- **connections.ts**: Updated status checks
- **WeightedRecommendationAlgorithm.ts**: Updated status check

### 3. Database Schema
- Updated default status from 'joined' to 'approved'
- Updated CHECK constraint to remove 'joined' from allowed values
- Updated comment to reflect new status values

## Migration Steps

1. **Run the trigger update** (already in database-setup.sql):
   ```sql
   -- The trigger function is updated to count 'approved'
   ```

2. **Run the migration script**:
   ```bash
   psql $DATABASE_URL -f migrations/standardize-approved-status.sql
   ```

   Or manually:
   ```sql
   -- Convert existing 'joined' records to 'approved'
   UPDATE toki_participants 
   SET status = 'approved' 
   WHERE status = 'joined';

   -- Recalculate current_attendees for all tokis
   UPDATE tokis t
   SET current_attendees = (
     SELECT COALESCE(COUNT(*), 0) + 1 
     FROM toki_participants tp 
     WHERE tp.toki_id = t.id AND tp.status = 'approved'
   );
   ```

## Testing

After running the migration:
1. Verify that all 'joined' records were converted to 'approved'
2. Verify that `current_attendees` matches the actual count of 'approved' participants
3. Test that new participants get 'approved' status when joining
4. Test that the trigger correctly updates `current_attendees` when participants are added/removed

## Rollback

If needed, you can rollback by:
1. Reverting code changes
2. Running:
   ```sql
   UPDATE toki_participants SET status = 'joined' WHERE status = 'approved';
   UPDATE tokis t SET current_attendees = (SELECT COALESCE(COUNT(*), 0) + 1 FROM toki_participants tp WHERE tp.toki_id = t.id AND tp.status = 'joined');
   ```

