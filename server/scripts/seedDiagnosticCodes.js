const mongoose = require('mongoose');
const { DiagnosticCode, Clinic } = require('../models');
require('dotenv').config();

// Common ICD-10 diagnostic codes for chiropractic practices
const commonDiagnosticCodes = [
  // MUSCULOSKELETAL - SPINE (Most Common)
  {
    code: 'M54.5',
    description: 'Low back pain',
    category: 'Musculoskeletal',
    bodySystem: 'Spine',
    commonlyUsed: true,
    severity: 'Unspecified',
    chronicity: 'Unspecified'
  },
  {
    code: 'M54.2',
    description: 'Cervicalgia (neck pain)',
    category: 'Musculoskeletal',
    bodySystem: 'Spine',
    commonlyUsed: true,
    severity: 'Unspecified',
    chronicity: 'Unspecified'
  },
  {
    code: 'M54.6',
    description: 'Pain in thoracic spine',
    category: 'Musculoskeletal',
    bodySystem: 'Spine',
    commonlyUsed: true,
    severity: 'Unspecified',
    chronicity: 'Unspecified'
  },
  {
    code: 'M54.3',
    description: 'Sciatica',
    category: 'Musculoskeletal',
    bodySystem: 'Spine',
    commonlyUsed: true,
    severity: 'Unspecified',
    chronicity: 'Unspecified'
  },
  {
    code: 'M54.4',
    description: 'Lumbago with sciatica',
    category: 'Musculoskeletal',
    bodySystem: 'Spine',
    commonlyUsed: true,
    severity: 'Unspecified',
    chronicity: 'Unspecified'
  },

  // SEGMENTAL AND SOMATIC DYSFUNCTION (M99 codes - Very Important for Chiropractic)
  {
    code: 'M99.01',
    description: 'Segmental and somatic dysfunction of cervical region',
    category: 'Musculoskeletal',
    bodySystem: 'Spine',
    commonlyUsed: true,
    severity: 'Unspecified',
    chronicity: 'Unspecified'
  },
  {
    code: 'M99.02',
    description: 'Segmental and somatic dysfunction of thoracic region',
    category: 'Musculoskeletal',
    bodySystem: 'Spine',
    commonlyUsed: true,
    severity: 'Unspecified',
    chronicity: 'Unspecified'
  },
  {
    code: 'M99.03',
    description: 'Segmental and somatic dysfunction of lumbar region',
    category: 'Musculoskeletal',
    bodySystem: 'Spine',
    commonlyUsed: true,
    severity: 'Unspecified',
    chronicity: 'Unspecified'
  },
  {
    code: 'M99.04',
    description: 'Segmental and somatic dysfunction of sacral region',
    category: 'Musculoskeletal',
    bodySystem: 'Spine',
    commonlyUsed: true,
    severity: 'Unspecified',
    chronicity: 'Unspecified'
  },
  {
    code: 'M99.05',
    description: 'Segmental and somatic dysfunction of pelvic region',
    category: 'Musculoskeletal',
    bodySystem: 'Pelvis',
    commonlyUsed: true,
    severity: 'Unspecified',
    chronicity: 'Unspecified'
  },
  {
    code: 'M99.06',
    description: 'Segmental and somatic dysfunction of lower extremity',
    category: 'Musculoskeletal',
    bodySystem: 'Lower Extremity',
    commonlyUsed: false,
    severity: 'Unspecified',
    chronicity: 'Unspecified'
  },
  {
    code: 'M99.07',
    description: 'Segmental and somatic dysfunction of upper extremity',
    category: 'Musculoskeletal',
    bodySystem: 'Upper Extremity',
    commonlyUsed: false,
    severity: 'Unspecified',
    chronicity: 'Unspecified'
  },
  {
    code: 'M99.08',
    description: 'Segmental and somatic dysfunction of rib cage',
    category: 'Musculoskeletal',
    bodySystem: 'Thorax',
    commonlyUsed: false,
    severity: 'Unspecified',
    chronicity: 'Unspecified'
  },
  {
    code: 'M99.09',
    description: 'Segmental and somatic dysfunction of abdomen and other regions',
    category: 'Musculoskeletal',
    bodySystem: 'Abdomen',
    commonlyUsed: false,
    severity: 'Unspecified',
    chronicity: 'Unspecified'
  },

  // MUSCULOSKELETAL - CERVICAL SPINE
  {
    code: 'M50.30',
    description: 'Other cervical disc degeneration, unspecified cervical region',
    category: 'Musculoskeletal',
    bodySystem: 'Spine',
    commonlyUsed: true,
    severity: 'Unspecified',
    chronicity: 'Chronic'
  },
  {
    code: 'M50.20',
    description: 'Other cervical disc displacement, unspecified cervical region',
    category: 'Musculoskeletal',
    bodySystem: 'Spine',
    commonlyUsed: false,
    severity: 'Unspecified',
    chronicity: 'Unspecified'
  },

  // MUSCULOSKELETAL - LUMBAR SPINE
  {
    code: 'M51.36',
    description: 'Other intervertebral disc degeneration, lumbar region',
    category: 'Musculoskeletal',
    bodySystem: 'Spine',
    commonlyUsed: true,
    severity: 'Unspecified',
    chronicity: 'Chronic'
  },
  {
    code: 'M51.26',
    description: 'Other intervertebral disc displacement, lumbar region',
    category: 'Musculoskeletal',
    bodySystem: 'Spine',
    commonlyUsed: false,
    severity: 'Unspecified',
    chronicity: 'Unspecified'
  },
  {
    code: 'M51.16',
    description: 'Intervertebral disc disorders with radiculopathy, lumbar region',
    category: 'Musculoskeletal',
    bodySystem: 'Spine',
    commonlyUsed: true,
    severity: 'Moderate',
    chronicity: 'Unspecified'
  },

  // MUSCULOSKELETAL - EXTREMITIES
  {
    code: 'M25.511',
    description: 'Pain in right shoulder',
    category: 'Musculoskeletal',
    bodySystem: 'Upper Extremity',
    commonlyUsed: true,
    severity: 'Unspecified',
    chronicity: 'Unspecified'
  },
  {
    code: 'M25.512',
    description: 'Pain in left shoulder',
    category: 'Musculoskeletal',
    bodySystem: 'Upper Extremity',
    commonlyUsed: true,
    severity: 'Unspecified',
    chronicity: 'Unspecified'
  },
  {
    code: 'M25.561',
    description: 'Pain in right knee',
    category: 'Musculoskeletal',
    bodySystem: 'Lower Extremity',
    commonlyUsed: true,
    severity: 'Unspecified',
    chronicity: 'Unspecified'
  },
  {
    code: 'M25.562',
    description: 'Pain in left knee',
    category: 'Musculoskeletal',
    bodySystem: 'Lower Extremity',
    commonlyUsed: true,
    severity: 'Unspecified',
    chronicity: 'Unspecified'
  },

  // HEADACHES
  {
    code: 'G44.1',
    description: 'Vascular headache, not elsewhere classified',
    category: 'Nervous System',
    bodySystem: 'Head/Neck',
    commonlyUsed: true,
    severity: 'Unspecified',
    chronicity: 'Unspecified'
  },
  {
    code: 'G44.209',
    description: 'Tension-type headache, unspecified, not intractable',
    category: 'Nervous System',
    bodySystem: 'Head/Neck',
    commonlyUsed: true,
    severity: 'Unspecified',
    chronicity: 'Unspecified'
  },

  // INJURY/TRAUMA
  {
    code: 'S13.4XXA',
    description: 'Sprain of ligaments of cervical spine, initial encounter',
    category: 'Injury/Trauma',
    bodySystem: 'Spine',
    commonlyUsed: true,
    severity: 'Unspecified',
    chronicity: 'Acute'
  },
  {
    code: 'S33.5XXA',
    description: 'Sprain of ligaments of lumbar spine, initial encounter',
    category: 'Injury/Trauma',
    bodySystem: 'Spine',
    commonlyUsed: true,
    severity: 'Unspecified',
    chronicity: 'Acute'
  },
  {
    code: 'S23.3XXA',
    description: 'Sprain of ligaments of thoracic spine, initial encounter',
    category: 'Injury/Trauma',
    bodySystem: 'Spine',
    commonlyUsed: false,
    severity: 'Unspecified',
    chronicity: 'Acute'
  },

  // SYMPTOMS AND SIGNS
  {
    code: 'R52',
    description: 'Pain, unspecified',
    category: 'Symptoms/Signs',
    bodySystem: 'Multiple Systems',
    commonlyUsed: true,
    severity: 'Unspecified',
    chronicity: 'Unspecified'
  },
  {
    code: 'M79.3',
    description: 'Panniculitis, unspecified',
    category: 'Musculoskeletal',
    bodySystem: 'Multiple Systems',
    commonlyUsed: false,
    severity: 'Unspecified',
    chronicity: 'Unspecified'
  },

  // ADDITIONAL COMMON CODES
  {
    code: 'M62.830',
    description: 'Muscle spasm of back',
    category: 'Musculoskeletal',
    bodySystem: 'Spine',
    commonlyUsed: true,
    severity: 'Unspecified',
    chronicity: 'Acute'
  },
  {
    code: 'M79.1',
    description: 'Myalgia',
    category: 'Musculoskeletal',
    bodySystem: 'Multiple Systems',
    commonlyUsed: true,
    severity: 'Unspecified',
    chronicity: 'Unspecified'
  },
  {
    code: 'M79.2',
    description: 'Neuralgia and neuritis, unspecified',
    category: 'Nervous System',
    bodySystem: 'Multiple Systems',
    commonlyUsed: false,
    severity: 'Unspecified',
    chronicity: 'Unspecified'
  },
  {
    code: 'M25.50',
    description: 'Pain in unspecified joint',
    category: 'Musculoskeletal',
    bodySystem: 'Multiple Systems',
    commonlyUsed: true,
    severity: 'Unspecified',
    chronicity: 'Unspecified'
  },

  // FIBROMYALGIA AND CHRONIC PAIN
  {
    code: 'M79.7',
    description: 'Fibromyalgia',
    category: 'Musculoskeletal',
    bodySystem: 'Multiple Systems',
    commonlyUsed: false,
    severity: 'Moderate',
    chronicity: 'Chronic'
  },
  {
    code: 'G89.29',
    description: 'Other chronic pain',
    category: 'Nervous System',
    bodySystem: 'Multiple Systems',
    commonlyUsed: false,
    severity: 'Moderate',
    chronicity: 'Chronic'
  }
];

async function seedDiagnosticCodes() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get all active clinics
    const clinics = await Clinic.find({ isActive: true });
    console.log(`📋 Found ${clinics.length} active clinic(s)`);

    if (clinics.length === 0) {
      console.log('⚠️ No active clinics found. Please create a clinic first.');
      return;
    }

    for (const clinic of clinics) {
      console.log(`\n🏥 Processing clinic: ${clinic.clinicName} (${clinic.clinicId})`);
      
      // Prepare diagnostic codes for this clinic
      const diagnosticCodesForClinic = commonDiagnosticCodes.map(code => ({
        ...code,
        clinicId: clinic.clinicId
      }));

      // Remove existing diagnostic codes for this clinic to avoid duplicates
      await DiagnosticCode.deleteMany({ clinicId: clinic.clinicId });
      console.log(`  - Cleared existing diagnostic codes`);

      // Insert new diagnostic codes
      const createdCodes = await DiagnosticCode.insertMany(diagnosticCodesForClinic);
      console.log(`  - Created ${createdCodes.length} diagnostic codes`);

      // Log commonly used codes
      const commonCodes = createdCodes.filter(code => code.commonlyUsed);
      console.log(`  - Including ${commonCodes.length} commonly used code(s):`);
      commonCodes.forEach(code => {
        console.log(`    * ${code.code}: ${code.description}`);
      });

      // Log by category
      const categories = [...new Set(createdCodes.map(code => code.category))];
      console.log(`  - Categories included: ${categories.join(', ')}`);
    }

    console.log('\n✅ Diagnostic codes seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Total codes per clinic: ${commonDiagnosticCodes.length}`);
    console.log(`   - Commonly used codes: ${commonDiagnosticCodes.filter(c => c.commonlyUsed).length}`);
    console.log(`   - Categories: ${[...new Set(commonDiagnosticCodes.map(c => c.category))].join(', ')}`);

  } catch (error) {
    console.error('❌ Error seeding diagnostic codes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the seeding function
if (require.main === module) {
  seedDiagnosticCodes();
}

module.exports = { seedDiagnosticCodes, commonDiagnosticCodes };
