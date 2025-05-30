const mongoose = require('mongoose');
const { SoapTemplate } = require('../models');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://nomnk5138:Redzone12@spinev0.zbqy7hv.mongodb.net/?retryWrites=true&w=majority&appName=spinev0';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Default SOAP templates for chiropractic practice
const defaultTemplates = [
  {
    templateName: 'Lumbar Adjustment',
    category: 'Chiropractic',
    description: 'Standard lumbar spine adjustment template',
    subjective: 'Patient reports low back stiffness and pain rated {{pain_scale}}/10, worse in the morning and after prolonged sitting. Pain radiates to {{patient_name}}\'s right/left leg occasionally.',
    objective: 'Tight lumbar paraspinals noted on palpation. Limited lumbar flexion and extension. No radicular symptoms present. Orthopedic tests negative.',
    assessment: 'Lumbar segmental dysfunction with associated myospasms. Mechanical low back pain.',
    plan: 'Perform diversified lumbar adjustment. Apply heat therapy for 10 minutes. Recommend stretching exercises. Re-evaluate next visit.',
    defaultPain: 6
  },
  {
    templateName: 'Cervical Adjustment',
    category: 'Chiropractic',
    description: 'Standard cervical spine adjustment template',
    subjective: 'Patient {{patient_name}} complains of neck pain and stiffness rated {{pain_scale}}/10. Pain increases with head rotation and looking up.',
    objective: 'Restricted cervical range of motion. Tender points at C5-C6 level. Upper trapezius muscle tension bilaterally.',
    assessment: 'Cervical segmental dysfunction. Cervical myofascial pain syndrome.',
    plan: 'Gentle cervical adjustment. Soft tissue therapy to upper trapezius. Home exercises for neck mobility. Follow-up in 3-4 days.',
    defaultPain: 5
  },
  {
    templateName: 'New Patient Evaluation',
    category: 'Evaluation',
    description: 'Comprehensive new patient evaluation template',
    subjective: 'New patient {{patient_name}} presents with chief complaint of {{pain_scale}}/10 pain. Onset was gradual/sudden. Aggravating factors include prolonged sitting/standing. Relieving factors include rest/movement.',
    objective: 'Postural analysis reveals forward head posture and rounded shoulders. Orthopedic and neurological examination within normal limits. Range of motion testing shows restrictions in affected areas.',
    assessment: 'Mechanical dysfunction of the spine with associated soft tissue involvement. No red flags present.',
    plan: 'Initiate conservative chiropractic care. Patient education on posture and ergonomics. Home exercise program. Re-evaluation in 2 weeks.',
    defaultPain: 7
  },
  {
    templateName: 'Re-evaluation Visit',
    category: 'Evaluation',
    description: 'Follow-up re-evaluation template',
    subjective: 'Patient {{patient_name}} reports improvement in symptoms since last visit. Current pain level {{pain_scale}}/10, down from previous level. Functional activities are improving.',
    objective: 'Improved range of motion compared to initial examination. Decreased muscle tension on palpation. Patient demonstrates better posture awareness.',
    assessment: 'Positive response to conservative chiropractic care. Continued improvement in functional status.',
    plan: 'Continue current treatment plan. Advance home exercise program. Discuss return to full activities. Next re-evaluation in 2 weeks.',
    defaultPain: 4
  },
  {
    templateName: 'Maintenance Care',
    category: 'Maintenance',
    description: 'Routine maintenance care template',
    subjective: 'Patient {{patient_name}} here for routine maintenance care. Reports feeling well with minimal discomfort rated {{pain_scale}}/10. No new complaints.',
    objective: 'Spine maintains good alignment. Minimal muscle tension noted. Range of motion within normal limits.',
    assessment: 'Patient maintaining good spinal health. No acute issues present.',
    plan: 'Routine spinal adjustment for maintenance. Continue home exercise program. Next maintenance visit in 4-6 weeks.',
    defaultPain: 2
  },
  {
    templateName: 'Headache Treatment',
    category: 'Headache',
    description: 'Cervicogenic headache treatment template',
    subjective: 'Patient {{patient_name}} presents with headaches rated {{pain_scale}}/10. Headaches originate from the neck and radiate to temples/forehead. Frequency is daily/weekly.',
    objective: 'Upper cervical restrictions noted at C1-C2. Suboccipital muscle tension. Forward head posture observed.',
    assessment: 'Cervicogenic headache secondary to upper cervical dysfunction.',
    plan: 'Upper cervical adjustment. Suboccipital release. Postural correction exercises. Ergonomic assessment recommended.',
    defaultPain: 6
  },
  {
    templateName: 'Sports Injury',
    category: 'Sports Medicine',
    description: 'Athletic injury evaluation and treatment',
    subjective: 'Athlete {{patient_name}} injured during {{visit_type}} activity. Pain level {{pain_scale}}/10. Mechanism of injury was twisting/impact/overuse.',
    objective: 'Localized tenderness and swelling noted. Range of motion limited by pain. Functional movement patterns compromised.',
    assessment: 'Sports-related musculoskeletal injury. No signs of fracture or serious pathology.',
    plan: 'Conservative treatment with adjustment and soft tissue therapy. Ice application. Gradual return to activity protocol. Follow-up in 48-72 hours.',
    defaultPain: 7
  },
  {
    templateName: 'Pregnancy Care',
    category: 'Prenatal',
    description: 'Prenatal chiropractic care template',
    subjective: 'Pregnant patient {{patient_name}} at {{visit_type}} weeks gestation. Reports low back pain rated {{pain_scale}}/10. Pain increases with prolonged standing.',
    objective: 'Increased lumbar lordosis consistent with pregnancy. Sacroiliac joint tenderness. Round ligament tension noted.',
    assessment: 'Pregnancy-related low back pain. Sacroiliac dysfunction.',
    plan: 'Gentle prenatal adjustments using pregnancy-safe techniques. Supportive exercises. Maternity support belt recommended. Follow-up weekly.',
    defaultPain: 5
  }
];

// Seed SOAP templates for all clinics
const seedSoapTemplates = async () => {
  try {
    // Get all clinic IDs
    const clinics = await mongoose.connection.db.collection('clinics').find({}).toArray();

    if (clinics.length === 0) {
      console.log('⚠️  No clinics found. Creating templates for DRAAIV clinic only.');
      const clinicIds = ['DRAAIV'];

      for (const clinicId of clinicIds) {
        await createTemplatesForClinic(clinicId);
      }
    } else {
      for (const clinic of clinics) {
        await createTemplatesForClinic(clinic.clinicId);
      }
    }

    console.log('\n🎉 SOAP templates seeding completed!');
  } catch (error) {
    console.error('❌ Error seeding SOAP templates:', error);
  }
};

// Create templates for a specific clinic
const createTemplatesForClinic = async (clinicId) => {
  console.log(`\n🏥 Seeding SOAP templates for clinic: ${clinicId}`);

  for (const templateData of defaultTemplates) {
    try {
      const existingTemplate = await SoapTemplate.findOne({
        clinicId,
        templateName: templateData.templateName
      });

      if (!existingTemplate) {
        const template = new SoapTemplate({
          ...templateData,
          clinicId,
          createdBy: 'System Seed'
        });

        await template.save();
        console.log(`✅ Added: ${templateData.templateName} (${templateData.category})`);
      } else {
        console.log(`⏭️  Skipped: ${templateData.templateName} - already exists`);
      }
    } catch (error) {
      console.error(`❌ Error creating template ${templateData.templateName}:`, error.message);
    }
  }
};

// Run the seeding
const run = async () => {
  await connectDB();
  await seedSoapTemplates();
  await mongoose.disconnect();
  console.log('✅ Disconnected from MongoDB');
};

run();
