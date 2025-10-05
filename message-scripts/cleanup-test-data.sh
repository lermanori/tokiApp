#!/usr/bin/env bash
# Cleanup test data script
# 
# Purpose: Clean up test tokis and notifications created during testing
#   1. Connect to database
#   2. Remove test tokis created by test@example.com
#   3. Remove test notifications
#   4. Remove test invites and participants
#   5. Show cleanup summary
#
# Usage: ./cleanup-test-data.sh
# Note: Requires DATABASE_URL to be set in toki-backend/.env

set -euo pipefail

# Load DATABASE_URL from backend .env if available
if [[ -f "toki-backend/.env" ]]; then
  export $(grep DATABASE_URL toki-backend/.env | xargs)
fi

# Helper: Print section headers
say() { printf "\n==== %s ====\n" "$*"; }

# Helper: Execute SQL and show results
execute_sql() {
  local description="$1"
  local sql="$2"
  
  say "$description"
  if [[ -n "${DATABASE_URL:-}" ]]; then
    psql "$DATABASE_URL" -c "$sql" || echo "  (Note: Some cleanup may have failed)"
  else
    echo "  (Skipping - DATABASE_URL not set)"
    echo "  SQL: $sql"
  fi
}

# Helper: Count records before cleanup
count_records() {
  local table="$1"
  local where_clause="${2:-}"
  
  if [[ -n "${DATABASE_URL:-}" ]]; then
    local count_sql="SELECT COUNT(*) as count FROM $table"
    if [[ -n "$where_clause" ]]; then
      count_sql="$count_sql WHERE $where_clause"
    fi
    psql "$DATABASE_URL" -t -c "$count_sql" | tr -d ' ' || echo "0"
  else
    echo "0"
  fi
}

say "Starting cleanup of test data..."

# Get test user ID
TEST_USER_ID=""
if [[ -n "${DATABASE_URL:-}" ]]; then
  TEST_USER_ID=$(psql "$DATABASE_URL" -t -c "SELECT id FROM users WHERE email = 'test@example.com';" | tr -d ' ' || echo "")
fi

if [[ -z "$TEST_USER_ID" ]]; then
  echo "⚠️  Could not find test@example.com user ID. Some cleanup may be incomplete."
  TEST_USER_ID="'test@example.com'"
else
  echo "Found test user ID: $TEST_USER_ID"
fi

# Count records before cleanup
say "Counting records before cleanup..."
TOKIS_BEFORE=$(count_records "tokis" "host_id = '$TEST_USER_ID'")
NOTIFICATIONS_BEFORE=$(count_records "notifications" "user_id = '$TEST_USER_ID' OR message LIKE '%invite%' OR message LIKE '%join%'")
INVITES_BEFORE=$(count_records "toki_invites" "invited_by = '$TEST_USER_ID'")
PARTICIPANTS_BEFORE=$(count_records "toki_participants" "toki_id IN (SELECT id FROM tokis WHERE host_id = '$TEST_USER_ID')")

echo "Before cleanup:"
echo "  - Tokis: $TOKIS_BEFORE"
echo "  - Notifications: $NOTIFICATIONS_BEFORE"
echo "  - Invites: $INVITES_BEFORE"
echo "  - Participants: $PARTICIPANTS_BEFORE"

# Cleanup 1: Remove test participants
execute_sql "Removing test participants" "
DELETE FROM toki_participants 
WHERE toki_id IN (
  SELECT id FROM tokis 
  WHERE host_id = '$TEST_USER_ID' 
  AND (title LIKE '%Test%' OR title LIKE '%Invite%' OR title LIKE '%Join%')
);"

# Cleanup 2: Remove test invites
execute_sql "Removing test invites" "
DELETE FROM toki_invites 
WHERE invited_by = '$TEST_USER_ID' 
OR toki_id IN (
  SELECT id FROM tokis 
  WHERE host_id = '$TEST_USER_ID' 
  AND (title LIKE '%Test%' OR title LIKE '%Invite%' OR title LIKE '%Join%')
);"

# Cleanup 2.5: Remove test invite links
execute_sql "Removing test invite links" "
DELETE FROM toki_invite_links 
WHERE created_by = '$TEST_USER_ID' 
OR toki_id IN (
  SELECT id FROM tokis 
  WHERE host_id = '$TEST_USER_ID' 
  AND (title LIKE '%Test%' OR title LIKE '%Invite%' OR title LIKE '%Join%')
);"

# Cleanup 3: Remove test notifications
execute_sql "Removing test notifications" "
DELETE FROM notifications 
WHERE user_id = '$TEST_USER_ID' 
OR message LIKE '%invite%' 
OR message LIKE '%join%' 
OR message LIKE '%Test%' 
OR message LIKE '%Invite%';"

# Cleanup 4: Remove test tokis
execute_sql "Removing test tokis" "
DELETE FROM tokis 
WHERE host_id = '$TEST_USER_ID' 
AND (title LIKE '%Test%' OR title LIKE '%Invite%' OR title LIKE '%Join%');"

# Count records after cleanup
say "Counting records after cleanup..."
TOKIS_AFTER=$(count_records "tokis" "host_id = '$TEST_USER_ID'")
NOTIFICATIONS_AFTER=$(count_records "notifications" "user_id = '$TEST_USER_ID' OR message LIKE '%invite%' OR message LIKE '%join%'")
INVITES_AFTER=$(count_records "toki_invites" "invited_by = '$TEST_USER_ID'")
PARTICIPANTS_AFTER=$(count_records "toki_participants" "toki_id IN (SELECT id FROM tokis WHERE host_id = '$TEST_USER_ID')")

echo "After cleanup:"
echo "  - Tokis: $TOKIS_AFTER"
echo "  - Notifications: $NOTIFICATIONS_AFTER"
echo "  - Invites: $INVITES_AFTER"
echo "  - Participants: $PARTICIPANTS_AFTER"

# Show cleanup summary
say "Cleanup Summary"
echo "Removed:"
echo "  - Tokis: $((TOKIS_BEFORE - TOKIS_AFTER))"
echo "  - Notifications: $((NOTIFICATIONS_BEFORE - NOTIFICATIONS_AFTER))"
echo "  - Invites: $((INVITES_BEFORE - INVITES_AFTER))"
echo "  - Participants: $((PARTICIPANTS_BEFORE - PARTICIPANTS_AFTER))"

say "Cleanup completed!"
