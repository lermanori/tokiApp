#!/usr/bin/env bash
# Dev backend test helper: login, clean connection with John, send a new request, fetch combined notifications
# 
# Purpose: Test the connection request notification flow
#   1. Login as test@example.com
#   2. Delete any existing connection with John
#   3. Login as john@example.com
#   4. John sends connection request to test@example.com
#   5. Fetch combined notifications for test@example.com to verify it appears
#
# Usage: ./dev-api-test.sh [BACKEND] [TEST_EMAIL] [TEST_PASS] [JOHN_EMAIL] [JOHN_PASS]
# Example: ./dev-api-test.sh http://localhost:3002

set -euo pipefail

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

# STEP 1: Login as test@example.com
say "Login as $TEST_EMAIL"
TEST_LOGIN=$(login "$TEST_EMAIL" "$TEST_PASS")
# Print user info from response
printf '%s\n' "$TEST_LOGIN" | jq '.data.user | {id,email,name}' || true
# Extract access token
TEST_ACCESS=$(printf '%s' "$TEST_LOGIN" | jq -er '.data.tokens.accessToken')
say "Test token"; decode_jwt "$TEST_ACCESS"

# STEP 2: Get test user's ID
say "Resolve test user ID"
# Extract test user's ID from login response
TEST_ID=$(printf '%s' "$TEST_LOGIN" | jq -er '.data.user.id')
say "TEST_ID=$TEST_ID"

# STEP 3: Login as john@example.com to get his ID
say "Login as $JOHN_EMAIL"
JOHN_LOGIN=$(login "$JOHN_EMAIL" "$JOHN_PASS")
# Print John's user info
printf '%s\n' "$JOHN_LOGIN" | jq '.data.user | {id,email,name}' || true
# Extract John's access token and ID
JOHN_ACCESS=$(printf '%s' "$JOHN_LOGIN" | jq -er '.data.tokens.accessToken')
JOHN_ID=$(printf '%s' "$JOHN_LOGIN" | jq -er '.data.user.id')
say "John token"; decode_jwt "$JOHN_ACCESS"
say "JOHN_ID=$JOHN_ID"

# STEP 4: Clean up any existing connection between test and John
say "Delete existing connection (if any)"
curl -s -X DELETE "$BACKEND/api/connections/$JOHN_ID" -H "Authorization: Bearer $TEST_ACCESS" | jq '.' || true

# STEP 5: John sends connection request to test@example.com
say "John sends connection request to TEST_ID"
curl -s -X POST "$BACKEND/api/connections/$TEST_ID" -H "Authorization: Bearer $JOHN_ACCESS" | jq '.'

# STEP 6: Fetch combined notifications for test@example.com
# This should show the new connection request from John
say "Fetch combined notifications for test@example.com"
curl -s "$BACKEND/api/notifications/combined" -H "Authorization: Bearer $TEST_ACCESS" \
| jq '.data.notifications[] | {id,source,type,title,read,externalId,requestId,userId,created_at}'

say "Done"
