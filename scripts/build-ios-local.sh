#!/bin/bash

# Script to build iOS app locally for App Store submission
# Usage: ./scripts/build-ios-local.sh

set -e  # Exit on error

echo "🚀 Building iOS app locally for App Store submission"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -d "ios" ]; then
    echo -e "${RED}Error: ios directory not found. Run this script from the project root.${NC}"
    exit 1
fi

# Check if Xcode is installed
if ! command -v xcodebuild &> /dev/null; then
    echo -e "${RED}Error: Xcode is not installed. Please install Xcode from the App Store.${NC}"
    exit 1
fi

# Check if CocoaPods is installed
if ! command -v pod &> /dev/null; then
    echo -e "${YELLOW}Warning: CocoaPods not found. Installing...${NC}"
    sudo gem install cocoapods
fi

echo -e "${GREEN}Step 1: Installing CocoaPods dependencies...${NC}"
cd ios
pod install
cd ..

echo ""
echo -e "${GREEN}Step 2: Opening Xcode workspace...${NC}"
echo -e "${YELLOW}Please configure signing in Xcode:${NC}"
echo "  1. Select the Toki project"
echo "  2. Select the Toki target"
echo "  3. Go to Signing & Capabilities"
echo "  4. Select your Team"
echo "  5. Ensure Bundle Identifier is: com.toki.socialmap"
echo ""

# Open Xcode workspace
open ios/Toki.xcworkspace

echo ""
echo -e "${GREEN}Step 3: Building archive...${NC}"
echo -e "${YELLOW}In Xcode:${NC}"
echo "  1. Select Product → Scheme → Toki"
echo "  2. Select 'Any iOS Device' (not a simulator)"
echo "  3. Go to Product → Archive"
echo "  4. Wait for archive to complete"
echo ""

# Optional: Build archive from command line (uncomment and configure if preferred)
# TEAM_ID="YOUR_TEAM_ID_HERE"
# if [ -z "$TEAM_ID" ] || [ "$TEAM_ID" == "YOUR_TEAM_ID_HERE" ]; then
#     echo -e "${YELLOW}To build from command line, set TEAM_ID in this script${NC}"
# else
#     echo "Building archive..."
#     xcodebuild -workspace ios/Toki.xcworkspace \
#       -scheme Toki \
#       -configuration Release \
#       -archivePath ios/build/Toki.xcarchive \
#       archive \
#       CODE_SIGN_IDENTITY="Apple Development" \
#       DEVELOPMENT_TEAM="$TEAM_ID"
# fi

echo ""
echo -e "${GREEN}Step 4: After archiving, submit via Xcode Organizer:${NC}"
echo "  1. Xcode Organizer will open automatically"
echo "  2. Click 'Distribute App'"
echo "  3. Select 'App Store Connect'"
echo "  4. Choose 'Upload'"
echo "  5. Follow the wizard"
echo ""
echo -e "${GREEN}✅ Setup complete! Continue in Xcode.${NC}"



