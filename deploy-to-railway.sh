#!/bin/bash

# 🚀 Toki App Railway Deployment Script
# This script helps deploy both frontend and backend to Railway

echo "🚀 Starting Toki App Railway Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "toki-backend" ]; then
    echo -e "${RED}❌ Error: Please run this script from the root of the Toki project${NC}"
    exit 1
fi

echo -e "${BLUE}📁 Current directory: $(pwd)${NC}"

# Step 1: Build Frontend
echo -e "${YELLOW}🔨 Building frontend for web...${NC}"
if npm run build:web; then
    echo -e "${GREEN}✅ Frontend build successful!${NC}"
    echo -e "${BLUE}📁 Generated files in: dist/${NC}"
else
    echo -e "${RED}❌ Frontend build failed!${NC}"
    exit 1
fi

# Step 2: Check Backend Build
echo -e "${YELLOW}🔨 Checking backend build...${NC}"
cd toki-backend
if npm run build; then
    echo -e "${GREEN}✅ Backend build successful!${NC}"
else
    echo -e "${RED}❌ Backend build failed!${NC}"
    exit 1
fi
cd ..

# Step 3: Git Status Check
echo -e "${YELLOW}📝 Checking git status...${NC}"
if [ -z "$(git status --porcelain)" ]; then
    echo -e "${GREEN}✅ Working directory is clean${NC}"
else
    echo -e "${YELLOW}⚠️  Working directory has uncommitted changes:${NC}"
    git status --short
    echo -e "${BLUE}💡 Consider committing changes before deployment${NC}"
fi

# Step 4: Railway Deployment Instructions
echo -e "${GREEN}🎉 Build process completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps for Railway Deployment:${NC}"
echo ""
echo -e "${YELLOW}1. Backend Deployment:${NC}"
echo "   - Go to Railway Dashboard"
echo "   - Create new project from GitHub repo"
echo "   - Select toki-backend directory"
echo "   - Configure environment variables"
echo "   - Deploy backend API"
echo ""
echo -e "${YELLOW}2. Frontend Deployment:${NC}"
echo "   - Create another Railway project"
echo "   - Select main repository (frontend)"
echo "   - Railway will auto-detect configuration"
echo "   - Deploy static frontend"
echo ""
echo -e "${YELLOW}3. Configuration:${NC}"
echo "   - Update CORS origins in backend"
echo "   - Update API URL in frontend"
echo "   - Test full production setup"
echo ""
echo -e "${GREEN}🚀 Your Toki app is ready for Railway deployment!${NC}"
echo -e "${BLUE}📚 See RAILWAY_DEPLOYMENT.md and RAILWAY_FRONTEND_DEPLOYMENT.md for details${NC}"
