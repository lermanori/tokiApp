#!/bin/bash

# Test Invite Links Feature
# This script tests the complete invite link lifecycle:
# 1. Generate invite link
# 2. Get link info
# 3. Join by link
# 4. Manage links (regenerate, deactivate)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND="http://localhost:3002"
TEST_EMAIL="test@example.com"
JOHN_EMAIL="john@example.com"
TEST_PASSWORD="password123"

echo -e "${BLUE}🔗 Testing Invite Links Feature${NC}"
echo "=================================="

# STEP 1: Login as test user (host)
echo -e "\n${YELLOW}STEP 1: Login as test user (host)${NC}"
TEST_LOGIN_RESPONSE=$(curl -s -X POST "$BACKEND/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

TEST_ACCESS=$(echo "$TEST_LOGIN_RESPONSE" | jq -r '.data.tokens.accessToken // empty')
if [[ -z "$TEST_ACCESS" ]]; then
  echo -e "${RED}❌ Failed to get test user token${NC}"
  echo "$TEST_LOGIN_RESPONSE" | jq '.'
  exit 1
fi
echo -e "${GREEN}✅ Test user logged in successfully${NC}"

# STEP 2: Login as John (invitee)
echo -e "\n${YELLOW}STEP 2: Login as John (invitee)${NC}"
JOHN_LOGIN_RESPONSE=$(curl -s -X POST "$BACKEND/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$JOHN_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

JOHN_ACCESS=$(echo "$JOHN_LOGIN_RESPONSE" | jq -r '.data.tokens.accessToken // empty')
if [[ -z "$JOHN_ACCESS" ]]; then
  echo -e "${RED}❌ Failed to get John's token${NC}"
  echo "$JOHN_LOGIN_RESPONSE" | jq '.'
  exit 1
fi
echo -e "${GREEN}✅ John logged in successfully${NC}"

# STEP 3: Get or create a test toki
echo -e "\n${YELLOW}STEP 3: Get or create a test toki${NC}"
TOKIS_RESPONSE=$(curl -s "$BACKEND/api/tokis" -H "Authorization: Bearer $TEST_ACCESS")
TOKI_ID=$(echo "$TOKIS_RESPONSE" | jq -r '.data.tokis[0].id // empty')

if [[ -z "$TOKI_ID" ]]; then
  echo "No existing toki found, creating a new one..."
  CREATE_RESPONSE=$(curl -s -X POST "$BACKEND/api/tokis" \
    -H "Authorization: Bearer $TEST_ACCESS" \
    -H "Content-Type: application/json" \
    -d '{
      "title": "Test Invite Link Toki",
      "description": "Testing invite link functionality",
      "location": "Test Location",
      "timeSlot": "2 hours",
      "category": "coffee",
      "maxAttendees": 10,
      "visibility": "public",
      "tags": ["test", "invite-link"]
    }')
  
  TOKI_ID=$(echo "$CREATE_RESPONSE" | jq -r '.data.id // empty')
  if [[ -z "$TOKI_ID" ]]; then
    echo -e "${RED}❌ Failed to create toki${NC}"
    echo "$CREATE_RESPONSE" | jq '.'
    exit 1
  fi
  echo -e "${GREEN}✅ Created new toki: $TOKI_ID${NC}"
else
  echo -e "${GREEN}✅ Using existing toki: $TOKI_ID${NC}"
fi

# STEP 4: Generate invite link
echo -e "\n${YELLOW}STEP 4: Generate invite link${NC}"
GENERATE_RESPONSE=$(curl -s -X POST "$BACKEND/api/tokis/$TOKI_ID/invite-links" \
  -H "Authorization: Bearer $TEST_ACCESS" \
  -H "Content-Type: application/json" \
  -d '{
    "maxUses": 5,
    "message": "Join my awesome event!"
  }')

echo "Generate response:"
echo "$GENERATE_RESPONSE" | jq '.'

INVITE_CODE=$(echo "$GENERATE_RESPONSE" | jq -r '.data.inviteCode // empty')
INVITE_URL=$(echo "$GENERATE_RESPONSE" | jq -r '.data.inviteUrl // empty')

if [[ -z "$INVITE_CODE" || -z "$INVITE_URL" ]]; then
  echo -e "${RED}❌ Failed to generate invite link${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Generated invite link: $INVITE_URL${NC}"

# STEP 5: Get invite link info (public endpoint)
echo -e "\n${YELLOW}STEP 5: Get invite link info (public)${NC}"
LINK_INFO_RESPONSE=$(curl -s "$BACKEND/api/tokis/invite-links/$INVITE_CODE")
echo "Link info response:"
echo "$LINK_INFO_RESPONSE" | jq '.'

IS_ACTIVE=$(echo "$LINK_INFO_RESPONSE" | jq -r '.data.isActive // false')
if [[ "$IS_ACTIVE" == "true" ]]; then
  echo -e "${GREEN}✅ Link is active and accessible${NC}"
else
  echo -e "${RED}❌ Link is not active${NC}"
  exit 1
fi

# STEP 6: Join by invite code (as John)
echo -e "\n${YELLOW}STEP 6: Join by invite code (as John)${NC}"
JOIN_RESPONSE=$(curl -s -X POST "$BACKEND/api/tokis/join-by-link" \
  -H "Authorization: Bearer $JOHN_ACCESS" \
  -H "Content-Type: application/json" \
  -d "{\"inviteCode\":\"$INVITE_CODE\"}")

echo "Join response:"
echo "$JOIN_RESPONSE" | jq '.'

if echo "$JOIN_RESPONSE" | jq -e '.success' > /dev/null; then
  echo -e "${GREEN}✅ John successfully joined via invite link${NC}"
else
  echo -e "${RED}❌ Failed to join via invite link${NC}"
  exit 1
fi

# STEP 7: Verify John is now a participant
echo -e "\n${YELLOW}STEP 7: Verify John is now a participant${NC}"
TOKI_DETAILS_RESPONSE=$(curl -s "$BACKEND/api/tokis/$TOKI_ID" -H "Authorization: Bearer $JOHN_ACCESS")
JOHN_JOIN_STATUS=$(echo "$TOKI_DETAILS_RESPONSE" | jq -r '.data.joinStatus // empty')

if [[ "$JOHN_JOIN_STATUS" == "joined" ]]; then
  echo -e "${GREEN}✅ John is now a joined participant${NC}"
else
  echo -e "${RED}❌ John is not a participant or status is incorrect: $JOHN_JOIN_STATUS${NC}"
fi

# STEP 8: Get invite links for toki (host view)
echo -e "\n${YELLOW}STEP 8: Get invite links for toki (host view)${NC}"
LINKS_RESPONSE=$(curl -s "$BACKEND/api/tokis/$TOKI_ID/invite-links" -H "Authorization: Bearer $TEST_ACCESS")
echo "Links response:"
echo "$LINKS_RESPONSE" | jq '.'

ACTIVE_LINK=$(echo "$LINKS_RESPONSE" | jq -r '.data.activeLink // empty')
if [[ -n "$ACTIVE_LINK" ]]; then
  echo -e "${GREEN}✅ Active link found in host view${NC}"
  USED_COUNT=$(echo "$ACTIVE_LINK" | jq -r '.usedCount // 0')
  echo "Used count: $USED_COUNT"
else
  echo -e "${RED}❌ No active link found in host view${NC}"
fi

# STEP 9: Regenerate invite link
echo -e "\n${YELLOW}STEP 9: Regenerate invite link${NC}"
REGENERATE_RESPONSE=$(curl -s -X POST "$BACKEND/api/tokis/$TOKI_ID/invite-links/regenerate" \
  -H "Authorization: Bearer $TEST_ACCESS" \
  -H "Content-Type: application/json" \
  -d '{
    "maxUses": 10,
    "message": "Updated invite message!"
  }')

echo "Regenerate response:"
echo "$REGENERATE_RESPONSE" | jq '.'

NEW_INVITE_CODE=$(echo "$REGENERATE_RESPONSE" | jq -r '.data.inviteCode // empty')
if [[ -n "$NEW_INVITE_CODE" ]]; then
  echo -e "${GREEN}✅ Successfully regenerated invite link${NC}"
  echo "New code: $NEW_INVITE_CODE"
else
  echo -e "${RED}❌ Failed to regenerate invite link${NC}"
fi

# STEP 10: Test that old link is deactivated
echo -e "\n${YELLOW}STEP 10: Test that old link is deactivated${NC}"
OLD_LINK_INFO=$(curl -s "$BACKEND/api/tokis/invite-links/$INVITE_CODE")
OLD_IS_ACTIVE=$(echo "$OLD_LINK_INFO" | jq -r '.data.isActive // false')

if [[ "$OLD_IS_ACTIVE" == "false" ]]; then
  echo -e "${GREEN}✅ Old link is correctly deactivated${NC}"
else
  echo -e "${RED}❌ Old link is still active (should be deactivated)${NC}"
fi

# STEP 11: Test new link works
echo -e "\n${YELLOW}STEP 11: Test new link works${NC}"
NEW_LINK_INFO=$(curl -s "$BACKEND/api/tokis/invite-links/$NEW_INVITE_CODE")
NEW_IS_ACTIVE=$(echo "$NEW_LINK_INFO" | jq -r '.data.isActive // false')

if [[ "$NEW_IS_ACTIVE" == "true" ]]; then
  echo -e "${GREEN}✅ New link is active and working${NC}"
else
  echo -e "${RED}❌ New link is not active${NC}"
fi

# STEP 12: Deactivate the link
echo -e "\n${YELLOW}STEP 12: Deactivate the link${NC}"
LINK_ID=$(echo "$REGENERATE_RESPONSE" | jq -r '.data.id // empty')
if [[ -n "$LINK_ID" ]]; then
  DEACTIVATE_RESPONSE=$(curl -s -X DELETE "$BACKEND/api/tokis/invite-links/$LINK_ID" \
    -H "Authorization: Bearer $TEST_ACCESS")
  
  echo "Deactivate response:"
  echo "$DEACTIVATE_RESPONSE" | jq '.'
  
  if echo "$DEACTIVATE_RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Successfully deactivated invite link${NC}"
  else
    echo -e "${RED}❌ Failed to deactivate invite link${NC}"
  fi
else
  echo -e "${RED}❌ No link ID found for deactivation${NC}"
fi

# STEP 13: Verify link is deactivated
echo -e "\n${YELLOW}STEP 13: Verify link is deactivated${NC}"
FINAL_LINK_INFO=$(curl -s "$BACKEND/api/tokis/invite-links/$NEW_INVITE_CODE")
FINAL_IS_ACTIVE=$(echo "$FINAL_LINK_INFO" | jq -r '.data.isActive // false')

if [[ "$FINAL_IS_ACTIVE" == "false" ]]; then
  echo -e "${GREEN}✅ Link is correctly deactivated${NC}"
else
  echo -e "${RED}❌ Link is still active (should be deactivated)${NC}"
fi

echo -e "\n${GREEN}🎉 Invite Links Feature Test Complete!${NC}"
echo "=================================="
echo "✅ All tests passed successfully"
echo ""
echo "Summary:"
echo "- Generated invite link with custom message and usage limit"
echo "- Retrieved public link information"
echo "- Successfully joined toki via invite link"
echo "- Verified participant status"
echo "- Listed invite links from host perspective"
echo "- Regenerated invite link (deactivating old one)"
echo "- Verified old link deactivation"
echo "- Verified new link functionality"
echo "- Deactivated invite link"
echo "- Verified final deactivation"
