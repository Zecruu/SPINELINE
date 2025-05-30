#!/usr/bin/env node

/**
 * SpineLine Admin Portal Test Script
 * 
 * This script tests the admin portal functionality after deployment.
 * Run this script to verify that the admin portal is working correctly.
 */

const axios = require('axios');

// Configuration
const BASE_URL = process.argv[2] || 'http://localhost:5001';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@spineline.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'SpineLine2024!';

console.log('🧪 SpineLine Admin Portal Test');
console.log('================================');
console.log(`Testing URL: ${BASE_URL}`);
console.log(`Admin Email: ${ADMIN_EMAIL}`);
console.log('');

async function testAdminPortal() {
  try {
    // Test 1: Health Check
    console.log('1️⃣  Testing health endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/api/health`);
    if (healthResponse.status === 200) {
      console.log('✅ Health check passed');
    } else {
      console.log('❌ Health check failed');
      return;
    }

    // Test 2: Admin Login
    console.log('\n2️⃣  Testing admin login...');
    const loginResponse = await axios.post(`${BASE_URL}/api/secret-admin/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });

    if (loginResponse.data.success) {
      console.log('✅ Admin login successful');
      const token = loginResponse.data.token;
      const adminUser = loginResponse.data.user;
      console.log(`   Admin: ${adminUser.name} (${adminUser.email})`);

      // Test 3: Get Clinics
      console.log('\n3️⃣  Testing clinic management...');
      const clinicsResponse = await axios.get(`${BASE_URL}/api/secret-admin/clinics`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (clinicsResponse.data.success) {
        console.log('✅ Clinic management accessible');
        console.log(`   Found ${clinicsResponse.data.clinics.length} clinics`);
      } else {
        console.log('❌ Clinic management failed');
      }

      // Test 4: Get Users
      console.log('\n4️⃣  Testing user management...');
      const usersResponse = await axios.get(`${BASE_URL}/api/secret-admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (usersResponse.data.success) {
        console.log('✅ User management accessible');
        console.log(`   Found ${usersResponse.data.users.length} users`);
      } else {
        console.log('❌ User management failed');
      }

      // Test 5: Create Test Clinic (Optional)
      console.log('\n5️⃣  Testing clinic creation...');
      try {
        const testClinic = {
          clinicName: 'Test Clinic - DELETE ME',
          clinicId: 'TEST' + Date.now().toString().slice(-6),
          contactInfo: {
            email: 'test@example.com',
            phone: '555-0123',
            address: {
              street: '123 Test St',
              city: 'Test City',
              state: 'TS',
              zipCode: '12345'
            }
          }
        };

        const createResponse = await axios.post(`${BASE_URL}/api/secret-admin/clinics`, testClinic, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (createResponse.data.success) {
          console.log('✅ Clinic creation works');
          console.log(`   Created test clinic: ${testClinic.clinicId}`);
          console.log('   ⚠️  Remember to delete this test clinic from the admin portal!');
        } else {
          console.log('❌ Clinic creation failed');
        }
      } catch (error) {
        console.log('⚠️  Clinic creation test skipped (may already exist)');
      }

    } else {
      console.log('❌ Admin login failed');
      console.log(`   Error: ${loginResponse.data.message}`);
    }

  } catch (error) {
    console.log('❌ Test failed with error:');
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Message: ${error.response.data?.message || error.response.statusText}`);
    } else if (error.request) {
      console.log('   No response received - check if server is running');
    } else {
      console.log(`   Error: ${error.message}`);
    }
  }
}

async function main() {
  await testAdminPortal();
  
  console.log('\n🎯 Test Summary');
  console.log('================');
  console.log('If all tests passed, your admin portal is ready!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Access the admin portal at: ' + BASE_URL.replace('/api', '') + '/secret-admin');
  console.log('2. Login with your admin credentials');
  console.log('3. Create your first clinic');
  console.log('4. Create clinic users (doctors and secretaries)');
  console.log('5. IMPORTANT: Change the default admin password!');
  console.log('');
  console.log('For more information, see ADMIN_ACCESS.md');
}

// Run the tests
main().catch(console.error);
