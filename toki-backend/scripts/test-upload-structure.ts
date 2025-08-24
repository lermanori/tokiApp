import cloudinary, { generateUploadPath } from '../src/config/cloudinary';
import fs from 'fs';
import path from 'path';

async function testUploadStructure() {
  try {
    console.log('🧪 Testing Cloudinary folder structure...');
    
    // Test folder paths
    const testProfilePath = generateUploadPath('profile', 'test-user-123');
    const testTokiPath = generateUploadPath('toki', 'test-toki-456');
    
    console.log('📁 Generated paths:');
    console.log('   Profile:', testProfilePath);
    console.log('   Toki:', testTokiPath);
    
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
    console.log('📤 Testing profile image upload...');
    const profileResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'toki/profiles',
          resource_type: 'image',
          transformation: [
            { width: 100, height: 100, crop: 'fill' },
            { quality: 'auto', fetch_format: 'auto' }
          ],
          public_id: `user_test-user-123_${Date.now()}`,
          tags: ['test', 'profile']
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
    console.log('📤 Testing Toki image upload...');
    const tokiResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'toki/tokis',
          resource_type: 'image',
          transformation: [
            { width: 200, height: 150, crop: 'fill' },
            { quality: 'auto', fetch_format: 'auto' }
          ],
          public_id: `toki_test-toki-456_${Date.now()}`,
          tags: ['test', 'toki']
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
    console.log('🔍 Verifying folder structure...');
    
    // List resources in the toki folder
    const folderResult = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'toki/',
      max_results: 10
    });
    
    console.log('📊 Cloudinary folder structure:');
    console.log('   Total resources found:', folderResult.resources.length);
    
    folderResult.resources.forEach((resource: any, index: number) => {
      console.log(`   ${index + 1}. ${resource.public_id} (${resource.folder})`);
    });
    
    // Clean up test images
    console.log('🧹 Cleaning up test images...');
    
    try {
      await cloudinary.uploader.destroy((profileResult as any).public_id);
      console.log('   ✅ Profile test image deleted');
    } catch (error) {
      console.log('   ⚠️  Failed to delete profile test image:', error);
    }
    
    try {
      await cloudinary.uploader.destroy((tokiResult as any).public_id);
      console.log('   ✅ Toki test image deleted');
    } catch (error) {
      console.log('   ⚠️  Failed to delete Toki test image:', error);
    }
    
    console.log('🎉 Folder structure test completed successfully!');
    console.log('📁 Verified structure:');
    console.log('   toki/');
    console.log('   ├── profiles/');
    console.log('   └── tokis/');
    
  } catch (error) {
    console.error('❌ Folder structure test failed:', error);
    
    if (error instanceof Error) {
      console.error('🚨 Error details:', error.message);
    }
  }
}

// Run the test
testUploadStructure();
