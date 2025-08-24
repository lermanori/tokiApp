import cloudinary from '../src/config/cloudinary';

async function testUploadKeepImages() {
  try {
    console.log('🧪 Testing Cloudinary upload - KEEPING IMAGES for visual verification...');
    
    // Create a simple test image (1x1 pixel PNG)
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00,
      0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC, 0x33,
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    
    console.log('🖼️  Created test image buffer (1x1 pixel PNG)');
    
    // Test profile image upload
    console.log('\n📤 Testing profile image upload...');
    const profileResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'toki/profiles',
          resource_type: 'image',
          transformation: [
            { width: 100, height: 100, crop: 'fill' },
            { quality: 'auto', fetch_format: 'auto' }
          ],
          public_id: `user_test-profile_${Date.now()}`,
          tags: ['test', 'profile', 'keep-for-verification']
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      ).end(testImageBuffer);
    });
    
    console.log('✅ Profile image uploaded successfully!');
    console.log('   Public ID:', (profileResult as any).public_id);
    console.log('   URL:', (profileResult as any).secure_url);
    console.log('   Folder:', (profileResult as any).folder);
    
    // Test Toki image upload
    console.log('\n📤 Testing Toki image upload...');
    const tokiResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'toki/tokis',
          resource_type: 'image',
          transformation: [
            { width: 200, height: 150, crop: 'fill' },
            { quality: 'auto', fetch_format: 'auto' }
          ],
          public_id: `toki_test-event_${Date.now()}`,
          tags: ['test', 'toki', 'keep-for-verification']
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      ).end(testImageBuffer);
    });
    
    console.log('✅ Toki image uploaded successfully!');
    console.log('   Public ID:', (tokiResult as any).public_id);
    console.log('   URL:', (tokiResult as any).secure_url);
    console.log('   Folder:', (tokiResult as any).folder);
    
    // Verify folder structure in Cloudinary
    console.log('\n🔍 Verifying folder structure...');
    
    // List resources in the toki folder
    const folderResult = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'toki/',
      max_results: 20,
      tags: 'keep-for-verification'
    });
    
    console.log('📊 Cloudinary folder structure:');
    console.log('   Total resources found:', folderResult.resources.length);
    
    folderResult.resources.forEach((resource: any, index: number) => {
      console.log(`   ${index + 1}. ${resource.public_id} (${resource.folder || 'root'})`);
      console.log(`      URL: ${resource.secure_url}`);
      console.log(`      Created: ${resource.created_at}`);
    });
    
    console.log('\n🎉 Upload test completed successfully!');
    console.log('📁 Images are now visible in your Cloudinary dashboard:');
    console.log('   🌐 Dashboard: https://cloudinary.com/console');
    console.log('   📂 Media Library: https://cloudinary.com/console/media_library');
    console.log('\n📋 Summary of uploaded images:');
    console.log(`   👤 Profile: ${(profileResult as any).public_id}`);
    console.log(`   🏷️  Toki: ${(tokiResult as any).public_id}`);
    console.log('\n💡 You can now:');
    console.log('   1. Visit your Cloudinary dashboard');
    console.log('   2. Check the Media Library');
    console.log('   3. Verify the folder structure: toki/profiles/ and toki/tokis/');
    console.log('   4. See the actual images uploaded');
    console.log('\n⚠️  Note: These test images will remain in your Cloudinary account');
    console.log('   You can manually delete them later from the dashboard if desired');
    
  } catch (error) {
    console.error('❌ Upload test failed:', error);
    
    if (error instanceof Error) {
      console.error('🚨 Error details:', error.message);
    }
  }
}

// Run the test
testUploadKeepImages();
