const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

// Import the Appointment model
const Appointment = require('../models/Appointment');

const fixAppointmentDates = async () => {
  try {
    console.log('🔍 Checking for appointments with date issues...');
    
    // Get today's date
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayString = `${year}-${month}-${day}`;
    
    console.log(`📅 Today's date: ${todayString}`);
    
    // Find appointments that might have date issues
    const appointments = await Appointment.find({})
      .populate('patientId', 'firstName lastName')
      .sort({ appointmentDate: -1 });
    
    console.log(`📊 Found ${appointments.length} total appointments`);
    
    // Check each appointment
    for (const apt of appointments) {
      const aptDateString = apt.appointmentDate.toISOString().split('T')[0];
      const patientName = apt.patientId ? `${apt.patientId.firstName} ${apt.patientId.lastName}` : 'Unknown';
      
      console.log(`  - ${patientName}: ${aptDateString} (Status: ${apt.status})`);
      
      // If you want to update a specific appointment (like Aivin's), you can do it here
      // Example: Update Aivin's appointment to today's date
      if (patientName.includes('Aivin') && aptDateString !== todayString) {
        console.log(`🔄 Updating ${patientName}'s appointment from ${aptDateString} to ${todayString}`);
        
        // Parse today's date as local date
        const newDate = new Date(year, today.getMonth(), today.getDate());
        
        await Appointment.findByIdAndUpdate(apt._id, {
          appointmentDate: newDate,
          updatedAt: new Date(),
          updatedBy: 'System Fix Script'
        });
        
        console.log(`✅ Updated ${patientName}'s appointment date`);
      }
    }
    
    console.log('✅ Date fix script completed');
    
  } catch (error) {
    console.error('❌ Error fixing appointment dates:', error);
  }
};

const main = async () => {
  await connectDB();
  await fixAppointmentDates();
  await mongoose.disconnect();
  console.log('👋 Disconnected from MongoDB');
};

// Run the script
main();
