#!/usr/bin/env bash
# Test invite notification flow
# 
# Purpose: Test the invite notification system
#   1. Login as test@example.com (host)
#   2. Get test@example.com's toki ID (or create one if none exists)
#   3. Login as john@example.com
#   4. Remove John from toki participants (if exists)
#   5. Clean up any existing invites/notifications for this toki
#   6. Send invite from test to john
#   7. Fetch combined notifications for john to verify invite appears
#   8. Test accept/decline actions
#
# Usage: ./test-invite-notifications.sh [BACKEND] [TEST_EMAIL] [TEST_PASS] [JOHN_EMAIL] [JOHN_PASS]
# Example: ./test-invite-notifications.sh http://localhost:3002

set -euo pipefail

# Load DATABASE_URL from backend .env if available
if [[ -f "toki-backend/.env" ]]; then
  export $(grep DATABASE_URL toki-backend/.env | xargs)
fi

# Parse arguments with defaults
BACKEND=${1:-http://localhost:3002}
TEST_EMAIL=${2:-test@example.com}
TEST_PASS=${3:-password123}
JOHN_EMAIL=${4:-john@example.com}
JOHN_PASS=${5:-password123}

# Helper: Print section headers
say() { printf "\n==== %s ====\n" "$*"; }

# Helper: Login to backend and return full JSON response
login() {
  local email="$1" pass="$2"
  curl -s -X POST "$BACKEND/api/auth/login" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$email\",\"password\":\"$pass\"}"
}

# Helper: Decode and print JWT token info (header and payload)
decode_jwt() {
  local tok="$1"
  printf 'len=%s\n' "$(echo -n "$tok" | wc -c)"
  printf 'hdr=%s\n' "$(echo "$tok" | awk -F. '{print $1}' | tr '_-' '/+' | base64 -D 2>/dev/null || true)"
  printf 'pld=%s\n' "$(echo "$tok" | awk -F. '{print $2}' | tr '_-' '/+' | base64 -D 2>/dev/null || true)"
}

# STEP 1: Login as test@example.com (host)
say "Login as $TEST_EMAIL (host)"
TEST_LOGIN=$(login "$TEST_EMAIL" "$TEST_PASS")
# Print user info from response
printf '%s\n' "$TEST_LOGIN" | jq '.data.user | {id,email,name}' || true
# Extract access token
TEST_ACCESS=$(printf '%s' "$TEST_LOGIN" | jq -er '.data.tokens.accessToken')
TEST_ID=$(printf '%s' "$TEST_LOGIN" | jq -er '.data.user.id')
say "Test token"; decode_jwt "$TEST_ACCESS"

# STEP 2: Get test user's Tokis to find one to use for invites
say "Fetch test user's Tokis"
TOKIS_RESPONSE=$(curl -s "$BACKEND/api/tokis" -H "Authorization: Bearer $TEST_ACCESS")
# Get the first toki ID where test user is the host (safe if .data or .tokis is null)
TOKI_ID=$(printf '%s' "$TOKIS_RESPONSE" | jq -r --arg HOST "$TEST_ID" '(.data?.tokis? // []) | map(select(.host.id == $HOST)) | (.[0].id // empty)')

if [[ -z "$TOKI_ID" || "$TOKI_ID" == "null" ]]; then
  echo "⚠️  No tokis found hosted by test@example.com. Creating one..."
  # Create a test toki
  CREATE_RESPONSE=$(curl -s -X POST "$BACKEND/api/tokis" \
    -H "Authorization: Bearer $TEST_ACCESS" \
    -H 'Content-Type: application/json' \
    -d '{
      "title": "Test Toki for Invite Testing",
      "category": "coffee",
      "description": "Testing invite notifications",
      "location": "Test Location",
      "latitude": 40.7128,
      "longitude": -74.0060,
      "timeSlot": "evening",
      "scheduledTime": "2025-12-31T18:00:00Z",
      "maxAttendees": 10,
      "visibility": "private"
    }')
  TOKI_ID=$(printf '%s' "$CREATE_RESPONSE" | jq -er '.data.id')
  TOKI_TITLE="Test Toki for Invite Testing"
else
  TOKI_TITLE=$(printf '%s' "$TOKIS_RESPONSE" | jq -r --arg ID "$TOKI_ID" '(.data?.tokis? // []) | map(select(.id == $ID)) | (.[0].title // "Test Toki")')
fi
say "Selected Toki: $TOKI_TITLE (ID: $TOKI_ID)"

# STEP 3: Login as john@example.com
say "Login as $JOHN_EMAIL"
JOHN_LOGIN=$(login "$JOHN_EMAIL" "$JOHN_PASS")
# Print John's user info
printf '%s\n' "$JOHN_LOGIN" | jq '.data.user | {id,email,name}' || true
# Extract John's access token and ID
JOHN_ACCESS=$(printf '%s' "$JOHN_LOGIN" | jq -er '.data.tokens.accessToken')
JOHN_ID=$(printf '%s' "$JOHN_LOGIN" | jq -er '.data.user.id')
say "John token"; decode_jwt "$JOHN_ACCESS"
say "JOHN_ID=$JOHN_ID"

# STEP 4: Remove John from toki participants if already exists
# Since there's no leave endpoint, we'll use a direct SQL command
say "Clean up: Remove John from toki participants (if exists)"
# Create a temporary cleanup SQL file
cat > /tmp/cleanup_participant.sql <<EOF
DELETE FROM toki_participants 
WHERE toki_id = '${TOKI_ID}' AND user_id = '${JOHN_ID}';
EOF

# Execute via psql if DATABASE_URL is available, otherwise skip
if [[ -n "${DATABASE_URL:-}" ]]; then
  psql "$DATABASE_URL" -f /tmp/cleanup_participant.sql > /dev/null 2>&1 || echo "  (Note: Could not clean up via SQL, may need manual cleanup)"
else
  echo "  (Skipping SQL cleanup - DATABASE_URL not set)"
fi
rm -f /tmp/cleanup_participant.sql
sleep 1

# STEP 5: Clean up any existing invites and notifications for this toki
say "Clean up: Remove existing invites and notifications for this toki"
# Create cleanup SQL file
cat > /tmp/cleanup_invite.sql <<EOF
-- Remove existing invites for this toki and user
DELETE FROM toki_invites 
WHERE toki_id = '${TOKI_ID}' AND invited_user_id = '${JOHN_ID}';

-- Remove existing invite notifications for John for this toki
DELETE FROM notifications 
WHERE user_id = '${JOHN_ID}' AND type = 'invite' AND related_toki_id = '${TOKI_ID}';

-- Also remove any persisted invite_accepted notifications for this toki (cleanup after previous runs)
DELETE FROM notifications
WHERE user_id = '${JOHN_ID}' AND type = 'invite_accepted' AND related_toki_id = '${TOKI_ID}';
EOF

# Execute cleanup if DATABASE_URL is available
if [[ -n "${DATABASE_URL:-}" ]]; then
  psql "$DATABASE_URL" -f /tmp/cleanup_invite.sql > /dev/null 2>&1 || echo "  (Note: Could not clean up via SQL, may need manual cleanup)"
else
  echo "  (Skipping SQL cleanup - DATABASE_URL not set)"
fi
rm -f /tmp/cleanup_invite.sql
sleep 1

# STEP 6: Send invite from test to john
say "Send invite from $TEST_EMAIL to $JOHN_EMAIL for toki: $TOKI_TITLE"
INVITE_RESPONSE=$(curl -s -X POST "$BACKEND/api/tokis/$TOKI_ID/invites" \
  -H "Authorization: Bearer $TEST_ACCESS" \
  -H 'Content-Type: application/json' \
  -d "{\"invitedUserId\": \"$JOHN_ID\"}")
printf '%s\n' "$INVITE_RESPONSE" | jq '.'

# STEP 7: Fetch combined notifications for john to verify invite appears
say "Fetch combined notifications for $JOHN_EMAIL (should show invite)"
NOTIFICATIONS_RESPONSE=$(curl -s "$BACKEND/api/notifications/combined" -H "Authorization: Bearer $JOHN_ACCESS")
printf '%s\n' "$NOTIFICATIONS_RESPONSE" | jq '.data.notifications[] | select(.type == "invite") | {id,type,title,message,actionRequired,tokiId,tokiTitle,inviterName,read,created_at}' || true
