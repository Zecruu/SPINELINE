require('dotenv').config();
const mongoose = require('mongoose');
const { DxCluster, CareKit, Clinic } = require('../models');

// Default Dx Clusters for chiropractic practices
const defaultDxClusters = [
  {
    name: 'Lower Back Pain Complex',
    description: 'Common lower back pain diagnoses',
    category: 'Spine Conditions',
    isDefault: true,
    codes: [
      { code: 'M54.5', description: 'Low back pain', category: 'Musculoskeletal' },
      { code: 'M54.50', description: 'Low back pain, unspecified', category: 'Musculoskeletal' },
      { code: 'M99.03', description: 'Segmental and somatic dysfunction of lumbar region', category: 'Musculoskeletal' },
      { code: 'M62.830', description: 'Muscle spasm of back', category: 'Musculoskeletal' }
    ]
  },
  {
    name: 'Neck Pain & Cervical Issues',
    description: 'Cervical spine and neck pain diagnoses',
    category: 'Spine Conditions',
    isDefault: true,
    codes: [
      { code: 'M54.2', description: 'Cervicalgia', category: 'Musculoskeletal' },
      { code: 'M99.01', description: 'Segmental and somatic dysfunction of cervical region', category: 'Musculoskeletal' },
      { code: 'M25.511', description: 'Pain in right shoulder', category: 'Musculoskeletal' },
      { code: 'M25.512', description: 'Pain in left shoulder', category: 'Musculoskeletal' }
    ]
  },
  {
    name: 'Headache Syndromes',
    description: 'Various types of headaches',
    category: 'Neurological',
    isDefault: true,
    codes: [
      { code: 'G44.1', description: 'Vascular headache, not elsewhere classified', category: 'Nervous System' },
      { code: 'G44.209', description: 'Tension-type headache, unspecified, not intractable', category: 'Nervous System' },
      { code: 'M53.0', description: 'Cervicocranial syndrome', category: 'Musculoskeletal' },
      { code: 'G44.89', description: 'Other specified headache syndromes', category: 'Nervous System' }
    ]
  },
  {
    name: 'Joint Dysfunction',
    description: 'Common joint dysfunction diagnoses',
    category: 'Joint Disorders',
    isDefault: true,
    codes: [
      { code: 'M99.00', description: 'Segmental and somatic dysfunction of head region', category: 'Musculoskeletal' },
      { code: 'M99.02', description: 'Segmental and somatic dysfunction of thoracic region', category: 'Musculoskeletal' },
      { code: 'M99.04', description: 'Segmental and somatic dysfunction of sacral region', category: 'Musculoskeletal' },
      { code: 'M99.05', description: 'Segmental and somatic dysfunction of pelvic region', category: 'Musculoskeletal' }
    ]
  },
  {
    name: 'Acute Injury',
    description: 'Acute injury and trauma codes',
    category: 'Acute Injuries',
    isDefault: true,
    codes: [
      { code: 'S13.4XXA', description: 'Sprain of ligaments of cervical spine, initial encounter', category: 'Injury/Trauma' },
      { code: 'S33.5XXA', description: 'Sprain of ligaments of lumbar spine, initial encounter', category: 'Injury/Trauma' },
      { code: 'M79.1', description: 'Myalgia', category: 'Musculoskeletal' },
      { code: 'M25.50', description: 'Pain in unspecified joint', category: 'Musculoskeletal' }
    ]
  }
];

// Default Care Kits for chiropractic practices
const defaultCareKits = [
  {
    name: 'Initial Evaluation Package',
    description: 'Comprehensive initial patient evaluation',
    category: 'Initial Evaluation',
    treatmentType: 'Chiropractic',
    isDefault: true,
    services: [
      { code: '99203', description: 'Office visit, new patient, level 3', unitCount: 1, unitRate: 150.00, category: 'Office Visits' },
      { code: '72020', description: 'Radiologic examination, spine, single view', unitCount: 2, unitRate: 75.00, category: 'Radiology' }
    ]
  },
  {
    name: 'Standard Chiropractic Treatment',
    description: 'Regular chiropractic adjustment session',
    category: 'Follow-up Treatment',
    treatmentType: 'Chiropractic',
    isDefault: true,
    services: [
      { code: '98941', description: 'Chiropractic manipulative treatment, spinal, 3-4 regions', unitCount: 1, unitRate: 75.00, category: 'Chiropractic Manipulation' },
      { code: '97014', description: 'Electrical stimulation (unattended)', unitCount: 1, unitRate: 25.00, category: 'Physical Medicine Modalities' }
    ]
  },
  {
    name: 'Comprehensive Treatment Session',
    description: 'Full treatment with multiple modalities',
    category: 'Follow-up Treatment',
    treatmentType: 'Combined Therapy',
    isDefault: true,
    services: [
      { code: '98942', description: 'Chiropractic manipulative treatment, spinal, 5 regions', unitCount: 1, unitRate: 85.00, category: 'Chiropractic Manipulation' },
      { code: '97140', description: 'Manual therapy techniques', unitCount: 1, unitRate: 45.00, category: 'Manual Therapy' },
      { code: '97012', description: 'Mechanical traction', unitCount: 1, unitRate: 30.00, category: 'Physical Medicine Modalities' }
    ]
  },
  {
    name: 'Acute Care Package',
    description: 'Intensive treatment for acute conditions',
    category: 'Acute Care Package',
    treatmentType: 'Chiropractic',
    isDefault: true,
    discountPercentage: 10,
    services: [
      { code: '98941', description: 'Chiropractic manipulative treatment, spinal, 3-4 regions', unitCount: 1, unitRate: 75.00, category: 'Chiropractic Manipulation' },
      { code: '97014', description: 'Electrical stimulation (unattended)', unitCount: 1, unitRate: 25.00, category: 'Physical Medicine Modalities' },
      { code: '97012', description: 'Mechanical traction', unitCount: 1, unitRate: 30.00, category: 'Physical Medicine Modalities' },
      { code: '97124', description: 'Massage therapy', unitCount: 1, unitRate: 40.00, category: 'Manual Therapy' }
    ]
  },
  {
    name: 'Maintenance Care',
    description: 'Ongoing maintenance and wellness care',
    category: 'Maintenance Care',
    treatmentType: 'Chiropractic',
    isDefault: true,
    discountPercentage: 15,
    services: [
      { code: '98940', description: 'Chiropractic manipulative treatment, spinal, 1-2 regions', unitCount: 1, unitRate: 65.00, category: 'Chiropractic Manipulation' },
      { code: '97110', description: 'Therapeutic exercise', unitCount: 1, unitRate: 35.00, category: 'Exercise' }
    ]
  },
  {
    name: 'Sports Injury Treatment',
    description: 'Specialized treatment for sports-related injuries',
    category: 'Sports Injury',
    treatmentType: 'Combined Therapy',
    isDefault: true,
    services: [
      { code: '98941', description: 'Chiropractic manipulative treatment, spinal, 3-4 regions', unitCount: 1, unitRate: 75.00, category: 'Chiropractic Manipulation' },
      { code: '97112', description: 'Neuromuscular reeducation', unitCount: 1, unitRate: 45.00, category: 'Exercise' },
      { code: '97110', description: 'Therapeutic exercise', unitCount: 1, unitRate: 35.00, category: 'Exercise' },
      { code: '97140', description: 'Manual therapy techniques', unitCount: 1, unitRate: 45.00, category: 'Manual Therapy' }
    ]
  }
];

async function seedBundles() {
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
      
      // Seed Dx Clusters
      console.log('📊 Seeding Dx Clusters...');
      for (const clusterData of defaultDxClusters) {
        // Check if cluster already exists
        const existingCluster = await DxCluster.findOne({
          clinicId: clinic.clinicId,
          name: clusterData.name
        });

        if (!existingCluster) {
          const cluster = new DxCluster({
            ...clusterData,
            clinicId: clinic.clinicId,
            createdBy: 'System Seed'
          });
          await cluster.save();
          console.log(`  ✅ Created Dx Cluster: ${clusterData.name}`);
        } else {
          console.log(`  ⏭️ Dx Cluster already exists: ${clusterData.name}`);
        }
      }

      // Seed Care Kits
      console.log('🧰 Seeding Care Kits...');
      for (const kitData of defaultCareKits) {
        // Check if kit already exists
        const existingKit = await CareKit.findOne({
          clinicId: clinic.clinicId,
          name: kitData.name
        });

        if (!existingKit) {
          const kit = new CareKit({
            ...kitData,
            clinicId: clinic.clinicId,
            createdBy: 'System Seed'
          });
          await kit.save();
          console.log(`  ✅ Created Care Kit: ${kitData.name}`);
        } else {
          console.log(`  ⏭️ Care Kit already exists: ${kitData.name}`);
        }
      }
    }

    console.log('\n🎉 Bundle seeding completed successfully!');
    console.log(`📊 Seeded ${defaultDxClusters.length} Dx Clusters per clinic`);
    console.log(`🧰 Seeded ${defaultCareKits.length} Care Kits per clinic`);

  } catch (error) {
    console.error('❌ Error seeding bundles:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the seeding function
if (require.main === module) {
  seedBundles();
}

module.exports = seedBundles;
