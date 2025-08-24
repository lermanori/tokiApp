import cloudinary from '../src/config/cloudinary';

async function simpleUploadTest() {
  try {
    console.log('🧪 Simple Cloudinary upload test...');
    
    // Create a simple test image (1x1 pixel PNG)
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00,
      0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC, 0x33,
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    
    console.log('🖼️  Created test image buffer');
    
    // Test 1: Simple upload with just public_id
    console.log('\n📤 Test 1: Simple upload with public_id only');
    const result1 = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          public_id: 'test_simple_upload',
          tags: ['test']
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(testImageBuffer);
    });
    
    console.log('✅ Upload 1 successful:');
    console.log('   Public ID:', (result1 as any).public_id);
    console.log('   URL:', (result1 as any).secure_url);
    
    // Test 2: Upload with folder and public_id
    console.log('\n📤 Test 2: Upload with folder and public_id');
    const result2 = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          folder: 'toki/test',
          public_id: 'test_folder_upload',
          tags: ['test']
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(testImageBuffer);
    });
    
    console.log('✅ Upload 2 successful:');
    console.log('   Public ID:', (result2 as any).public_id);
    console.log('   URL:', (result2 as any).secure_url);
    
    // Test 3: Upload with full path in public_id
    console.log('\n📤 Test 3: Upload with full path in public_id');
    const result3 = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          public_id: 'toki/test/test_full_path',
          tags: ['test']
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(testImageBuffer);
    });
    
    console.log('✅ Upload 3 successful:');
    console.log('   Public ID:', (result3 as any).public_id);
    console.log('   URL:', (result3 as any).secure_url);
    
    // Clean up test images
    console.log('\n🧹 Cleaning up test images...');
    
    try {
      await cloudinary.uploader.destroy((result1 as any).public_id);
      console.log('   ✅ Test 1 image deleted');
    } catch (error) {
      console.log('   ⚠️  Failed to delete test 1 image:', error);
    }
    
    try {
      await cloudinary.uploader.destroy((result2 as any).public_id);
      console.log('   ✅ Test 2 image deleted');
    } catch (error) {
      console.log('   ⚠️  Failed to delete test 2 image:', error);
    }
    
    try {
      await cloudinary.uploader.destroy((result3 as any).public_id);
      console.log('   ✅ Test 3 image deleted');
    } catch (error) {
      console.log('   ⚠️  Failed to delete test 3 image:', error);
    }
    
    console.log('\n🎉 Simple upload test completed!');
    
  } catch (error) {
    console.error('❌ Simple upload test failed:', error);
  }
}

// Run the test
simpleUploadTest();
