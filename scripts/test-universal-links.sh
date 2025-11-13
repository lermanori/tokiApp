#!/bin/bash

# Test Universal Links Configuration
# This script verifies that your AASA file is properly configured and accessible

DOMAIN="toki-app.com"
AASA_URL="https://${DOMAIN}/.well-known/apple-app-site-association"

echo "🔍 Testing Universal Links Configuration for ${DOMAIN}"
echo "=================================================="
echo ""

# Test 1: Check if AASA file is accessible
echo "1️⃣  Testing AASA file accessibility..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${AASA_URL}")

if [ "$HTTP_CODE" -eq 200 ]; then
    echo "   ✅ AASA file is accessible (HTTP ${HTTP_CODE})"
else
    echo "   ❌ AASA file returned HTTP ${HTTP_CODE}"
    echo "   Make sure the file is deployed at: ${AASA_URL}"
    exit 1
fi

# Test 2: Check Content-Type header
echo ""
echo "2️⃣  Testing Content-Type header..."
CONTENT_TYPE=$(curl -s -I "${AASA_URL}" | grep -i "content-type" | tr -d '\r')

if echo "$CONTENT_TYPE" | grep -qi "application/json"; then
    echo "   ✅ Content-Type is correct: ${CONTENT_TYPE}"
elif echo "$CONTENT_TYPE" | grep -qi "application/pkcs7-mime"; then
    echo "   ✅ Content-Type is correct (signed): ${CONTENT_TYPE}"
else
    echo "   ⚠️  Content-Type might be incorrect: ${CONTENT_TYPE}"
    echo "   Expected: application/json or application/pkcs7-mime"
fi

# Test 3: Validate JSON structure
echo ""
echo "3️⃣  Validating JSON structure..."
JSON_CONTENT=$(curl -s "${AASA_URL}")

if echo "$JSON_CONTENT" | jq empty 2>/dev/null; then
    echo "   ✅ JSON is valid"
else
    echo "   ❌ JSON is invalid or jq is not installed"
    echo "   Install jq: brew install jq"
    exit 1
fi

# Test 4: Check required fields
echo ""
echo "4️⃣  Checking required fields..."

HAS_APPLINKS=$(echo "$JSON_CONTENT" | jq -e '.applinks' > /dev/null 2>&1 && echo "yes" || echo "no")
HAS_DETAILS=$(echo "$JSON_CONTENT" | jq -e '.applinks.details' > /dev/null 2>&1 && echo "yes" || echo "no")
HAS_APPID=$(echo "$JSON_CONTENT" | jq -e '.applinks.details[0].appID' > /dev/null 2>&1 && echo "yes" || echo "no")
HAS_PATHS=$(echo "$JSON_CONTENT" | jq -e '.applinks.details[0].paths' > /dev/null 2>&1 && echo "yes" || echo "no")

if [ "$HAS_APPLINKS" = "yes" ]; then
    echo "   ✅ Has 'applinks' field"
else
    echo "   ❌ Missing 'applinks' field"
fi

if [ "$HAS_DETAILS" = "yes" ]; then
    echo "   ✅ Has 'details' array"
else
    echo "   ❌ Missing 'details' array"
fi

if [ "$HAS_APPID" = "yes" ]; then
    APPID=$(echo "$JSON_CONTENT" | jq -r '.applinks.details[0].appID')
    echo "   ✅ Has 'appID': ${APPID}"
else
    echo "   ❌ Missing 'appID'"
fi

if [ "$HAS_PATHS" = "yes" ]; then
    PATHS=$(echo "$JSON_CONTENT" | jq -r '.applinks.details[0].paths | join(", ")')
    echo "   ✅ Has 'paths': [${PATHS}]"
else
    echo "   ❌ Missing 'paths'"
fi

# Test 5: Display full AASA content
echo ""
echo "5️⃣  AASA File Content:"
echo "   ${AASA_URL}"
echo ""
echo "$JSON_CONTENT" | jq '.' | sed 's/^/   /'

# Test 6: Check if paths match expected routes
echo ""
echo "6️⃣  Checking path patterns..."
EXPECTED_PATHS=("/toki-details*" "/join/*" "/user-profile/*")
CONFIGURED_PATHS=$(echo "$JSON_CONTENT" | jq -r '.applinks.details[0].paths[]')

for expected in "${EXPECTED_PATHS[@]}"; do
    if echo "$CONFIGURED_PATHS" | grep -q "^${expected}$"; then
        echo "   ✅ Path configured: ${expected}"
    else
        echo "   ⚠️  Path not found: ${expected}"
    fi
done

echo ""
echo "=================================================="
echo "✅ Universal Links configuration test complete!"
echo ""
echo "Next steps:"
echo "1. Build and install your iOS app on a device"
echo "2. Test universal links using the Notes app or Safari"
echo "3. See docs/UNIVERSAL_LINKS_TESTING.md for detailed testing guide"
echo ""

