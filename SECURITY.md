# 🔐 SpineLine Security Configuration

## ⚠️ CRITICAL SECURITY NOTICE

**NEVER commit sensitive credentials to Git!** All sensitive information must be stored in environment variables.

## 🔑 Required Environment Variables

### Production Deployment (Vercel)

Set these environment variables in your Vercel dashboard:

```env
# Database
MONGODB_URI=your-mongodb-connection-string
MONGO_URI=your-mongodb-connection-string

# JWT Security
JWT_SECRET=your-super-secure-32-character-secret
JWT_EXPIRES_IN=24h

# Admin Credentials (CHANGE THESE!)
ADMIN_EMAIL=your-admin@yourdomain.com
ADMIN_PASSWORD=YourSecurePassword123!
ADMIN_USERNAME=your_admin_username

# Environment
NODE_ENV=production
```

### How to Set Vercel Environment Variables

1. **Go to your Vercel dashboard**
2. **Select your project**
3. **Go to Settings → Environment Variables**
4. **Add each variable individually**

**Example:**
- Variable Name: `ADMIN_EMAIL`
- Value: `your-admin@yourdomain.com`
- Environment: `Production`, `Preview`, `Development`

## 🛡️ Security Best Practices

### 1. Change Default Credentials Immediately

**Default credentials are for initial setup only!**

```bash
# Generate secure password
openssl rand -base64 32

# Generate secure JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Use Strong Passwords

- Minimum 12 characters
- Include uppercase, lowercase, numbers, and symbols
- Use a password manager
- Never reuse passwords

### 3. Secure JWT Secret

- Use a cryptographically secure random string
- Minimum 32 characters
- Never share or expose in logs

### 4. Database Security

- Use MongoDB Atlas with IP whitelisting
- Enable authentication
- Use strong database passwords
- Regular security updates

## 🚨 Security Checklist

### Before Going Live:

- [ ] Changed default admin credentials
- [ ] Set secure JWT secret
- [ ] Configured environment variables in Vercel
- [ ] Removed any hardcoded credentials from code
- [ ] Enabled HTTPS (automatic with Vercel)
- [ ] Configured proper CORS origins
- [ ] Set up database IP whitelisting
- [ ] Tested admin portal access
- [ ] Verified no sensitive data in Git history

### Regular Security Maintenance:

- [ ] Rotate JWT secrets quarterly
- [ ] Update admin passwords regularly
- [ ] Monitor access logs
- [ ] Keep dependencies updated
- [ ] Review user permissions
- [ ] Backup database regularly

## 🔍 Security Monitoring

### Admin Portal Access

Monitor these endpoints for suspicious activity:
- `/secret-admin`
- `/api/secret-admin/login`
- `/api/admin/login`

### Failed Login Attempts

The system logs failed authentication attempts. Monitor for:
- Multiple failed logins from same IP
- Brute force attempts
- Unusual access patterns

## 📞 Security Incident Response

If you suspect a security breach:

1. **Immediately change all admin credentials**
2. **Rotate JWT secrets**
3. **Check access logs for unauthorized activity**
4. **Review all user accounts**
5. **Update all environment variables**
6. **Consider temporary service shutdown if needed**

## 🔗 Additional Resources

- [OWASP Security Guidelines](https://owasp.org/)
- [MongoDB Security Checklist](https://docs.mongodb.com/manual/security/)
- [Vercel Security Best Practices](https://vercel.com/docs/security)
- [JWT Security Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)

---

**Remember: Security is an ongoing process, not a one-time setup!**
