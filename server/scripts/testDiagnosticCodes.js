const mongoose = require('mongoose');
const { DiagnosticCode } = require('../models');
require('dotenv').config();

async function testDiagnosticCodes() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Test for clinic DRAAIV
    const clinicId = 'DRAAIV';
    
    console.log(`\n🔍 Testing diagnostic codes for clinic: ${clinicId}`);
    
    // Test 1: Get all diagnostic codes
    const allCodes = await DiagnosticCode.find({ clinicId, isActive: true });
    console.log(`📊 Total diagnostic codes: ${allCodes.length}`);
    
    // Test 2: Get commonly used codes
    const commonCodes = await DiagnosticCode.find({ clinicId, isActive: true, commonlyUsed: true });
    console.log(`⭐ Commonly used codes: ${commonCodes.length}`);
    
    // Test 3: Get codes by category
    const musculoskeletalCodes = await DiagnosticCode.find({ 
      clinicId, 
      isActive: true, 
      category: 'Musculoskeletal' 
    });
    console.log(`🦴 Musculoskeletal codes: ${musculoskeletalCodes.length}`);
    
    // Test 4: Search functionality
    const backPainCodes = await DiagnosticCode.find({
      clinicId,
      isActive: true,
      $or: [
        { code: { $regex: 'M54', $options: 'i' } },
        { description: { $regex: 'back pain', $options: 'i' } }
      ]
    });
    console.log(`🔍 Back pain related codes: ${backPainCodes.length}`);
    
    // Display some sample codes
    console.log('\n📋 Sample diagnostic codes:');
    const sampleCodes = allCodes.slice(0, 5);
    sampleCodes.forEach(code => {
      console.log(`   ${code.code}: ${code.description} (${code.category})`);
    });
    
    // Display commonly used codes
    console.log('\n⭐ Commonly used codes:');
    commonCodes.slice(0, 10).forEach(code => {
      console.log(`   ${code.code}: ${code.description}`);
    });
    
    console.log('\n✅ Diagnostic codes test completed successfully!');

  } catch (error) {
    console.error('❌ Error testing diagnostic codes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
if (require.main === module) {
  testDiagnosticCodes();
}

module.exports = { testDiagnosticCodes };
