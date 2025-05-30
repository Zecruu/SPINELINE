const mongoose = require('mongoose');
const { SoapTemplate } = require('../models');
require('dotenv').config();

const run = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    const mongoUri = process.env.MONGO_URI || 'mongodb+srv://nomnk5138:Redzone12@spinev0.zbqy7hv.mongodb.net/?retryWrites=true&w=majority&appName=spinev0';
    console.log('🔗 Connection string:', mongoUri.replace(/\/\/.*:.*@/, '//***:***@'));
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    console.log('📊 Database name:', mongoose.connection.name);
    console.log('🏠 Host:', mongoose.connection.host);
    
    // Check collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📁 Available collections:');
    collections.forEach(col => console.log(`   - ${col.name}`));
    
    // Check if soaptemplates collection exists
    const soapTemplatesCollection = collections.find(col => col.name === 'soaptemplates');
    if (soapTemplatesCollection) {
      console.log('\n✅ soaptemplates collection exists');
      
      // Count documents directly in collection
      const directCount = await mongoose.connection.db.collection('soaptemplates').countDocuments();
      console.log(`📊 Direct count from soaptemplates collection: ${directCount}`);
      
      // Get some sample documents
      const sampleDocs = await mongoose.connection.db.collection('soaptemplates').find({}).limit(3).toArray();
      console.log('\n📄 Sample documents:');
      sampleDocs.forEach(doc => {
        console.log(`   - ${doc.templateName} (clinic: ${doc.clinicId}, active: ${doc.isActive})`);
      });
    } else {
      console.log('\n❌ soaptemplates collection does NOT exist');
    }
    
    // Test using the model
    console.log('\n🧪 Testing SoapTemplate model:');
    const modelCount = await SoapTemplate.countDocuments();
    console.log(`📊 Model count: ${modelCount}`);
    
    const modelTemplates = await SoapTemplate.find({}).limit(3);
    console.log(`📄 Model templates found: ${modelTemplates.length}`);
    modelTemplates.forEach(template => {
      console.log(`   - ${template.templateName} (clinic: ${template.clinicId}, active: ${template.isActive})`);
    });
    
    // Test specific query for DRAAIV
    console.log('\n🎯 Testing DRAAIV query:');
    const draaivCount = await SoapTemplate.countDocuments({ clinicId: 'DRAAIV' });
    console.log(`📊 DRAAIV templates count: ${draaivCount}`);
    
    const draaivActiveCount = await SoapTemplate.countDocuments({ clinicId: 'DRAAIV', isActive: true });
    console.log(`📊 DRAAIV active templates count: ${draaivActiveCount}`);
    
    // Test the static method
    console.log('\n🔧 Testing static method:');
    const staticResult = await SoapTemplate.getTemplatesForClinic('DRAAIV');
    console.log(`📊 Static method result: ${staticResult.length} templates`);
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

run();
