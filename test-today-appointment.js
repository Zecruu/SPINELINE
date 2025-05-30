const axios = require('axios');

async function createTodayAppointment() {
  try {
    console.log('🔄 Creating appointment for today...');

    // Login first
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'nomnk5138@gmail.com',
      password: 'password123',
      clinicId: 'DRAAIV'
    });

    const token = loginResponse.data.token;
    console.log('✅ Logged in successfully');

    // Get patients first to find Michael Demchak's ID
    const patientsResponse = await axios.get('http://localhost:5000/api/patients', {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('📊 Available patients:');
    patientsResponse.data.patients.forEach(patient => {
      console.log(`  - ${patient.firstName} ${patient.lastName} (ID: ${patient._id})`);
    });

    // Find Michael Demchak
    const michaelDemchak = patientsResponse.data.patients.find(p =>
      p.firstName === 'Michael' && p.lastName === 'Demchak'
    );

    if (!michaelDemchak) {
      console.log('❌ Michael Demchak not found in patients');
      return;
    }

    console.log('✅ Found Michael Demchak:', michaelDemchak._id);

    // Get today's date
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    console.log('📅 Today:', todayStr);

    // Create appointment for today using Michael Demchak's actual ID
    const appointmentResponse = await axios.post('http://localhost:5000/api/appointments', {
      patientId: michaelDemchak._id,
      appointmentDate: todayStr,
      appointmentTime: '10:00',
      visitType: 'Regular Visit',
      duration: 30,
      notes: 'Test appointment for today - created via API'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Appointment created for today:', appointmentResponse.data);

    // Test the today's appointments API
    const todayResponse = await axios.get('http://localhost:5000/api/appointments/today', {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('📊 Today\'s appointments:', todayResponse.data.appointments.length);

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

createTodayAppointment();
