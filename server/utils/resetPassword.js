const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String },
  passwordHash: { type: String },
  role: { type: String, enum: ['doctor', 'secretary', 'admin'], default: 'doctor' },
  clinicId: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date }
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const resetUserPassword = async (email, newPassword) => {
  try {
    await connectDB();
    
    console.log(`🔄 Resetting password for: ${email}`);
    
    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return;
    }
    
    console.log(`👤 Found user: ${user.name} (${user.role}) - Clinic: ${user.clinicId}`);
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update both password fields to ensure compatibility
    await User.updateOne(
      { email: email.toLowerCase() },
      { 
        password: hashedPassword,
        passwordHash: hashedPassword
      }
    );
    
    console.log(`✅ Password reset successful for: ${email}`);
    console.log(`🔑 New password: ${newPassword}`);
    
    // Verify the password works
    const updatedUser = await User.findOne({ email: email.toLowerCase() });
    const isValid = await bcrypt.compare(newPassword, updatedUser.password || updatedUser.passwordHash);
    
    if (isValid) {
      console.log(`✅ Password verification successful`);
    } else {
      console.log(`❌ Password verification failed`);
    }
    
  } catch (error) {
    console.error('❌ Error resetting password:', error);
  } finally {
    await mongoose.disconnect();
  }
};

// Reset passwords for all DRAAIV users
const resetAllPasswords = async () => {
  try {
    await connectDB();
    
    console.log('🔄 Resetting all DRAAIV user passwords...\n');
    
    const users = await User.find({ clinicId: 'DRAAIV', isActive: true });
    
    for (const user of users) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      await User.updateOne(
        { _id: user._id },
        { 
          password: hashedPassword,
          passwordHash: hashedPassword
        }
      );
      
      console.log(`✅ Reset password for: ${user.email} (${user.role})`);
    }
    
    console.log('\n🎉 All passwords reset to: password123');
    console.log('\n📋 Available accounts:');
    
    const updatedUsers = await User.find({ clinicId: 'DRAAIV', isActive: true });
    updatedUsers.forEach(user => {
      console.log(`   - ${user.email} (${user.role}) - password: password123`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
};

// Run the reset
resetAllPasswords();
