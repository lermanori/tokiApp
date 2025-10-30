# 🌐 Railway Frontend Deployment Guide for Toki App

## 📋 **Overview**
This guide covers deploying your React Native/Expo web app to Railway's free static hosting service.

## 🚀 **What We're Deploying**
- **Frontend**: React Native/Expo web app
- **Platform**: Web (built with `expo export --platform web`)
- **Hosting**: Railway Static Site (FREE)
- **Backend**: Railway Node.js API (separate service)

## 🔧 **Prerequisites**
- ✅ Railway account
- ✅ GitHub repository connected
- ✅ Backend already deployed to Railway
- ✅ Expo CLI installed locally

## 📁 **File Structure**
```
tokiApp/
├── railway.json                    # Frontend Railway config
├── RAILWAY_FRONTEND_DEPLOYMENT.md # This guide
├── package.json                    # Frontend dependencies
├── app.json                       # Expo configuration
├── app/                           # React Native components
├── dist/                          # Built web files (auto-generated)
└── toki-backend/                  # Backend API (separate service)
    ├── railway.json               # Backend Railway config
    └── RAILWAY_DEPLOYMENT.md     # Backend deployment guide
```

## 🏗️ **Build Process**

### **1. Local Build Test**
```bash
# Test the web build locally
npm run build:web

# This creates a 'dist' folder with static files
# Verify the build works before deploying
```

### **2. Build Output**
The `build:web` command generates:
- `dist/` folder with static HTML/CSS/JS
- Optimized for web deployment
- Single-page application ready

## 🚂 **Railway Configuration**

### **Frontend railway.json**
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npx serve -s dist -l $PORT",
    "healthcheckPath": "/",
    "healthcheckTimeout": 300
  }
}
```

### **What This Does:**
- **Builder**: NIXPACKS (Railway's smart builder)
- **Start Command**: Serves static files from `dist/` folder
- **Health Check**: Root path (`/`) for monitoring
- **Port**: Railway auto-assigns via `$PORT`

## 🌍 **Environment Configuration**

### **Production API URL**
Update your `app.json` for production:
```json
{
  "expo": {
    "extra": {
      "EXPO_PUBLIC_API_URL": "https://your-backend.railway.app"
    }
  }
}
```

### **CORS Configuration**
Ensure your backend allows requests from your frontend domain:
```
CORS_ORIGIN=https://your-frontend.railway.app
```

## 📱 **Deployment Steps**

### **1. Railway Project Setup**
1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project"
3. Choose "Deploy from GitHub repo"
4. Select your Toki frontend repository
5. Railway detects the configuration automatically

### **2. Build Configuration**
Railway will automatically:
- Install dependencies (`npm install`)
- Run build command (`npm run build:web`)
- Serve static files (`npx serve -s dist -l $PORT`)

### **3. Environment Variables**
No environment variables needed for frontend (static hosting)

## 🔍 **Health Check & Monitoring**
- **Health Check**: `https://your-app.railway.app/`
- **Monitoring**: Available in Railway dashboard
- **Logs**: Build and runtime logs
- **Metrics**: Performance and usage stats

## 🌐 **Production URLs**
After deployment:
- **Frontend**: `https://your-frontend.railway.app`
- **Backend**: `https://your-backend.railway.app`
- **API Base**: `https://your-backend.railway.app/api`

## 🔧 **Troubleshooting**

### **Build Failures**
- Check Expo build: `npm run build:web`
- Verify all dependencies installed
- Check for TypeScript errors

### **Runtime Issues**
- Check Railway logs
- Verify `dist/` folder exists
- Check start command syntax

### **Common Issues**
1. **Missing dist folder**: Run build command first
2. **Port binding**: Railway handles automatically
3. **Static file serving**: Ensure `npx serve` is available
4. **API connectivity**: Check CORS and backend URL

## 📊 **Performance & Optimization**
- ✅ **Static hosting** - Fast loading
- ✅ **Global CDN** - Worldwide distribution
- ✅ **Automatic HTTPS** - Security included
- ✅ **Zero configuration** - Railway handles everything

## 🔒 **Security Features**
- ✅ **HTTPS only** - Secure connections
- ✅ **CORS protection** - Backend security
- ✅ **Static files** - No server vulnerabilities
- ✅ **Railway security** - Platform-level protection

## 🎯 **Success Checklist**
- [ ] Frontend builds successfully (`npm run build:web`)
- [ ] Railway project created
- [ ] GitHub repository connected
- [ ] Automatic deployment working
- [ ] Frontend accessible at Railway URL
- [ ] Backend API accessible
- [ ] Frontend can communicate with backend
- [ ] CORS properly configured

## 🚀 **Next Steps After Deployment**
1. **Test frontend** at Railway URL
2. **Verify API connectivity** with backend
3. **Test all features** in production
4. **Monitor performance** and logs
5. **Set up custom domain** (optional)

## 💰 **Cost Breakdown**
- **Frontend Hosting**: **FREE** (Railway static sites)
- **Backend Hosting**: Pay-per-use (compute time)
- **Database**: Pay-per-use (Railway PostgreSQL)
- **Total Frontend Cost**: **$0/month** 🎉

---

**🌐 Your Toki frontend is now ready for Railway deployment!**
**🚀 Free static hosting with integrated backend communication!**
