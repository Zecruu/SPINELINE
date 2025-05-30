const mongoose = require('mongoose');
const { ServiceCode } = require('../models');
require('dotenv').config();

const sampleServiceCodes = [
  // CHIROPRACTIC MANIPULATION CODES (Most Common - High Insurance Coverage)
  {
    code: '98940',
    description: 'Chiropractic Manipulative Treatment (CMT) - 1-2 Regions',
    category: 'Chiropractic Manipulation',
    unitRate: 65.00,
    duration: 15,
    isPackage: false,
    insuranceCoverage: ['Medicare', 'Medicaid', 'Most Private Insurance', 'Puerto Rico Health Insurance']
  },
  {
    code: '98941',
    description: 'Chiropractic Manipulative Treatment (CMT) - 3-4 Regions',
    category: 'Chiropractic Manipulation',
    unitRate: 85.00,
    duration: 20,
    isPackage: false,
    insuranceCoverage: ['Medicare', 'Medicaid', 'Most Private Insurance', 'Puerto Rico Health Insurance']
  },
  {
    code: '98942',
    description: 'Chiropractic Manipulative Treatment (CMT) - 5 Regions',
    category: 'Chiropractic Manipulation',
    unitRate: 105.00,
    duration: 25,
    isPackage: false,
    insuranceCoverage: ['Medicare', 'Medicaid', 'Most Private Insurance', 'Puerto Rico Health Insurance']
  },

  // PHYSICAL THERAPY CODES (High Insurance Coverage)
  {
    code: '97110',
    description: 'Therapeutic Exercise',
    category: 'Therapeutic Procedures',
    unitRate: 45.00,
    duration: 15,
    isPackage: false,
    insuranceCoverage: ['Medicare', 'Medicaid', 'Most Private Insurance', 'Puerto Rico Health Insurance']
  },
  {
    code: '97112',
    description: 'Neuromuscular Re-education',
    category: 'Therapeutic Procedures',
    unitRate: 50.00,
    duration: 15,
    isPackage: false,
    insuranceCoverage: ['Medicare', 'Medicaid', 'Most Private Insurance', 'Puerto Rico Health Insurance']
  },
  {
    code: '97116',
    description: 'Gait Training',
    category: 'Therapeutic Procedures',
    unitRate: 48.00,
    duration: 15,
    isPackage: false,
    insuranceCoverage: ['Medicare', 'Medicaid', 'Most Private Insurance', 'Puerto Rico Health Insurance']
  },
  {
    code: '97140',
    description: 'Manual Therapy Techniques',
    category: 'Manual Therapy',
    unitRate: 55.00,
    duration: 15,
    isPackage: false,
    insuranceCoverage: ['Medicare', 'Medicaid', 'Most Private Insurance', 'Puerto Rico Health Insurance']
  },
  {
    code: '97530',
    description: 'Therapeutic Activities',
    category: 'Therapeutic Procedures',
    unitRate: 52.00,
    duration: 15,
    isPackage: false,
    insuranceCoverage: ['Medicare', 'Medicaid', 'Most Private Insurance', 'Puerto Rico Health Insurance']
  },

  // EVALUATION CODES (High Insurance Coverage)
  {
    code: '97161',
    description: 'Physical Therapy Evaluation - Low Complexity',
    category: 'Evaluation',
    unitRate: 120.00,
    duration: 30,
    isPackage: false,
    insuranceCoverage: ['Medicare', 'Medicaid', 'Most Private Insurance', 'Puerto Rico Health Insurance']
  },
  {
    code: '97162',
    description: 'Physical Therapy Evaluation - Moderate Complexity',
    category: 'Evaluation',
    unitRate: 150.00,
    duration: 45,
    isPackage: false,
    insuranceCoverage: ['Medicare', 'Medicaid', 'Most Private Insurance', 'Puerto Rico Health Insurance']
  },
  {
    code: '97163',
    description: 'Physical Therapy Evaluation - High Complexity',
    category: 'Evaluation',
    unitRate: 180.00,
    duration: 60,
    isPackage: false,
    insuranceCoverage: ['Medicare', 'Medicaid', 'Most Private Insurance', 'Puerto Rico Health Insurance']
  },
  {
    code: '97164',
    description: 'Physical Therapy Re-evaluation',
    category: 'Evaluation',
    unitRate: 100.00,
    duration: 20,
    isPackage: false,
    insuranceCoverage: ['Medicare', 'Medicaid', 'Most Private Insurance', 'Puerto Rico Health Insurance']
  },

  // MODALITIES (Good Insurance Coverage)
  {
    code: '97035',
    description: 'Ultrasound Therapy',
    category: 'Physical Medicine Modalities',
    unitRate: 25.00,
    duration: 10,
    isPackage: false,
    insuranceCoverage: ['Medicare', 'Medicaid', 'Most Private Insurance', 'Puerto Rico Health Insurance']
  },
  {
    code: '97014',
    description: 'Electrical Stimulation (Unattended)',
    category: 'Physical Medicine Modalities',
    unitRate: 30.00,
    duration: 15,
    isPackage: false,
    insuranceCoverage: ['Medicare', 'Medicaid', 'Most Private Insurance', 'Puerto Rico Health Insurance']
  },
  {
    code: '97010',
    description: 'Hot/Cold Packs Application',
    category: 'Physical Medicine Modalities',
    unitRate: 15.00,
    duration: 15,
    isPackage: false,
    insuranceCoverage: ['Medicare', 'Medicaid', 'Most Private Insurance', 'Puerto Rico Health Insurance']
  },
  {
    code: '97012',
    description: 'Mechanical Traction',
    category: 'Physical Medicine Modalities',
    unitRate: 35.00,
    duration: 15,
    isPackage: false,
    insuranceCoverage: ['Medicare', 'Medicaid', 'Most Private Insurance', 'Puerto Rico Health Insurance']
  },

  // MASSAGE THERAPY (Limited Coverage)
  {
    code: '97124',
    description: 'Massage Therapy (15 minutes)',
    category: 'Manual Therapy',
    unitRate: 40.00,
    duration: 15,
    isPackage: false,
    insuranceCoverage: ['Some Private Insurance', 'Limited Coverage']
  },

  // ACUPUNCTURE (Growing Coverage)
  {
    code: '97810',
    description: 'Acupuncture - 1 or more needles, without electrical stimulation',
    category: 'Acupuncture',
    unitRate: 75.00,
    duration: 30,
    isPackage: false,
    insuranceCoverage: ['Some Medicare Plans', 'Many Private Insurance', 'Puerto Rico Health Insurance']
  },
  {
    code: '97813',
    description: 'Acupuncture - 1 or more needles, with electrical stimulation',
    category: 'Acupuncture',
    unitRate: 85.00,
    duration: 30,
    isPackage: false,
    insuranceCoverage: ['Some Medicare Plans', 'Many Private Insurance', 'Puerto Rico Health Insurance']
  },

  // ADDITIONAL PHYSICAL THERAPY CODES (High Coverage)
  {
    code: '97535',
    description: 'Self-care/Home Management Training',
    category: 'Therapeutic Procedures',
    unitRate: 48.00,
    duration: 15,
    isPackage: false,
    insuranceCoverage: ['Medicare', 'Medicaid', 'Most Private Insurance', 'Puerto Rico Health Insurance']
  },
  {
    code: '97750',
    description: 'Physical Performance Test',
    category: 'Evaluation',
    unitRate: 85.00,
    duration: 30,
    isPackage: false,
    insuranceCoverage: ['Medicare', 'Medicaid', 'Most Private Insurance', 'Puerto Rico Health Insurance']
  },
  {
    code: '97760',
    description: 'Orthotic Training',
    category: 'Therapeutic Procedures',
    unitRate: 55.00,
    duration: 15,
    isPackage: false,
    insuranceCoverage: ['Medicare', 'Medicaid', 'Most Private Insurance', 'Puerto Rico Health Insurance']
  },

  // ELECTRICAL STIMULATION CODES (Good Coverage)
  {
    code: '97032',
    description: 'Electrical Stimulation (Manual)',
    category: 'Physical Medicine Modalities',
    unitRate: 40.00,
    duration: 15,
    isPackage: false,
    insuranceCoverage: ['Medicare', 'Medicaid', 'Most Private Insurance', 'Puerto Rico Health Insurance']
  },
  {
    code: '97033',
    description: 'Iontophoresis',
    category: 'Physical Medicine Modalities',
    unitRate: 45.00,
    duration: 15,
    isPackage: false,
    insuranceCoverage: ['Medicare', 'Medicaid', 'Most Private Insurance', 'Puerto Rico Health Insurance']
  },

  // OFFICE VISIT CODES (High Coverage)
  {
    code: '99213',
    description: 'Office Visit - Established Patient (Low to Moderate Complexity)',
    category: 'Office Visits',
    unitRate: 95.00,
    duration: 15,
    isPackage: false,
    insuranceCoverage: ['Medicare', 'Medicaid', 'Most Private Insurance', 'Puerto Rico Health Insurance']
  },
  {
    code: '99214',
    description: 'Office Visit - Established Patient (Moderate Complexity)',
    category: 'Office Visits',
    unitRate: 135.00,
    duration: 25,
    isPackage: false,
    insuranceCoverage: ['Medicare', 'Medicaid', 'Most Private Insurance', 'Puerto Rico Health Insurance']
  },
  {
    code: '99203',
    description: 'Office Visit - New Patient (Low to Moderate Complexity)',
    category: 'Office Visits',
    unitRate: 150.00,
    duration: 30,
    isPackage: false,
    insuranceCoverage: ['Medicare', 'Medicaid', 'Most Private Insurance', 'Puerto Rico Health Insurance']
  },
  {
    code: '99204',
    description: 'Office Visit - New Patient (Moderate Complexity)',
    category: 'Office Visits',
    unitRate: 200.00,
    duration: 45,
    isPackage: false,
    insuranceCoverage: ['Medicare', 'Medicaid', 'Most Private Insurance', 'Puerto Rico Health Insurance']
  },

  // X-RAY CODES (High Coverage)
  {
    code: '72020',
    description: 'X-ray Spine, Single View',
    category: 'Radiology',
    unitRate: 65.00,
    duration: 10,
    isPackage: false,
    insuranceCoverage: ['Medicare', 'Medicaid', 'Most Private Insurance', 'Puerto Rico Health Insurance']
  },
  {
    code: '72100',
    description: 'X-ray Spine, 2 or 3 Views',
    category: 'Radiology',
    unitRate: 85.00,
    duration: 15,
    isPackage: false,
    insuranceCoverage: ['Medicare', 'Medicaid', 'Most Private Insurance', 'Puerto Rico Health Insurance']
  },
  {
    code: '72110',
    description: 'X-ray Spine, Complete (4 or 5 Views)',
    category: 'Radiology',
    unitRate: 120.00,
    duration: 20,
    isPackage: false,
    insuranceCoverage: ['Medicare', 'Medicaid', 'Most Private Insurance', 'Puerto Rico Health Insurance']
  },

  // PUERTO RICO SPECIFIC CODES (Common in PR Healthcare System)
  {
    code: '97001',
    description: 'Physical Therapy Evaluation (Legacy Code - Still Used in PR)',
    category: 'Evaluation',
    unitRate: 125.00,
    duration: 45,
    isPackage: false,
    insuranceCoverage: ['Puerto Rico Health Insurance', 'Some Private Insurance']
  },
  {
    code: '97002',
    description: 'Physical Therapy Re-evaluation (Legacy Code - Still Used in PR)',
    category: 'Evaluation',
    unitRate: 85.00,
    duration: 30,
    isPackage: false,
    insuranceCoverage: ['Puerto Rico Health Insurance', 'Some Private Insurance']
  },

  // THERAPEUTIC MODALITIES (Good Coverage)
  {
    code: '97016',
    description: 'Vasopneumatic Devices',
    category: 'Physical Medicine Modalities',
    unitRate: 35.00,
    duration: 20,
    isPackage: false,
    insuranceCoverage: ['Medicare', 'Medicaid', 'Most Private Insurance', 'Puerto Rico Health Insurance']
  },
  {
    code: '97018',
    description: 'Paraffin Bath',
    category: 'Physical Medicine Modalities',
    unitRate: 20.00,
    duration: 20,
    isPackage: false,
    insuranceCoverage: ['Medicare', 'Medicaid', 'Most Private Insurance', 'Puerto Rico Health Insurance']
  },
  {
    code: '97022',
    description: 'Whirlpool',
    category: 'Physical Medicine Modalities',
    unitRate: 30.00,
    duration: 15,
    isPackage: false,
    insuranceCoverage: ['Medicare', 'Medicaid', 'Most Private Insurance', 'Puerto Rico Health Insurance']
  },
  {
    code: '97026',
    description: 'Infrared Therapy',
    category: 'Physical Medicine Modalities',
    unitRate: 25.00,
    duration: 15,
    isPackage: false,
    insuranceCoverage: ['Medicare', 'Medicaid', 'Most Private Insurance', 'Puerto Rico Health Insurance']
  },

  // WORK HARDENING/CONDITIONING (Limited Coverage)
  {
    code: '97545',
    description: 'Work Hardening/Conditioning (Initial 2 hours)',
    category: 'Work Conditioning',
    unitRate: 180.00,
    duration: 120,
    isPackage: false,
    insuranceCoverage: ['Workers Compensation', 'Some Private Insurance']
  },
  {
    code: '97546',
    description: 'Work Hardening/Conditioning (Each Additional Hour)',
    category: 'Work Conditioning',
    unitRate: 90.00,
    duration: 60,
    isPackage: false,
    insuranceCoverage: ['Workers Compensation', 'Some Private Insurance']
  },

  // Package Service Codes
  {
    code: 'PKG001',
    description: 'Basic Chiropractic Care Package',
    category: 'Other',
    unitRate: 450.00,
    duration: 50, // 20+15+15 minutes per session
    isPackage: true,
    insuranceCoverage: ['Most Private Insurance', 'Puerto Rico Health Insurance'],
    packageDetails: {
      totalSessions: 6,
      includedCodes: [
        { code: '98941', description: 'Chiropractic Manipulative Treatment (CMT) - 3-4 Regions', unitsPerSession: 1 },
        { code: '97010', description: 'Hot/Cold Packs Application', unitsPerSession: 1 },
        { code: '97014', description: 'Electrical Stimulation (Unattended)', unitsPerSession: 1 }
      ],
      validityDays: 90
    }
  },
  {
    code: 'PKG002',
    description: 'Comprehensive Chiropractic Package',
    category: 'Other',
    unitRate: 750.00,
    duration: 65, // 20+15+15+10+5 minutes per session
    isPackage: true,
    insuranceCoverage: ['Most Private Insurance', 'Puerto Rico Health Insurance'],
    packageDetails: {
      totalSessions: 10,
      includedCodes: [
        { code: '98941', description: 'Chiropractic Manipulative Treatment (CMT) - 3-4 Regions', unitsPerSession: 1 },
        { code: '97140', description: 'Manual Therapy Techniques', unitsPerSession: 1 },
        { code: '97110', description: 'Therapeutic Exercise', unitsPerSession: 1 },
        { code: '97035', description: 'Ultrasound Therapy', unitsPerSession: 1 }
      ],
      validityDays: 120
    }
  },
  {
    code: 'PKG003',
    description: 'Physical Therapy Rehabilitation Package',
    category: 'Other',
    unitRate: 600.00,
    duration: 55, // 15+15+15+10 minutes per session
    isPackage: true,
    insuranceCoverage: ['Medicare', 'Medicaid', 'Most Private Insurance', 'Puerto Rico Health Insurance'],
    packageDetails: {
      totalSessions: 8,
      includedCodes: [
        { code: '97110', description: 'Therapeutic Exercise', unitsPerSession: 1 },
        { code: '97112', description: 'Neuromuscular Re-education', unitsPerSession: 1 },
        { code: '97140', description: 'Manual Therapy Techniques', unitsPerSession: 1 },
        { code: '97035', description: 'Ultrasound Therapy', unitsPerSession: 1 }
      ],
      validityDays: 90
    }
  },
  {
    code: 'PKG004',
    description: 'Sports Injury Recovery Package',
    category: 'Other',
    unitRate: 800.00,
    duration: 90, // 30+15+15+30 minutes per session
    isPackage: true,
    insuranceCoverage: ['Most Private Insurance', 'Workers Compensation'],
    packageDetails: {
      totalSessions: 12,
      includedCodes: [
        { code: '97110', description: 'Therapeutic Exercise', unitsPerSession: 2 },
        { code: '97116', description: 'Gait Training', unitsPerSession: 1 },
        { code: '97140', description: 'Manual Therapy Techniques', unitsPerSession: 1 },
        { code: '97750', description: 'Physical Performance Test', unitsPerSession: 1 }
      ],
      validityDays: 120
    }
  },
  {
    code: 'PKG005',
    description: 'Senior Wellness Package',
    category: 'Other',
    unitRate: 350.00,
    duration: 45, // 15+15+15 minutes per session
    isPackage: true,
    insuranceCoverage: ['Medicare', 'Medicaid', 'Puerto Rico Health Insurance'],
    packageDetails: {
      totalSessions: 6,
      includedCodes: [
        { code: '97110', description: 'Therapeutic Exercise', unitsPerSession: 1 },
        { code: '97535', description: 'Self-care/Home Management Training', unitsPerSession: 1 },
        { code: '97010', description: 'Hot/Cold Packs Application', unitsPerSession: 1 }
      ],
      validityDays: 60
    }
  },
  {
    code: 'PKG006',
    description: 'Work Injury Rehabilitation Package',
    category: 'Other',
    unitRate: 950.00,
    duration: 180, // 120+15+15+30 minutes per session
    isPackage: true,
    insuranceCoverage: ['Workers Compensation'],
    packageDetails: {
      totalSessions: 8,
      includedCodes: [
        { code: '97545', description: 'Work Hardening/Conditioning (Initial 2 hours)', unitsPerSession: 1 },
        { code: '97110', description: 'Therapeutic Exercise', unitsPerSession: 1 },
        { code: '97140', description: 'Manual Therapy Techniques', unitsPerSession: 1 },
        { code: '97750', description: 'Physical Performance Test', unitsPerSession: 1 }
      ],
      validityDays: 90
    }
  }
];

async function seedServiceCodes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Get all clinics to seed service codes for each
    const { Clinic } = require('../models');
    const clinics = await Clinic.find({ isActive: true });

    if (clinics.length === 0) {
      console.log('No active clinics found. Please create clinics first.');
      return;
    }

    console.log(`Found ${clinics.length} active clinic(s)`);

    for (const clinic of clinics) {
      console.log(`\nSeeding service codes for clinic: ${clinic.clinicName} (${clinic.clinicId})`);

      // Clear existing service codes for this clinic to update with new comprehensive list
      const deletedCount = await ServiceCode.deleteMany({ clinicId: clinic.clinicId });
      if (deletedCount.deletedCount > 0) {
        console.log(`  - Cleared ${deletedCount.deletedCount} existing service codes`);
      }

      // Create service codes for this clinic
      const serviceCodesForClinic = sampleServiceCodes.map(code => ({
        ...code,
        clinicId: clinic.clinicId
      }));

      const createdCodes = await ServiceCode.insertMany(serviceCodesForClinic);
      console.log(`  - Created ${createdCodes.length} service codes`);

      // Log chiropractic codes
      const chiropractic = createdCodes.filter(code => code.category === 'Chiropractic Manipulation');
      console.log(`  - Including ${chiropractic.length} chiropractic manipulation code(s):`);
      chiropractic.forEach(code => {
        console.log(`    * ${code.code}: ${code.description} ($${code.unitRate})`);
      });

      // Log package details
      const packages = createdCodes.filter(code => code.isPackage);
      console.log(`  - Including ${packages.length} package(s):`);
      packages.forEach(pkg => {
        console.log(`    * ${pkg.code}: ${pkg.description} ($${pkg.unitRate}, ${pkg.packageDetails.totalSessions} sessions)`);
      });
    }

    console.log('\n✅ Service codes seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding service codes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seeding function
if (require.main === module) {
  seedServiceCodes();
}

module.exports = { seedServiceCodes, sampleServiceCodes };
