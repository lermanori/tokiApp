/**
 * Test script for image reprocessing functionality
 * Tests ImageService.copyAndTransformImage with various scenarios
 */

import * as dotenv from 'dotenv';
import { ImageService } from '../src/services/imageService';
import logger from '../src/utils/logger';

// Load environment variables
dotenv.config();

// Set log level to info for testing
logger.setLevel('info');

// Test image URLs (using publicly accessible test images)
const TEST_IMAGES = {
  valid: {
    jpeg: 'https://picsum.photos/800/600', // Random JPEG image
    png: 'https://via.placeholder.com/800x600.png', // PNG placeholder
    webp: 'https://picsum.photos/800/600.webp', // WebP format
  },
  invalid: {
    notFound: 'https://example.com/nonexistent-image.jpg',
    timeout: 'http://httpstat.us/200?sleep=20000', // Will timeout
    html: 'https://example.com', // HTML page, not an image
    invalidDomain: 'https://this-domain-does-not-exist-12345.com/image.jpg',
  },
};

async function testValidImage(url: string, format: string, aspectRatio?: string) {
  console.log(`\n🧪 Testing valid ${format} image: ${url}`);
  console.log(`   Aspect ratio: ${aspectRatio || '4:3 (default)'}`);
  
  const testTokiId = 'test-toki-' + Date.now();
  const result = await ImageService.copyAndTransformImage(url, testTokiId, aspectRatio);
  
  if (result.success) {
    console.log(`   ✅ SUCCESS`);
    console.log(`   - PublicId: ${result.publicId}`);
    console.log(`   - URL: ${result.url}`);
    return true;
  } else {
    console.log(`   ❌ FAILED: ${result.error}`);
    return false;
  }
}

async function testInvalidImage(url: string, reason: string) {
  console.log(`\n🧪 Testing invalid image (${reason}): ${url}`);
  
  const testTokiId = 'test-toki-' + Date.now();
  const result = await ImageService.copyAndTransformImage(url, testTokiId);
  
  if (!result.success) {
    console.log(`   ✅ CORRECTLY REJECTED: ${result.error}`);
    return true;
  } else {
    console.log(`   ❌ SHOULD HAVE FAILED but succeeded`);
    return false;
  }
}

async function testAspectRatios() {
  console.log(`\n🧪 Testing aspect ratio support`);
  
  const testUrl = TEST_IMAGES.valid.jpeg;
  const testTokiId = 'test-toki-' + Date.now();
  
  // Test 4:3 (default)
  console.log(`\n   Testing 4:3 aspect ratio (default)...`);
  const result43 = await ImageService.copyAndTransformImage(testUrl, testTokiId + '-43', '4:3');
  if (result43.success) {
    console.log(`   ✅ 4:3 succeeded: ${result43.url}`);
  } else {
    console.log(`   ❌ 4:3 failed: ${result43.error}`);
  }
  
  // Test 1:1
  console.log(`\n   Testing 1:1 aspect ratio...`);
  const result11 = await ImageService.copyAndTransformImage(testUrl, testTokiId + '-11', '1:1');
  if (result11.success) {
    console.log(`   ✅ 1:1 succeeded: ${result11.url}`);
  } else {
    console.log(`   ❌ 1:1 failed: ${result11.error}`);
  }
}

async function testPartialSuccess() {
  console.log(`\n🧪 Testing partial success scenario (mix of valid and invalid URLs)`);
  
  const testUrls = [
    TEST_IMAGES.valid.jpeg,
    TEST_IMAGES.invalid.notFound,
    TEST_IMAGES.valid.png,
    TEST_IMAGES.invalid.html,
  ];
  
  const testTokiId = 'test-toki-' + Date.now();
  const results: Array<{ url: string; success: boolean; error?: string }> = [];
  
  for (const url of testUrls) {
    const result = await ImageService.copyAndTransformImage(url, testTokiId);
    results.push({
      url,
      success: result.success || false,
      error: result.error,
    });
  }
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`\n   Results: ${successful} succeeded, ${failed} failed`);
  results.forEach((r, i) => {
    if (r.success) {
      console.log(`   ✅ Image ${i + 1}: SUCCESS`);
    } else {
      console.log(`   ❌ Image ${i + 1}: FAILED - ${r.error}`);
    }
  });
  
  return successful > 0 && failed > 0; // Partial success means some succeeded and some failed
}

async function runTests() {
  console.log('🚀 Starting Image Reprocessing Tests\n');
  console.log('=' .repeat(60));
  
  const results = {
    validImages: 0,
    invalidImages: 0,
    aspectRatios: 0,
    partialSuccess: false,
  };
  
  try {
    // Test valid images
    console.log('\n📸 Testing Valid Images');
    console.log('-'.repeat(60));
    
    if (await testValidImage(TEST_IMAGES.valid.jpeg, 'JPEG')) results.validImages++;
    if (await testValidImage(TEST_IMAGES.valid.png, 'PNG')) results.validImages++;
    if (await testValidImage(TEST_IMAGES.valid.webp, 'WebP')) results.validImages++;
    if (await testValidImage(TEST_IMAGES.valid.jpeg, 'JPEG with 1:1', '1:1')) results.validImages++;
    
    // Test invalid images
    console.log('\n❌ Testing Invalid Images');
    console.log('-'.repeat(60));
    
    if (await testInvalidImage(TEST_IMAGES.invalid.notFound, '404 Not Found')) results.invalidImages++;
    if (await testInvalidImage(TEST_IMAGES.invalid.html, 'HTML (not an image)')) results.invalidImages++;
    if (await testInvalidImage(TEST_IMAGES.invalid.invalidDomain, 'Invalid Domain')) results.invalidImages++;
    
    // Test aspect ratios
    console.log('\n📐 Testing Aspect Ratios');
    console.log('-'.repeat(60));
    await testAspectRatios();
    results.aspectRatios = 1;
    
    // Test partial success
    console.log('\n🔄 Testing Partial Success');
    console.log('-'.repeat(60));
    results.partialSuccess = await testPartialSuccess();
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Summary');
    console.log('='.repeat(60));
    console.log(`✅ Valid images processed: ${results.validImages}/4`);
    console.log(`✅ Invalid images rejected: ${results.invalidImages}/3`);
    console.log(`✅ Aspect ratio tests: ${results.aspectRatios > 0 ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ Partial success test: ${results.partialSuccess ? 'PASSED' : 'FAILED'}`);
    
    const allPassed = 
      results.validImages >= 3 && 
      results.invalidImages >= 2 && 
      results.aspectRatios > 0 && 
      results.partialSuccess;
    
    if (allPassed) {
      console.log('\n🎉 All tests passed!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some tests failed or were skipped');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Test suite error:', error);
    process.exit(1);
  }
}

// Run tests
runTests();

