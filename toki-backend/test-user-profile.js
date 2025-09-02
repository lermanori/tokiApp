const axios = require('axios');

async function testUserProfile() {
  const userId = '7035c753-afab-45b6-bb4e-4a4c29cb276c';
  const baseUrl = 'http://localhost:3002';
  
  try {
    console.log('🔍 Testing user profile endpoint...');
    console.log('URL:', `${baseUrl}/api/auth/users/${userId}`);
    
    const response = await axios.get(`${baseUrl}/api/auth/users/${userId}`);
    console.log('✅ Success!');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('❌ Error:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    } else {
      console.log('Error:', error.message);
    }
  }
}

testUserProfile();
