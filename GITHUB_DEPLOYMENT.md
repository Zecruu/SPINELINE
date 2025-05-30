# SpineLine GitHub Deployment Guide

This guide provides step-by-step instructions for deploying SpineLine from the GitHub repository: https://github.com/Zecruu/SPINELINE.git

## 🚀 Render Deployment (Recommended)

Render provides the best experience for full-stack applications with automatic deployments.

### Step 1: Connect GitHub Repository

1. **Go to Render Dashboard**: https://render.com
2. **Sign up/Login** with your GitHub account
3. **Click "New +"** → **"Web Service"**
4. **Connect Repository**: 
   - Select "Connect a repository"
   - Choose `Zecruu/SPINELINE`
   - Click "Connect"

### Step 2: Configure Service

Render will automatically detect the `render.yaml` configuration, but you can also configure manually:

**Basic Settings:**
- **Name**: `spineline-api`
- **Environment**: `Node`
- **Build Command**: `cd server && npm ci --only=production`
- **Start Command**: `cd server && npm start`

### Step 3: Set Environment Variables

In the Render dashboard, add these environment variables:

```env
NODE_ENV=production
MONGO_URI=mongodb+srv://nomnk5138:Redzone12@spinev0.zbqy7hv.mongodb.net/?retryWrites=true&w=majority&appName=spinev0
JWT_SECRET=your-super-secret-32-character-key
ADMIN_EMAIL=admin@spineline.com
ADMIN_PASSWORD=SpineLine2024!
PORT=5001
```

**⚠️ Generate a secure JWT secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 4: Deploy

1. **Click "Create Web Service"**
2. **Wait for deployment** (5-10 minutes)
3. **Access your app** at the provided Render URL

### Step 5: Access Admin Portal

1. **Go to**: `https://your-app.onrender.com/secret-admin`
2. **Login with**:
   - Email: `admin@spineline.com`
   - Password: `SpineLine2024!`
3. **IMMEDIATELY change the admin password!**

---

## 🌐 Vercel Deployment

Vercel is excellent for serverless deployment with global CDN.

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Clone and Deploy

```bash
# Clone the repository
git clone https://github.com/Zecruu/SPINELINE.git
cd SPINELINE

# Deploy to Vercel
vercel --prod
```

### Step 3: Set Environment Variables

In the Vercel dashboard or via CLI:

```bash
vercel env add NODE_ENV production
vercel env add MONGO_URI mongodb+srv://nomnk5138:Redzone12@spinev0.zbqy7hv.mongodb.net/?retryWrites=true&w=majority&appName=spinev0
vercel env add JWT_SECRET your-super-secret-32-character-key
vercel env add ADMIN_EMAIL admin@spineline.com
vercel env add ADMIN_PASSWORD SpineLine2024!
```

### Step 4: Redeploy

```bash
vercel --prod
```

### Step 5: Access Admin Portal

1. **Go to**: `https://your-app.vercel.app/secret-admin`
2. **Login and change admin password**

---

## 🐳 Docker Deployment

Deploy using Docker for containerized environments.

### Step 1: Clone Repository

```bash
git clone https://github.com/Zecruu/SPINELINE.git
cd SPINELINE
```

### Step 2: Configure Environment

Create a `.env` file:

```env
NODE_ENV=production
MONGO_URI=mongodb+srv://nomnk5138:Redzone12@spinev0.zbqy7hv.mongodb.net/?retryWrites=true&w=majority&appName=spinev0
JWT_SECRET=your-super-secret-32-character-key
ADMIN_EMAIL=admin@spineline.com
ADMIN_PASSWORD=SpineLine2024!
PORT=5001
```

### Step 3: Deploy with Docker Compose

```bash
docker-compose up -d
```

### Step 4: Access Application

1. **Frontend**: http://localhost
2. **Admin Portal**: http://localhost/secret-admin

---

## 🔧 Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `MONGO_URI` | MongoDB connection | `mongodb+srv://user:pass@cluster.mongodb.net/spineline` |
| `JWT_SECRET` | JWT signing secret | `32-character-random-string` |
| `ADMIN_EMAIL` | Admin login email | `admin@spineline.com` |
| `ADMIN_PASSWORD` | Admin login password | `SpineLine2024!` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5001` |
| `JWT_EXPIRES_IN` | Token expiration | `7d` |
| `CORS_ORIGIN` | Allowed origins | `*` |

---

## 🔐 Security Checklist

### After Deployment

- [ ] Change default admin password
- [ ] Generate secure JWT secret
- [ ] Configure CORS for your domain
- [ ] Enable HTTPS (automatic on Render/Vercel)
- [ ] Test admin portal access
- [ ] Create your first clinic
- [ ] Create clinic users

### Production Security

- [ ] Use environment variables for all secrets
- [ ] Enable rate limiting
- [ ] Monitor application logs
- [ ] Set up backup strategy
- [ ] Configure monitoring alerts

---

## 🧪 Testing Your Deployment

### Automated Testing

```bash
# Test admin portal (replace with your URL)
npm run test:admin:prod https://your-app.onrender.com
```

### Manual Testing

1. **Health Check**: `https://your-app.com/api/health`
2. **Admin Portal**: `https://your-app.com/secret-admin`
3. **Create Test Clinic**: Use admin portal
4. **Create Test User**: Add doctor/secretary
5. **Test User Login**: Verify clinic isolation

---

## 🔄 Automatic Deployments

### GitHub Integration

Both Render and Vercel support automatic deployments:

1. **Push to GitHub**: `git push origin main`
2. **Automatic Build**: Platform detects changes
3. **Deploy**: New version goes live automatically

### Manual Deployments

```bash
# Update your local repository
git pull origin main

# Redeploy to Vercel
vercel --prod

# Render deploys automatically on GitHub push
```

---

## 📞 Troubleshooting

### Common Issues

**1. Admin Portal Not Accessible**
- Check environment variables are set
- Verify `/secret-admin` route configuration
- Test health endpoint: `/api/health`

**2. Database Connection Failed**
- Verify MongoDB URI is correct
- Check network connectivity
- Ensure IP whitelist includes deployment platform

**3. JWT Errors**
- Generate new JWT secret
- Verify secret is properly set
- Check token expiration settings

### Debug Commands

```bash
# Test health endpoint
curl https://your-app.com/api/health

# Test admin login
curl -X POST https://your-app.com/api/secret-admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@spineline.com","password":"SpineLine2024!"}'
```

---

## 🎯 Quick Start Summary

1. **Choose Platform**: Render (recommended) or Vercel
2. **Connect Repository**: https://github.com/Zecruu/SPINELINE.git
3. **Set Environment Variables**: MongoDB URI, JWT secret, admin credentials
4. **Deploy**: Automatic or manual deployment
5. **Access Admin Portal**: `/secret-admin`
6. **Change Admin Password**: IMMEDIATELY after first login
7. **Create Clinics**: Start managing your chiropractic practices

---

**Your SpineLine deployment is ready! 🏥✨**

For detailed documentation, see:
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Complete deployment guide
- [ADMIN_ACCESS.md](./ADMIN_ACCESS.md) - Admin portal documentation
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Verification checklist
