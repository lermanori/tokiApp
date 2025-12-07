-- Migration: Standardize participant status to 'approved'
-- This migration converts all 'joined' status records to 'approved'
-- and recalculates current_attendees for all tokis

-- Step 1: Convert existing 'joined' records to 'approved'
UPDATE toki_participants 
SET status = 'approved' 
WHERE status = 'joined';

-- Step 2: Recalculate current_attendees for all tokis based on 'approved' status
-- This ensures the stored count matches the actual participant count
UPDATE tokis t
SET current_attendees = (
  SELECT COALESCE(COUNT(*), 0) + 1 
  FROM toki_participants tp 
  WHERE tp.toki_id = t.id AND tp.status = 'approved'
);

-- Note: The trigger function update_participant_count() has been updated
-- to count 'approved' status instead of 'joined', so future changes
-- will automatically maintain correct counts.



