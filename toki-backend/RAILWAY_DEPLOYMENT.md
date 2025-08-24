# 🚀 Railway Deployment Guide for Toki Backend

## 📋 **Prerequisites**
- Railway account (https://railway.app)
- GitHub repository connected to Railway
- Railway CLI installed (optional)

## 🔧 **Setup Steps**

### **1. Environment Configuration**
Create a `.env.production` file based on `env.production.example`:

```bash
# Copy the template
cp env.production.example .env.production

# Edit with your actual values
nano .env.production
```

**Required Environment Variables:**
- `JWT_SECRET`: Strong, unique secret key
- `DATABASE_URL`: Already provided (Railway PostgreSQL)
- `CORS_ORIGIN`: Your frontend domain(s)
- `NODE_ENV`: Set to "production"

### **2. Railway Project Setup**
1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project"
3. Choose "Deploy from GitHub repo"
4. Select your Toki backend repository
5. Railway will automatically detect the configuration

### **3. Environment Variables in Railway**
In your Railway project dashboard:
1. Go to "Variables" tab
2. Add all variables from your `.env.production` file
3. **Important**: Set `NODE_ENV=production`
4. **Important**: Set `DATABASE_URL` to the Railway PostgreSQL URL

### **4. Build Configuration**
Railway will automatically:
- Install dependencies (`npm install`)
- Build the TypeScript (`npm run build`)
- Start the server (`npm start`)

## 📁 **File Structure for Railway**
```
toki-backend/
├── railway.json          # Railway configuration
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── src/                  # Source code
├── dist/                 # Built JavaScript (auto-generated)
└── uploads/              # File uploads (ephemeral on Railway)
```

## 🚀 **Deployment Commands**

### **Automatic Deployment (Recommended)**
1. Push to your main branch
2. Railway automatically deploys
3. Monitor deployment in Railway dashboard

### **Manual Deployment (CLI)**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Deploy
railway up
```

## 🔍 **Health Check**
Your app includes a health check endpoint at `/health`:
- **URL**: `https://your-app.railway.app/health`
- **Response**: Status, timestamp, environment, version
- **Railway**: Automatically monitors this endpoint

## 📊 **Monitoring & Logs**
- **Logs**: Available in Railway dashboard
- **Metrics**: CPU, memory, network usage
- **Health**: Automatic health checks every 5 minutes

## 🔧 **Troubleshooting**

### **Build Failures**
- Check TypeScript compilation: `npm run build`
- Verify all dependencies in `package.json`
- Check for syntax errors in source code

### **Runtime Errors**
- Check Railway logs in dashboard
- Verify environment variables are set
- Check database connectivity

### **Common Issues**
1. **Port Binding**: Railway auto-assigns ports
2. **File Uploads**: Use external storage (Cloudinary) for production
3. **Database**: Ensure Railway PostgreSQL is running
4. **CORS**: Set correct frontend domain in CORS_ORIGIN

## 🌐 **Production URLs**
After deployment, you'll get:
- **Backend API**: `https://your-app.railway.app`
- **Health Check**: `https://your-app.railway.app/health`
- **API Base**: `https://your-app.railway.app/api`

## 🔒 **Security Considerations**
- ✅ JWT_SECRET is strong and unique
- ✅ CORS is properly configured
- ✅ Rate limiting is enabled
- ✅ Helmet security headers
- ✅ Input validation and sanitization

## 📱 **Next Steps After Deployment**
1. **Test API endpoints** with production URL
2. **Update frontend** with new backend URL
3. **Monitor performance** and logs
4. **Set up custom domain** (optional)
5. **Configure SSL** (automatic with Railway)

## 🎯 **Success Checklist**
- [ ] Environment variables configured
- [ ] Railway project created
- [ ] GitHub repository connected
- [ ] Automatic deployment working
- [ ] Health check endpoint responding
- [ ] API endpoints accessible
- [ ] Database connection working
- [ ] Frontend updated with new URL

---

**🚀 Your Toki backend is now ready for Railway deployment!**
