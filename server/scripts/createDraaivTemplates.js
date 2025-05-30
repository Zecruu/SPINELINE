const mongoose = require('mongoose');
require('dotenv').config();

// Simple template schema
const soapTemplateSchema = new mongoose.Schema({
  templateName: { type: String, required: true },
  clinicId: { type: String, required: true },
  subjective: String,
  objective: String,
  assessment: String,
  plan: String,
  defaultPain: { type: Number, default: 5 },
  category: { type: String, default: 'General' },
  description: String,
  usageCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  isDefault: { type: Boolean, default: false },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  collection: 'soaptemplates'
});

const SoapTemplate = mongoose.model('SoapTemplate', soapTemplateSchema);

// Templates to create
const templates = [
  {
    templateName: 'Lumbar Adjustment',
    category: 'Chiropractic',
    description: 'Standard lumbar spine adjustment template',
    subjective: 'Patient reports low back stiffness and pain rated {{pain_scale}}/10, worse in the morning and after prolonged sitting.',
    objective: 'Tight lumbar paraspinals noted on palpation. Limited lumbar flexion and extension. No radicular symptoms present.',
    assessment: 'Lumbar segmental dysfunction with associated myospasms. Mechanical low back pain.',
    plan: 'Lumbar spine adjustment performed. Home exercises provided. Ice application recommended. Follow-up in 2-3 days.',
    defaultPain: 6
  },
  {
    templateName: 'Cervical Adjustment',
    category: 'Chiropractic',
    description: 'Cervical spine adjustment template',
    subjective: 'Patient {{patient_name}} presents with neck pain and stiffness rated {{pain_scale}}/10. Pain radiates to shoulders occasionally.',
    objective: 'Cervical paraspinal muscle tension. Restricted cervical rotation and lateral flexion. Upper trap trigger points present.',
    assessment: 'Cervical segmental restriction with myofascial tension. Mechanical neck pain.',
    plan: 'Cervical spine adjustment performed. Soft tissue therapy applied. Postural education provided. Return in 48 hours.',
    defaultPain: 5
  },
  {
    templateName: 'New Patient Evaluation',
    category: 'Evaluation',
    description: 'Comprehensive new patient assessment',
    subjective: 'New patient {{patient_name}} presents for initial evaluation. Chief complaint: {{visit_type}}. Pain level {{pain_scale}}/10.',
    objective: 'Comprehensive examination performed including orthopedic and neurological testing. Postural analysis completed.',
    assessment: 'Initial findings suggest mechanical dysfunction. Further evaluation and treatment indicated.',
    plan: 'Treatment plan discussed with patient. Initial adjustment performed. Home care instructions provided. Follow-up scheduled.',
    defaultPain: 6
  },
  {
    templateName: 'Maintenance Care',
    category: 'Wellness',
    description: 'Routine maintenance visit template',
    subjective: 'Patient {{patient_name}} returns for routine maintenance care. Overall feeling well with minimal discomfort {{pain_scale}}/10.',
    objective: 'General muscle tension noted. Joint mobility within normal limits. No acute findings.',
    assessment: 'Maintenance phase of care. Preventive treatment indicated.',
    plan: 'Routine adjustment performed. Continue current exercise program. Next visit in 2-4 weeks as needed.',
    defaultPain: 2
  }
];

// Connect and create templates
const run = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect('mongodb+srv://nomnk5138:Redzone12@spinev0.zbqy7hv.mongodb.net/spineline?retryWrites=true&w=majority&appName=spinev0');
    console.log('✅ Connected to MongoDB');

    console.log('\n🏥 Creating SOAP templates for clinic: DRAAIV');

    // Delete existing templates for DRAAIV to start fresh
    const deleteResult = await SoapTemplate.deleteMany({ clinicId: 'DRAAIV' });
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} existing templates`);

    // Create new templates
    for (const templateData of templates) {
      const template = new SoapTemplate({
        ...templateData,
        clinicId: 'DRAAIV',
        createdBy: 'System Setup'
      });

      await template.save();
      console.log(`✅ Created: ${templateData.templateName}`);
    }

    // Verify creation
    const count = await SoapTemplate.countDocuments({ clinicId: 'DRAAIV', isActive: true });
    console.log(`\n🎉 Successfully created ${count} active templates for DRAAIV clinic!`);

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

run();
