# SpineLine Admin Portal Access Guide

This guide explains how to access and use the SpineLine admin portal for managing clinics and users across all deployment platforms.

## 🔐 Admin Portal Access

### Secret Admin URL
The admin portal is accessible via a secret URL that is not exposed to regular users:

```
https://your-domain.com/secret-admin
```

**Important**: This URL is intentionally hidden and should only be shared with authorized administrators.

## 🌐 Platform-Specific Access

### Vercel Deployment
✅ **Fully Supported** - The admin portal works seamlessly on Vercel

**Access URL**: `https://your-vercel-app.vercel.app/secret-admin`

**Configuration**: 
- Admin routes are properly configured in `vercel.json`
- Serverless functions handle all admin API calls
- Environment variables are set for admin credentials

### Render Deployment  
✅ **Fully Supported** - The admin portal works perfectly on Render

**Access URL**: `https://your-render-app.onrender.com/secret-admin`

**Configuration**:
- Admin routes configured in `render.yaml`
- Full server environment supports all admin features
- Database integration for clinic/user management

### Docker Deployment
✅ **Fully Supported** - Complete admin functionality

**Access URL**: `http://localhost/secret-admin` (or your domain)

**Configuration**:
- All admin features available in containerized environment
- Database persistence through Docker volumes

## 🔑 Default Admin Credentials

### Production Credentials
```
Email: admin@spineline.com
Password: SpineLine2024!
```

**⚠️ SECURITY WARNING**: Change these default credentials immediately after first deployment!

### Custom Admin Credentials
Set these environment variables to customize admin access:

```env
ADMIN_EMAIL=your-admin@yourdomain.com
ADMIN_PASSWORD=YourSecurePassword123!
```

## 🏥 Admin Portal Features

### Dashboard Overview
- **System Statistics**: Total clinics, users, and activity metrics
- **Quick Actions**: Create clinics and users
- **Management Tools**: Comprehensive clinic and user administration

### Clinic Management
- ✅ **Create New Clinics**: Generate unique clinic codes
- ✅ **View All Clinics**: Complete clinic directory
- ✅ **Edit Clinic Details**: Update clinic information
- ✅ **Activate/Deactivate**: Control clinic access
- ✅ **Delete Clinics**: Remove clinics and associated data

### User Management  
- ✅ **Create Users**: Add doctors and secretaries to clinics
- ✅ **View All Users**: System-wide user directory
- ✅ **Edit User Details**: Update user information and roles
- ✅ **Reset Passwords**: Administrative password resets
- ✅ **Activate/Deactivate**: Control user access
- ✅ **Delete Users**: Remove users from the system

### Role-Based Access
- **Admin Role**: Full system access and management
- **Clinic Isolation**: Each clinic's data is completely isolated
- **User Permissions**: Doctors and secretaries can only access their clinic

## 🚀 Deployment-Specific Setup

### Vercel Setup
1. **Deploy the application** to Vercel
2. **Set environment variables** in Vercel dashboard:
   ```
   MONGO_URI=your-mongodb-connection-string
   JWT_SECRET=your-jwt-secret
   ADMIN_EMAIL=admin@spineline.com
   ADMIN_PASSWORD=SpineLine2024!
   ```
3. **Access admin portal**: `https://your-app.vercel.app/secret-admin`

### Render Setup
1. **Connect GitHub repository** to Render
2. **Configure environment variables** in Render dashboard
3. **Deploy using render.yaml** configuration
4. **Access admin portal**: `https://your-app.onrender.com/secret-admin`

### Docker Setup
1. **Build and run** the Docker container
2. **Set environment variables** in docker-compose.yml or runtime
3. **Access admin portal**: `http://localhost/secret-admin`

## 🔒 Security Best Practices

### Admin Credentials
- [ ] Change default admin password immediately
- [ ] Use strong, unique passwords (12+ characters)
- [ ] Enable two-factor authentication (if implemented)
- [ ] Regularly rotate admin credentials

### Access Control
- [ ] Limit admin URL sharing to authorized personnel only
- [ ] Monitor admin login attempts and activities
- [ ] Use HTTPS in production environments
- [ ] Implement IP whitelisting if possible

### Environment Security
- [ ] Store admin credentials in environment variables
- [ ] Never commit credentials to version control
- [ ] Use different credentials for staging/production
- [ ] Regularly audit admin access logs

## 🛠️ Troubleshooting Admin Access

### Common Issues

**1. Admin Portal Not Loading**
- Check if `/secret-admin` route is properly configured
- Verify frontend build includes admin components
- Ensure React Router handles admin routes

**2. Login Fails with Correct Credentials**
- Verify `ADMIN_EMAIL` and `ADMIN_PASSWORD` environment variables
- Check JWT_SECRET is properly set
- Ensure database connection is working

**3. API Calls Fail (500 Errors)**
- Check MongoDB connection string
- Verify admin middleware is working
- Check server logs for specific errors

**4. Admin Features Not Working**
- Ensure admin token is valid and not expired
- Check admin role permissions in middleware
- Verify database write permissions

### Debug Steps
1. **Check Environment Variables**:
   ```bash
   # Verify admin credentials are set
   echo $ADMIN_EMAIL
   echo $ADMIN_PASSWORD
   ```

2. **Test Admin Login API**:
   ```bash
   curl -X POST https://your-domain.com/api/secret-admin/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@spineline.com","password":"SpineLine2024!"}'
   ```

3. **Check Server Logs**:
   - Look for authentication errors
   - Verify database connection messages
   - Check for JWT token issues

## 📞 Admin Support

### Emergency Access
If admin access is lost:
1. Check environment variables are correctly set
2. Verify database connectivity
3. Check server logs for authentication errors
4. Reset admin credentials via environment variables

### Contact Information
- **Technical Support**: [Your technical team]
- **Database Issues**: [Your database administrator]
- **Security Concerns**: [Your security team]

---

## 🎯 Quick Start Checklist

- [ ] Deploy SpineLine to your chosen platform
- [ ] Set admin environment variables
- [ ] Access `/secret-admin` URL
- [ ] Login with default credentials
- [ ] **IMMEDIATELY** change admin password
- [ ] Create your first clinic
- [ ] Create clinic users (doctors/secretaries)
- [ ] Test clinic isolation and user access

**Remember**: The admin portal is the foundation of your SpineLine deployment. Secure it properly and use it to manage your entire chiropractic clinic network!
