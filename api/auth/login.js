// User login endpoint for Vercel
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

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

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.models.User || mongoose.model('User', userSchema);

// Clinic Schema
const clinicSchema = new mongoose.Schema({
  clinicName: { type: String, required: true },
  clinicId: { type: String, required: true, unique: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const Clinic = mongoose.models.Clinic || mongoose.model('Clinic', clinicSchema);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }

  try {
    const { email, password, clinicId } = req.body;

    // Validate input
    if (!email || !password || !clinicId) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and clinic ID are required'
      });
    }

    // Connect to database
    await connectDB();

    // Find user by email and clinic ID
    const user = await User.findOne({ 
      email: email.toLowerCase(),
      clinicId: clinicId.toUpperCase(),
      isActive: true
    }).populate('clinic', 'clinicName isActive');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials or clinic ID'
      });
    }

    // Check if clinic is active
    const clinic = await Clinic.findOne({ 
      clinicId: clinicId.toUpperCase(),
      isActive: true 
    });

    if (!clinic) {
      return res.status(401).json({
        success: false,
        message: 'Clinic is inactive. Please contact your administrator.'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = jwt.sign({
      userId: user._id,
      email: user.email,
      role: user.role,
      clinicId: user.clinicId,
      name: user.name
    }, process.env.JWT_SECRET || 'fallback-secret', {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });

    // Log successful login
    console.log(`✅ User login: ${user.email} (${user.role}) - Clinic: ${user.clinicId}`);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        clinicId: user.clinicId,
        clinicName: clinic.clinicName
      }
    });

  } catch (error) {
    console.error('User login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}
