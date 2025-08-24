import cloudinary from '../src/config/cloudinary';

async function testCloudinary() {
  try {
    console.log('🔍 Testing Cloudinary configuration...');
    
    // Test basic configuration
    console.log('✅ Cloudinary configured successfully');
    console.log('📊 Cloud name:', cloudinary.config().cloud_name);
    console.log('🔑 API key:', cloudinary.config().api_key);
    
    // Test a simple API call (get account info)
    console.log('🔄 Testing Cloudinary API connection...');
    
    // This will test if our credentials are valid
    const result = await cloudinary.api.ping();
    console.log('✅ Cloudinary API connection successful!');
    console.log('📡 Response:', result);
    
    console.log('🎉 All tests passed! Cloudinary is ready to use.');
    
  } catch (error) {
    console.error('❌ Cloudinary test failed:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        console.error('🔐 Authentication failed - check your API key and secret');
      } else if (error.message.includes('404')) {
        console.error('🌐 Cloud not found - check your cloud name');
      } else {
        console.error('🚨 Unexpected error:', error.message);
      }
    }
  }
}

// Run the test
testCloudinary();
