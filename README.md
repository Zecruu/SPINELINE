# SpineLine - Chiropractic Clinic Management Platform

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Zecruu/SPINELINE.git)

A comprehensive, cloud-based chiropractic clinic management system built with modern web technologies. SpineLine provides complete practice management capabilities including patient records, appointment scheduling, billing, and administrative tools.

## 🏗️ Architecture

SpineLine follows a modular, full-stack architecture:

- **Frontend**: React with Vite, TailwindCSS, and Headless UI
- **Backend**: Node.js with Express.js
- **Database**: MongoDB Atlas
- **Authentication**: JWT-based authentication

## 📁 Project Structure

```
spinelinev0/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── utils/          # Frontend utilities
│   │   └── services/       # API service functions
│   ├── public/             # Static assets
│   └── package.json
├── server/                 # Node.js backend
│   ├── config/             # Configuration files
│   │   └── db.js          # MongoDB connection
│   ├── models/             # Mongoose schemas
│   ├── routes/             # API route definitions
│   ├── controllers/        # Request logic
│   ├── middleware/         # Auth & validation middleware
│   ├── utils/              # Backend utilities
│   ├── .env               # Environment variables
│   └── server.js          # Main server file
└── package.json           # Root package.json
```

## 🚀 Quick Deploy

### Deploy to Render (Recommended)
1. Click the "Deploy to Render" button above
2. Connect your GitHub account
3. Set environment variables (see below)
4. Deploy automatically

### Deploy to Vercel
```bash
npm i -g vercel
git clone https://github.com/Zecruu/SPINELINE.git
cd SPINELINE
vercel --prod
```

### Deploy with Docker
```bash
git clone https://github.com/Zecruu/SPINELINE.git
cd SPINELINE
docker-compose up -d
```

## 🔧 Environment Variables

Set these environment variables in your deployment platform:

### Required
```env
NODE_ENV=production
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/spineline
JWT_SECRET=your-super-secret-32-character-key
ADMIN_EMAIL=admin@spineline.com
ADMIN_PASSWORD=SpineLine2024!
```

### Optional
```env
PORT=5001
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://your-domain.com
```

## 🔐 Admin Portal

Access the admin portal at: `https://your-domain.com/secret-admin`

**Default Credentials:**
- Email: `admin@spineline.com`
- Password: `SpineLine2024!`

**⚠️ IMPORTANT:** Change these credentials immediately after first login!

## 🛠️ Local Development

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- MongoDB Atlas account (already configured)

### Installation

1. Install all dependencies:
```bash
npm run install:all
```

2. Start the development servers:
```bash
npm run dev
```

This will start:
- Backend server on http://localhost:5001
- Frontend development server on http://localhost:7890

### Environment Variables

The server uses the following environment variables (already configured in `server/.env`):

- `MONGO_URI`: MongoDB Atlas connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `PORT`: Server port (default: 5000)
- `NODE_ENV`: Environment mode
- `CLIENT_URL`: Frontend URL for CORS

## 🔧 Available Scripts

### Root Level
- `npm run dev` - Start both client and server in development mode
- `npm run install:all` - Install dependencies for root, client, and server

### Server
- `npm run server:dev` - Start server in development mode with nodemon
- `npm run server:start` - Start server in production mode

### Client
- `npm run client:dev` - Start client development server
- `npm run client:build` - Build client for production

## 🗄️ Database

SpineLine uses MongoDB Atlas with the following connection:
- **Database**: MongoDB Atlas
- **Connection**: Pre-configured in environment variables
- **Features**: Automatic connection retry, error handling

## 🎨 UI Framework

- **Styling**: TailwindCSS with dark theme
- **Components**: Headless UI for accessible components
- **Icons**: Heroicons
- **Theme**: Dark-themed interface optimized for medical environments

## 📦 Dependencies

### Backend Dependencies
- `express` - Web framework
- `mongoose` - MongoDB ODM
- `cors` - Cross-origin resource sharing
- `dotenv` - Environment variable management
- `jsonwebtoken` - JWT authentication
- `bcrypt` - Password hashing

### Frontend Dependencies
- `react` - UI library
- `react-router-dom` - Client-side routing
- `axios` - HTTP client
- `tailwindcss` - Utility-first CSS framework
- `@headlessui/react` - Accessible UI components
- `@heroicons/react` - Icon library

## 🔐 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- CORS configuration
- Environment variable protection
- Input validation middleware (to be implemented)

## 🏥 Features

### Admin Portal
- Create and manage multiple clinics
- User management (doctors and secretaries)
- System statistics and overview
- Complete data isolation between clinics

### Doctor Interface
- Patient flow management with SOAP notes
- Digital signature capture
- Procedure and diagnostic code selection
- Physical exam templates
- Visit completion workflow

### Secretary Interface
- Patient management and scheduling
- Appointment confirmation and tracking
- Checkout and billing system
- Daily reports and audit trails

### Core Features
- **ChiroTouch-style appointment scheduler** with multi-patient time slots
- **Complete patient records** with file management
- **Billing and checkout system** with service codes
- **SOAP notes and templates** for clinical documentation
- **Digital signatures** for visit completion
- **Audit reports** with PDF generation
- **Role-based access control** with clinic isolation

## 📚 Documentation

- [Deployment Guide](./DEPLOYMENT.md) - Complete deployment instructions
- [Admin Access Guide](./ADMIN_ACCESS.md) - Admin portal documentation
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md) - Step-by-step checklist

## 🧪 Testing

### Test Admin Portal
```bash
# Local testing
npm run test:admin

# Production testing
npm run test:admin:prod https://your-domain.com
```

### Manual Testing
1. Access `/secret-admin` URL
2. Login with admin credentials
3. Create a test clinic
4. Create clinic users
5. Test patient workflow

## 🤝 Contributing

This is a private project for SpineLine development. Please follow the established coding standards and project structure when contributing.

## 📄 License

ISC License - SpineLine Team
