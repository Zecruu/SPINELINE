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

// Improved templates without default pain scales
const improvedTemplates = [
  {
    templateName: 'Comprehensive Initial Evaluation',
    category: 'Initial Evaluation',
    description: 'Thorough initial patient assessment template',
    subjective: 'Chief Complaint: {{chief_complaint}}\n\nHistory of Present Illness: Patient {{patient_name}} reports {{location}} pain with {{quality}} characteristics. Pain began {{duration}} ago in the context of {{context}}. Current pain level is {{pain_scale}}/10. Pain is {{timing}} and is {{modifying_factors}}. Associated symptoms include {{associated_symptoms}}.\n\nPast Medical History: [Document relevant medical history]\nMedications: [List current medications]\nAllergies: [Document allergies]\nSocial History: [Occupation, activities, lifestyle factors]',
    objective: 'Vital Signs: [Document if applicable]\nObservation: Patient appears [comfortable/uncomfortable], [ambulatory/assisted], posture shows [findings]\nPalpation: [Document muscle tension, trigger points, inflammation]\nRange of Motion: [Document specific measurements and limitations]\nOrthopedic Tests: [Document specific tests performed and results]\nNeurological: [Document reflexes, sensation, motor strength as applicable]',
    assessment: 'Primary Diagnosis: [ICD-10 code and description]\nSecondary Diagnoses: [Additional diagnoses as applicable]\nClinical Impression: [Professional assessment of condition, prognosis, and contributing factors]',
    plan: 'Treatment Plan:\n1. [Specific treatment modalities]\n2. [Frequency and duration of care]\n3. [Home care instructions]\n4. [Activity modifications]\n5. [Follow-up schedule]\n6. [Referrals if needed]\n7. [Patient education provided]'
  },
  {
    templateName: 'Routine Follow-Up Visit',
    category: 'Follow-Up',
    description: 'Standard follow-up visit template',
    subjective: 'Patient {{patient_name}} returns for follow-up care. Reports current pain level of {{pain_scale}}/10. Since last visit, patient notes [improvement/no change/worsening] in symptoms. Compliance with home exercises: [excellent/good/fair/poor]. Any new complaints: [document new issues or "none reported"].',
    objective: 'Patient appears [comfortable/uncomfortable] today. Posture and gait [improved/unchanged/declined]. Palpation reveals [current findings compared to previous visit]. Range of motion [improved/maintained/decreased]. Functional movement [assessment].',
    assessment: 'Patient showing [excellent/good/fair/poor] response to treatment. [Specific improvements or concerns noted]. Condition is [stable/improving/declining].',
    plan: 'Continue current treatment plan with [modifications as needed]. [Specific treatments provided today]. Home care: [updated instructions]. Next visit: [schedule]. [Any additional recommendations].'
  },
  {
    templateName: 'Acute Pain Management',
    category: 'Acute Care',
    description: 'Template for acute pain episodes',
    subjective: 'Patient {{patient_name}} presents with acute {{location}} pain rated {{pain_scale}}/10. Pain began {{timing}} and is described as {{quality}}. Aggravating factors: {{modifying_factors}}. Patient reports [functional limitations]. Sleep quality: [affected/unaffected]. Work/daily activities: [impact level].',
    objective: 'Patient demonstrates [protective posturing/guarding/antalgic gait]. Acute inflammation [present/absent]. Muscle spasm noted in [specific areas]. Range of motion significantly limited by pain. Neurological screening [normal/abnormal - specify findings].',
    assessment: 'Acute [condition] with significant functional limitation. Pain level and presentation consistent with [clinical findings]. Prognosis for this episode: [good/fair/guarded] with appropriate care.',
    plan: 'Immediate goals: Pain reduction and inflammation control. Treatment: [specific modalities]. Activity modification: [specific restrictions]. Ice/heat therapy: [recommendations]. Follow-up: [timeline]. Red flags discussed: [when to seek immediate care].'
  }
];

async function createImprovedTemplates() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Get all clinics
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const clinics = await User.distinct('clinicId', { role: 'doctor' });

    console.log(`Found ${clinics.length} clinics`);

    for (const clinicId of clinics) {
      console.log(`\nCreating improved templates for clinic: ${clinicId}`);

      for (const templateData of improvedTemplates) {
        // Check if template already exists
        const existing = await SoapTemplate.findOne({
          clinicId: clinicId,
          templateName: templateData.templateName
        });

        if (existing) {
          console.log(`  ⚠️  Template "${templateData.templateName}" already exists, skipping`);
          continue;
        }

        // Create new template
        const template = new SoapTemplate({
          ...templateData,
          clinicId: clinicId,
          createdBy: 'System - Improved Templates',
          isDefault: true
        });

        await template.save();
        console.log(`  ✅ Created template: ${templateData.templateName}`);
      }
    }

    console.log('\n🎉 Improved SOAP templates created successfully!');

  } catch (error) {
    console.error('Error creating improved templates:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  createImprovedTemplates();
}

module.exports = { createImprovedTemplates };
