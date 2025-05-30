const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Set mongoose options
    mongoose.set('strictQuery', false);

    console.log('🔄 Attempting to connect to MongoDB Atlas...');

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });

    console.log(`✅ MongoDB Connected Successfully!`);
    console.log(`   Host: ${conn.connection.host}`);
    console.log(`   Database: ${conn.connection.name}`);
    console.log(`   Ready State: ${conn.connection.readyState}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });

  } catch (error) {
    console.error('❌ MongoDB Connection Failed!');
    console.error(`   Error: ${error.message}`);

    // Provide specific troubleshooting based on error type
    if (error.message.includes('bad auth')) {
      console.error('\n🔧 AUTHENTICATION ERROR - Try these fixes:');
      console.error('   1. Check MongoDB Atlas → Database Access');
      console.error('   2. Verify user "nomnk5138" exists with correct password');
      console.error('   3. Ensure user has "readWrite" permissions');
      console.error('   4. Try creating a new database user');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('\n🔧 NETWORK ERROR - Try these fixes:');
      console.error('   1. Check your internet connection');
      console.error('   2. Verify MongoDB Atlas → Network Access');
      console.error('   3. Add 0.0.0.0/0 to IP whitelist');
    } else if (error.message.includes('timeout')) {
      console.error('\n🔧 TIMEOUT ERROR - Try these fixes:');
      console.error('   1. Check if cluster is paused in MongoDB Atlas');
      console.error('   2. Verify cluster is running');
      console.error('   3. Try a different network connection');
    }

    console.error('\n📝 Server will continue running with limited functionality');
    console.error('🔧 Fix MongoDB connection to enable full admin features');
  }
};

// Function to check if MongoDB is connected
const isConnected = () => {
  return mongoose.connection.readyState === 1;
};

module.exports = { connectDB, isConnected };
