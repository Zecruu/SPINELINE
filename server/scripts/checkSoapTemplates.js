const mongoose = require('mongoose');
const { SoapTemplate } = require('../models');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb+srv://nomnk5138:Redzone12@spinev0.zbqy7hv.mongodb.net/?retryWrites=true&w=majority&appName=spinev0';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Check SOAP templates
const checkTemplates = async () => {
  try {
    console.log('\n🔍 Checking SOAP templates in database...\n');
    
    // Get all templates
    const allTemplates = await SoapTemplate.find({});
    console.log(`📊 Total templates in database: ${allTemplates.length}`);
    
    if (allTemplates.length === 0) {
      console.log('❌ No templates found in database!');
      return;
    }
    
    // Group by clinic
    const templatesByClinic = {};
    allTemplates.forEach(template => {
      if (!templatesByClinic[template.clinicId]) {
        templatesByClinic[template.clinicId] = [];
      }
      templatesByClinic[template.clinicId].push({
        name: template.templateName,
        isActive: template.isActive,
        category: template.category
      });
    });
    
    console.log('\n📋 Templates by clinic:');
    Object.keys(templatesByClinic).forEach(clinicId => {
      console.log(`\n🏥 Clinic: ${clinicId} (${templatesByClinic[clinicId].length} templates)`);
      templatesByClinic[clinicId].forEach(template => {
        const status = template.isActive ? '✅ Active' : '❌ Inactive';
        console.log(`   ${status} ${template.name} (${template.category})`);
      });
    });
    
    // Check specifically for DRAAIV
    console.log('\n🎯 DRAAIV clinic analysis:');
    const draaivTemplates = await SoapTemplate.find({ clinicId: 'DRAAIV' });
    console.log(`   Total DRAAIV templates: ${draaivTemplates.length}`);
    
    const draaivActiveTemplates = await SoapTemplate.find({ clinicId: 'DRAAIV', isActive: true });
    console.log(`   Active DRAAIV templates: ${draaivActiveTemplates.length}`);
    
    if (draaivActiveTemplates.length > 0) {
      console.log('   Active templates:');
      draaivActiveTemplates.forEach(template => {
        console.log(`     - ${template.templateName} (${template.category})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking templates:', error);
  }
};

// Run the check
const run = async () => {
  await connectDB();
  await checkTemplates();
  await mongoose.disconnect();
  console.log('\n✅ Disconnected from MongoDB');
};

run();
