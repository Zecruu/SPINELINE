const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');

// Load environment variables from the server directory
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Connect to MongoDB
const connectDB = async () => {
  try {
    // Use the connection string directly if env var is not found
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://nomnk5138:Redzone12@spinev0.zbqy7hv.mongodb.net/?retryWrites=true&w=majority&appName=spinev0';
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// User Schema (simplified)
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  passwordHash: String,
  role: String,
  clinicId: String,
  isActive: Boolean
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// Fix password for a user
const fixUserPassword = async (email, newPassword) => {
  try {
    console.log(`🔧 Fixing password for user: ${email}`);
    
    // Find the user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return;
    }
    
    console.log(`👤 Found user: ${user.name} (${user.role}) - Clinic: ${user.clinicId}`);
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the user's password
    await User.findByIdAndUpdate(user._id, {
      passwordHash: hashedPassword
    });
    
    console.log(`✅ Password updated successfully for ${email}`);
    console.log(`🔑 New password: ${newPassword}`);
    
  } catch (error) {
    console.error('❌ Error fixing password:', error);
  }
};

// Main function
const main = async () => {
  await connectDB();
  
  // Fix password for the user that's failing to login
  await fixUserPassword('aivinmorales@gmail.com', 'password123');
  
  // Also check if we can create a doctor account
  const doctorEmail = 'doctor@draaiv.com';
  const existingDoctor = await User.findOne({ email: doctorEmail });
  
  if (!existingDoctor) {
    console.log(`🏥 Creating doctor account: ${doctorEmail}`);
    
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const newDoctor = new User({
      name: 'Dr. Test Doctor',
      email: doctorEmail,
      passwordHash: hashedPassword,
      role: 'doctor',
      clinicId: 'DRAAIV',
      isActive: true
    });
    
    await newDoctor.save();
    console.log(`✅ Doctor account created: ${doctorEmail}`);
    console.log(`🔑 Password: password123`);
  } else {
    console.log(`👨‍⚕️ Doctor account already exists: ${doctorEmail}`);
    if (!existingDoctor.passwordHash) {
      await fixUserPassword(doctorEmail, 'password123');
    }
  }
  
  console.log('\n🎉 Password fix complete!');
  console.log('\n📋 Available accounts:');
  console.log('1. Secretary: nomnk5138@gmail.com');
  console.log('2. User: aivinmorales@gmail.com (password: password123)');
  console.log('3. Doctor: doctor@draaiv.com (password: password123)');
  console.log('   Clinic ID: DRAAIV');
  
  process.exit(0);
};

main().catch(console.error);
