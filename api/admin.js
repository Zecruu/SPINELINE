// Consolidated admin endpoint for Vercel
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// MongoDB connection
let isConnected = false;

const connectDB = async () => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }
  
  try {
    mongoose.set('strictQuery', false);
    mongoose.set('bufferCommands', false);

    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    
    if (!mongoUri) {
      throw new Error('MongoDB URI not found in environment variables');
    }

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
      maxPoolSize: 10,
      minPoolSize: 1,
      maxIdleTimeMS: 30000,
      heartbeatFrequencyMS: 10000,
      connectTimeoutMS: 30000,
      family: 4
    });

    isConnected = true;
    console.log('✅ MongoDB Connected Successfully!');
  } catch (error) {
    console.error('❌ MongoDB Connection Failed:', error.message);
    isConnected = false;
    throw error;
  }
};

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['doctor', 'secretary', 'admin'], default: 'doctor' },
  clinicId: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date }
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

// Clinic Schema
const clinicSchema = new mongoose.Schema({
  clinicName: { type: String, required: true },
  clinicId: { type: String, required: true, unique: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const Clinic = mongoose.models.Clinic || mongoose.model('Clinic', clinicSchema);

// Verify admin token
const verifyAdmin = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }

  const token = authHeader.substring(7);
  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
  
  if (decoded.role !== 'admin') {
    throw new Error('Admin access required');
  }
  
  return decoded;
};

// Generate clinic ID from name
const generateClinicId = (clinicName) => {
  if (!clinicName) return '';
  
  const cleanName = clinicName
    .replace(/\b(dr|dra|doctor|doctora|clinic|clinica|medical|center|centro)\b/gi, '')
    .replace(/[^a-zA-Z\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0);
  
  if (cleanName.length === 0) {
    return 'CLINIC001';
  }
  
  let id = '';
  for (let i = 0; i < cleanName.length && id.length < 6; i++) {
    const word = cleanName[i];
    const lettersToTake = Math.min(3, 6 - id.length);
    id += word.substring(0, lettersToTake).toUpperCase();
  }
  
  if (id.length < 3) {
    id = id.padEnd(3, 'X');
  }
  
  return id;
};

module.exports = async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { url } = req;
    console.log('Admin request:', req.method, url);

    // Route based on URL path
    if (url.includes('/login')) {
      // Admin login: POST /api/admin/login
      if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
      }

      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      const adminEmail = process.env.ADMIN_EMAIL || 'admin@spineline.com';
      const adminPassword = process.env.ADMIN_PASSWORD || 'SpineLine2024!';

      if (email === adminEmail && password === adminPassword) {
        const token = jwt.sign({
          id: 'admin',
          email: adminEmail,
          role: 'admin',
          name: 'SpineLine Admin'
        }, process.env.JWT_SECRET || 'fallback-secret', {
          expiresIn: '2h'
        });

        return res.json({
          success: true,
          message: 'Admin login successful',
          token,
          user: {
            id: 'admin',
            email: adminEmail,
            role: 'admin',
            name: 'SpineLine Admin'
          }
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });

    } else if (url.includes('/generate-clinic-id')) {
      // Generate clinic ID: GET /api/admin/generate-clinic-id?clinicName=...
      verifyAdmin(req);
      
      const { clinicName } = req.query;
      if (!clinicName) {
        return res.status(400).json({
          success: false,
          message: 'Clinic name is required'
        });
      }

      const generatedId = generateClinicId(clinicName);
      
      res.json({
        success: true,
        clinicId: generatedId,
        originalName: clinicName
      });

    } else if (url.includes('/users')) {
      // Users management: GET/POST/DELETE /api/admin/users
      verifyAdmin(req);
      await connectDB();

      if (req.method === 'GET') {
        const users = await User.find()
          .select('name email role clinicId isActive lastLogin createdAt')
          .lean();

        const clinics = await Clinic.find().lean();
        const clinicMap = {};
        clinics.forEach(clinic => {
          clinicMap[clinic.clinicId] = clinic.clinicName;
        });

        res.json({
          success: true,
          users: users.map(user => ({
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            clinicId: user.clinicId,
            clinicName: clinicMap[user.clinicId] || 'Unknown',
            isActive: user.isActive,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt
          }))
        });

      } else if (req.method === 'POST') {
        const { name, email, password, role, clinicId } = req.body;

        if (!name || !email || !password || !role || !clinicId) {
          return res.status(400).json({
            success: false,
            message: 'All fields are required'
          });
        }

        const clinic = await Clinic.findOne({ clinicId: clinicId.toUpperCase() });
        if (!clinic) {
          return res.status(400).json({
            success: false,
            message: 'Clinic not found'
          });
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'User with this email already exists'
          });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = new User({
          name,
          email: email.toLowerCase(),
          password: hashedPassword,
          role,
          clinicId: clinicId.toUpperCase(),
          isActive: true
        });

        await user.save();

        res.json({
          success: true,
          message: 'User created successfully',
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            clinicId: user.clinicId,
            isActive: user.isActive
          },
          clinic: {
            clinicId: clinic.clinicId,
            clinicName: clinic.clinicName
          }
        });

      } else {
        res.status(405).json({ success: false, message: 'Method not allowed' });
      }

    } else if (url.includes('/clinics')) {
      // Clinics management: GET/POST /api/admin/clinics
      verifyAdmin(req);
      await connectDB();

      if (req.method === 'GET') {
        const clinics = await Clinic.find().lean();
        
        const clinicsWithCounts = await Promise.all(
          clinics.map(async (clinic) => {
            const userCount = await User.countDocuments({ 
              clinicId: clinic.clinicId,
              isActive: true 
            });
            
            return {
              id: clinic._id,
              clinicId: clinic.clinicId,
              clinicName: clinic.clinicName,
              isActive: clinic.isActive,
              userCount,
              createdAt: clinic.createdAt,
              updatedAt: clinic.updatedAt
            };
          })
        );

        res.json({
          success: true,
          clinics: clinicsWithCounts
        });

      } else if (req.method === 'POST') {
        const { clinicName, clinicId } = req.body;

        if (!clinicName || !clinicId) {
          return res.status(400).json({
            success: false,
            message: 'Clinic name and ID are required'
          });
        }

        const existingClinic = await Clinic.findOne({ 
          clinicId: clinicId.toUpperCase() 
        });
        
        if (existingClinic) {
          return res.status(400).json({
            success: false,
            message: 'Clinic with this ID already exists'
          });
        }

        const clinic = new Clinic({
          clinicName: clinicName.trim(),
          clinicId: clinicId.toUpperCase().trim(),
          isActive: true
        });

        await clinic.save();

        res.json({
          success: true,
          message: 'Clinic created successfully',
          clinic: {
            id: clinic._id,
            clinicId: clinic.clinicId,
            clinicName: clinic.clinicName,
            isActive: clinic.isActive,
            userCount: 0
          }
        });

      } else {
        res.status(405).json({ success: false, message: 'Method not allowed' });
      }

    } else {
      res.status(404).json({
        success: false,
        message: 'Admin endpoint not found'
      });
    }

  } catch (error) {
    console.error('Admin error:', error);
    
    if (error.message === 'No token provided' || error.message === 'Admin access required') {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
}
