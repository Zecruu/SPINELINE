const mongoose = require('mongoose');
const { ServiceCode, Clinic } = require('../models');
require('dotenv').config();

const chiropracticCodes = [
  {
    code: '98940',
    description: 'Chiropractic Manipulative Treatment (CMT) - 1-2 Regions',
    category: 'Chiropractic Manipulation',
    unitRate: 65.00,
    isPackage: false,
    insuranceCoverage: ['Medicare', 'Medicaid', 'Most Private Insurance', 'Puerto Rico Health Insurance']
  },
  {
    code: '98941',
    description: 'Chiropractic Manipulative Treatment (CMT) - 3-4 Regions',
    category: 'Chiropractic Manipulation',
    unitRate: 85.00,
    isPackage: false,
    insuranceCoverage: ['Medicare', 'Medicaid', 'Most Private Insurance', 'Puerto Rico Health Insurance']
  },
  {
    code: '98942',
    description: 'Chiropractic Manipulative Treatment (CMT) - 5 Regions',
    category: 'Chiropractic Manipulation',
    unitRate: 105.00,
    isPackage: false,
    insuranceCoverage: ['Medicare', 'Medicaid', 'Most Private Insurance', 'Puerto Rico Health Insurance']
  },
  {
    code: '99213',
    description: 'Office Visit - Established Patient (Low to Moderate Complexity)',
    category: 'Office Visits',
    unitRate: 95.00,
    isPackage: false,
    insuranceCoverage: ['Medicare', 'Medicaid', 'Most Private Insurance', 'Puerto Rico Health Insurance']
  },
  {
    code: '99214',
    description: 'Office Visit - Established Patient (Moderate Complexity)',
    category: 'Office Visits',
    unitRate: 135.00,
    isPackage: false,
    insuranceCoverage: ['Medicare', 'Medicaid', 'Most Private Insurance', 'Puerto Rico Health Insurance']
  }
];

async function addChiropracticCodes() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get all active clinics
    const clinics = await Clinic.find({ isActive: true });
    console.log(`Found ${clinics.length} active clinic(s)`);

    for (const clinic of clinics) {
      console.log(`\nAdding chiropractic codes for clinic: ${clinic.clinicName} (${clinic.clinicId})`);
      
      for (const codeData of chiropracticCodes) {
        // Check if code already exists
        const existingCode = await ServiceCode.findOne({ 
          clinicId: clinic.clinicId, 
          code: codeData.code 
        });

        if (existingCode) {
          console.log(`  - ${codeData.code} already exists, updating...`);
          await ServiceCode.findByIdAndUpdate(existingCode._id, codeData);
        } else {
          console.log(`  - Adding ${codeData.code}: ${codeData.description}`);
          await ServiceCode.create({
            ...codeData,
            clinicId: clinic.clinicId
          });
        }
      }
    }

    console.log('\n✅ Chiropractic codes added successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

addChiropracticCodes();
