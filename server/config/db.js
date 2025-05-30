const mongoose = require('mongoose');

// Connection retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 3000; // 3 seconds

const connectDB = async (retryCount = 0) => {
  try {
    // Set mongoose options
    mongoose.set('strictQuery', false);

    console.log('🔄 Attempting to connect to MongoDB Atlas...');
    
    // Check if MONGO_URI is set
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000, // Increased from 5000
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority'
    });

    console.log(`✅ MongoDB Connected Successfully!`);
    console.log(`   Host: ${conn.connection.host}`);
    console.log(`   Database: ${conn.connection.name}`);
    console.log(`   Ready State: ${conn.connection.readyState}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
      // Try to reconnect on error
      if (retryCount < MAX_RETRIES) {
        console.log(`Attempting to reconnect (${retryCount + 1}/${MAX_RETRIES})...`);
        setTimeout(() => connectDB(retryCount + 1), RETRY_DELAY);
      }
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
      // Try to reconnect when disconnected
      if (retryCount < MAX_RETRIES) {
        console.log(`Attempting to reconnect (${retryCount + 1}/${MAX_RETRIES})...`);
        setTimeout(() => connectDB(retryCount + 1), RETRY_DELAY);
      }
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });

  } catch (error) {
    console.error('❌ MongoDB Connection Failed!');
    console.error(`   Error: ${error.message}`);

    // Retry logic
    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying connection in ${RETRY_DELAY/1000} seconds... (${retryCount + 1}/${MAX_RETRIES})`);
      setTimeout(() => connectDB(retryCount + 1), RETRY_DELAY);
    } else {
      // Only exit if we've exhausted all retries
      console.error('❌ Max retries reached. Could not connect to MongoDB.');
      
      // Provide specific troubleshooting based on error type
      if (error.message.includes('bad auth')) {
        console.error('\n🔧 AUTHENTICATION ERROR - Try these fixes:');
        console.error('   1. Check MongoDB Atlas → Database Access');
        console.error('   2. Verify database user exists with correct password');
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
      } else if (error.message.includes('MONGO_URI')) {
        console.error('\n🔧 CONFIGURATION ERROR - Try these fixes:');
        console.error('   1. Check your .env file for MONGO_URI');
        console.error('   2. Make sure the connection string is correct');
      }
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
