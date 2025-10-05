#!/usr/bin/env bash
# Test join request notification flow
# 
# Purpose: Test the join request notification system
#   1. Login as test@example.com (host)
#   2. Get test@example.com's toki ID
#   3. Login as john@example.com
#   4. Clean up John from participants (if exists)
#   5. John sends join request to test's toki
#   6. Fetch combined notifications for test@example.com to verify it appears
#
# Usage: ./test-join-request.sh [BACKEND] [TEST_EMAIL] [TEST_PASS] [JOHN_EMAIL] [JOHN_PASS]
# Example: ./test-join-request.sh http://localhost:3002

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

# STEP 2: Get test user's Tokis to find one to join
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
      "title": "Test Toki for Join Request",
      "category": "sports",
      "description": "Testing join request notifications",
      "location": "Test Location",
      "latitude": 40.7128,
      "longitude": -74.0060,
      "datetime": "2025-12-31T18:00:00Z",
      "maxAttendees": 10
    }')
  TOKI_ID=$(printf '%s' "$CREATE_RESPONSE" | jq -er '.data.id')
  echo "Created new toki: $TOKI_ID"
  TOKI_TITLE="Test Toki for Join Request"
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
# Since there's no leave endpoint, we'll use a direct SQL command via a helper script
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

# STEP 5: John sends join request to test's toki
say "John sends join request to toki: $TOKI_TITLE"
JOIN_RESPONSE=$(curl -s -X POST "$BACKEND/api/tokis/$TOKI_ID/join" -H "Authorization: Bearer $JOHN_ACCESS")
printf '%s\n' "$JOIN_RESPONSE" | jq '.'

# STEP 6: Fetch combined notifications for test@example.com
# This should show the new join request from John
say "Fetch combined notifications for $TEST_EMAIL"
curl -s "$BACKEND/api/notifications/combined" -H "Authorization: Bearer $TEST_ACCESS" \
| jq '.data.notifications[] | {id,source,type,title,message,read,actionRequired,tokiId,requestId,userId,tokiTitle,created_at} | select(.type == "join_request" or .type == "join_approved")'

say "Done"
