#!/bin/bash

# Test script to debug invite flow
# This script will:
# 1. Login as Ori (host)
# 2. Create a private toki
# 3. Get John's user ID
# 4. Send invite to John
# 5. Login as John
# 6. Check if John can see the toki
# 7. Check if John can see his invites

echo "🔍 Testing invite flow..."

# Load environment variables
source toki-backend/.env

# Step 1: Login as Ori (host)
echo "📝 Step 1: Logging in as Ori..."
ORI_LOGIN=$(curl -s -X POST "http://localhost:3002/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }')

ORI_TOKEN=$(echo $ORI_LOGIN | jq -r '.data.tokens.accessToken')
echo "✅ Ori logged in, token: ${ORI_TOKEN:0:20}..."

# Step 2: Create a private toki
echo "📝 Step 2: Creating private toki..."
TOKI_CREATE=$(curl -s -X POST "http://localhost:3002/api/tokis" \
  -H "Authorization: Bearer $ORI_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Private Toki for Invite",
    "description": "This is a private toki to test invite functionality",
    "location": "Test Location",
    "latitude": 32.0853,
    "longitude": 34.7818,
    "timeSlot": "evening",
    "scheduledTime": "2024-12-25T18:00:00Z",
    "maxAttendees": 10,
    "category": "test",
    "visibility": "private"
  }')

TOKI_ID=$(echo $TOKI_CREATE | jq -r '.data.id')
echo "✅ Created toki with ID: $TOKI_ID"

# Step 3: Get John's user ID
echo "📝 Step 3: Getting John's user ID..."
JOHN_LOGIN=$(curl -s -X POST "http://localhost:3002/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }')

JOHN_TOKEN=$(echo $JOHN_LOGIN | jq -r '.data.tokens.accessToken')
JOHN_ID=$(echo $JOHN_LOGIN | jq -r '.data.user.id')
echo "✅ John's ID: $JOHN_ID, token: ${JOHN_TOKEN:0:20}..."

# Step 4: Send invite to John
echo "📝 Step 4: Sending invite to John..."
INVITE_RESPONSE=$(curl -s -X POST "http://localhost:3002/api/tokis/$TOKI_ID/invites" \
  -H "Authorization: Bearer $ORI_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"invitedUserId\": \"$JOHN_ID\"
  }")

echo "📋 Invite response:"
echo $INVITE_RESPONSE | jq '.'

# Step 5: Check if John can see the toki
echo "📝 Step 5: Checking if John can see the toki..."
JOHN_TOKIS=$(curl -s -X GET "http://localhost:3002/api/tokis" \
  -H "Authorization: Bearer $JOHN_TOKEN")

echo "📋 John's tokis:"
echo $JOHN_TOKIS | jq '.data.tokis | length'
echo $JOHN_TOKIS | jq '.data.tokis[] | select(.id == "'$TOKI_ID'")'

# Step 6: Check if John can see his invites for this toki
echo "📝 Step 6: Checking John's invites for this toki..."
JOHN_INVITES=$(curl -s -X GET "http://localhost:3002/api/tokis/$TOKI_ID/invites" \
  -H "Authorization: Bearer $JOHN_TOKEN")

echo "📋 John's invites for toki $TOKI_ID:"
echo $JOHN_INVITES | jq '.'

# Step 7: Check database directly
echo "📝 Step 7: Checking database directly..."
echo "Checking toki_invites table:"
psql $DATABASE_URL -c "SELECT * FROM toki_invites WHERE toki_id = '$TOKI_ID' AND invited_user_id = '$JOHN_ID';"

echo "Checking toki visibility:"
psql $DATABASE_URL -c "SELECT id, title, visibility, host_id FROM tokis WHERE id = '$TOKI_ID';"

echo "✅ Test completed!"
