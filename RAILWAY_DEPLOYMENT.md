# Railway Deployment Guide for SpineLine

This guide will help you deploy SpineLine to Railway, which supports **500MB file uploads** for your large ChiroTouch imports.

## 🚀 Why Railway?

- ✅ **500MB file uploads** (10x larger than Vercel's 50MB)
- ✅ **$5/month** (cheaper than Vercel Pro)
- ✅ **Persistent storage** for file processing
- ✅ **Easy deployment** from GitHub
- ✅ **Better for data-heavy applications**

## 📋 Prerequisites

1. **GitHub account** with your SpineLine repository
2. **Railway account** (sign up at [railway.app](https://railway.app))
3. **MongoDB Atlas** connection string (you already have this)

## 🛠️ Deployment Steps

### **Step 1: Sign Up for Railway**

1. Go to [railway.app](https://railway.app)
2. Click "Start a New Project"
3. Sign in with your GitHub account
4. Authorize Railway to access your repositories

### **Step 2: Deploy from GitHub**

1. Click "Deploy from GitHub repo"
2. Select your **SPINELINE** repository
3. Railway will automatically detect it's a Node.js project
4. Click "Deploy Now"

### **Step 3: Configure Environment Variables**

In your Railway project dashboard, go to **Variables** and add:

```env
# Database
MONGO_URI=mongodb+srv://nomnk5138:Redzone12@spinev0.zbqy7hv.mongodb.net/spineline?retryWrites=true&w=majority

# JWT
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production
JWT_EXPIRES_IN=24h

# Admin
ADMIN_EMAIL=admin@spineline.com
ADMIN_PASSWORD=SpineLine2024!
ADMIN_USERNAME=spineline_admin

# Server
NODE_ENV=production
```

### **Step 4: Custom Domain (Optional)**

1. In Railway dashboard, go to **Settings** > **Domains**
2. Click "Generate Domain" for a free `.railway.app` subdomain
3. Or add your custom domain (e.g., `spineline.yourdomain.com`)

### **Step 5: Test Large File Upload**

1. Access your Railway URL
2. Login with clinic ID `DRAAIV`
3. Go to Import/Export page
4. Upload your **105MB ChiroTouch file** - it should work! 🎉

## 🔧 Railway Configuration Files

Your app is now Railway-ready with these files:

- ✅ `railway.json` - Railway deployment configuration
- ✅ `nixpacks.toml` - Build configuration
- ✅ `.env.railway` - Environment variable template
- ✅ Updated server settings for Railway compatibility

## 📊 File Upload Limits

| Platform | ChiroTouch Files | Other Files |
|----------|------------------|-------------|
| **Vercel** | 50MB | 10MB |
| **Railway** | **500MB** | 10MB |

## 🎯 Migration Benefits

### **Before (Vercel):**
- ❌ 50MB file limit
- ❌ Your 105MB file fails
- ❌ Need file splitting workarounds

### **After (Railway):**
- ✅ 500MB file limit
- ✅ Your 105MB file uploads easily
- ✅ No file splitting needed
- ✅ Better performance for large imports

## 🔄 Switching from Vercel

1. **Deploy to Railway** (following steps above)
2. **Test functionality** with your large files
3. **Update DNS** to point to Railway
4. **Keep Vercel** as backup until confirmed working

## 💰 Cost Comparison

| Platform | Price | File Limit | Memory |
|----------|-------|------------|--------|
| Vercel Hobby | Free | 50MB | 1GB |
| Vercel Pro | $20/month | 50MB | 1GB |
| **Railway** | **$5/month** | **500MB** | **8GB** |

## 🆘 Troubleshooting

### **Build Fails:**
- Check that all environment variables are set
- Ensure `MONGO_URI` is correct

### **Large File Upload Fails:**
- Verify you're on Railway (URL contains `railway.app`)
- Check file is under 500MB
- Try uploading a smaller test file first

### **Database Connection Issues:**
- Verify MongoDB Atlas allows connections from Railway IPs
- Check `MONGO_URI` format is correct

## 🎉 Success!

Once deployed, you'll be able to:
- ✅ Upload ChiroTouch files up to **500MB**
- ✅ Process large patient databases
- ✅ Handle document-heavy imports
- ✅ No more file splitting needed!

## 📞 Support

If you need help with the migration:
1. Check Railway's documentation
2. Verify environment variables are set correctly
3. Test with smaller files first
4. Contact Railway support if needed

**Your 105MB ChiroTouch file will upload perfectly on Railway!** 🚀
