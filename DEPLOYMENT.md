# SpineLine Deployment Guide

This guide covers deploying SpineLine to various cloud platforms including Render, Vercel, and Docker-based solutions.

## 🚀 Quick Start

1. **Prepare for deployment:**
   ```bash
   chmod +x scripts/deploy.sh
   ./scripts/deploy.sh
   ```

2. **Configure environment variables** (see Environment Variables section below)

3. **Choose your deployment platform** and follow the specific instructions

## 🌐 Deployment Platforms

### Render (Recommended)

Render provides excellent support for full-stack applications with automatic deployments.

#### Setup Steps:

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Connect to Render:**
   - Go to [render.com](https://render.com)
   - Connect your GitHub repository
   - Render will automatically detect the `render.yaml` configuration

3. **Environment Variables:**
   Set these in the Render dashboard:
   - `MONGO_URI`: Your MongoDB Atlas connection string
   - `JWT_SECRET`: A secure random string (32+ characters)
   - `NODE_ENV`: `production`

#### Features:
- ✅ Automatic deployments from GitHub
- ✅ Built-in MongoDB hosting
- ✅ SSL certificates
- ✅ Health checks
- ✅ Separate frontend and backend services

### Vercel

Vercel is excellent for the frontend with serverless functions for the backend.

#### Setup Steps:

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel --prod
   ```

3. **Configure Environment Variables:**
   In the Vercel dashboard, add:
   - `MONGO_URI`
   - `JWT_SECRET`
   - `NODE_ENV=production`

#### Features:
- ✅ Serverless functions
- ✅ Global CDN
- ✅ Automatic HTTPS
- ✅ Preview deployments

### Docker Deployment

For containerized deployments on any platform that supports Docker.

#### Build and Run:

1. **Build the image:**
   ```bash
   docker build -t spineline .
   ```

2. **Run the container:**
   ```bash
   docker run -p 5001:5001 \
     -e MONGO_URI="your-mongodb-uri" \
     -e JWT_SECRET="your-jwt-secret" \
     -e NODE_ENV="production" \
     spineline
   ```

#### Features:
- ✅ Consistent environment
- ✅ Easy scaling
- ✅ Platform agnostic
- ✅ Health checks included

## 🔧 Environment Variables

### Required Variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/spineline` |
| `JWT_SECRET` | Secret for JWT signing | `your-super-secret-key-here` |
| `NODE_ENV` | Environment mode | `production` |

### Optional Variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5001` |
| `JWT_EXPIRES_IN` | JWT expiration time | `7d` |
| `CORS_ORIGIN` | Allowed CORS origins | `*` |
| `BCRYPT_ROUNDS` | Password hashing rounds | `12` |
| `ADMIN_EMAIL` | Admin portal email | `admin@spineline.com` |
| `ADMIN_PASSWORD` | Admin portal password | `SpineLine2024!` |

## 🗄️ Database Setup

### MongoDB Atlas (Recommended):

1. **Create a cluster** at [mongodb.com/atlas](https://mongodb.com/atlas)
2. **Create a database user** with read/write permissions
3. **Whitelist your deployment platform's IPs** (or use 0.0.0.0/0 for all IPs)
4. **Get the connection string** and set it as `MONGO_URI`

### Connection String Format:
```
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
```

## 🔒 Security Considerations

### Production Checklist:

- [ ] Use strong JWT secret (32+ random characters)
- [ ] Configure CORS for your specific domain
- [ ] Use HTTPS in production
- [ ] Set up proper MongoDB user permissions
- [ ] Enable MongoDB IP whitelisting
- [ ] Use environment variables for all secrets
- [ ] Enable rate limiting
- [ ] Set up monitoring and logging

### Generate Secure JWT Secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 📊 Monitoring

### Health Check Endpoint:
```
GET /api/health
```

Response:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "environment": "production"
}
```

### Logging:
- All API requests are logged
- Errors include stack traces in development
- Production logs exclude sensitive information

## 🚨 Troubleshooting

### Common Issues:

1. **MongoDB Connection Failed:**
   - Check connection string format
   - Verify database user credentials
   - Ensure IP whitelist includes deployment platform

2. **JWT Errors:**
   - Verify JWT_SECRET is set
   - Check token expiration settings

3. **CORS Errors:**
   - Configure CORS_ORIGIN for your domain
   - Ensure frontend URL matches CORS settings

4. **File Upload Issues:**
   - Check upload directory permissions
   - Verify MAX_FILE_SIZE setting

### Debug Mode:
Set `NODE_ENV=development` temporarily to see detailed error messages.

## 🔐 Admin Portal Access

### Secret Admin URL
After deployment, access the admin portal at:
```
https://your-domain.com/secret-admin
```

### Default Credentials
```
Email: admin@spineline.com
Password: SpineLine2024!
```

**⚠️ IMPORTANT**: Change these credentials immediately after first login!

### Admin Features
- Create and manage clinics
- Create and manage users (doctors/secretaries)
- System overview and statistics
- Complete clinic data isolation

For detailed admin portal documentation, see [ADMIN_ACCESS.md](./ADMIN_ACCESS.md).

## 📞 Support

For deployment issues:
1. Check the health endpoint: `/api/health`
2. Review application logs
3. Verify all environment variables are set
4. Test database connectivity
5. Test admin portal access: `/secret-admin`

## 🔄 Updates

To update your deployment:

1. **Render:** Push to GitHub (automatic deployment)
2. **Vercel:** Run `vercel --prod` or push to GitHub
3. **Docker:** Rebuild and redeploy the container

---

**Note:** Always test your deployment in a staging environment before going to production.
