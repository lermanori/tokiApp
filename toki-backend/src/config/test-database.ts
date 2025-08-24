import { testDatabaseConnection } from './database';

export async function testLocalDatabase() {
  try {
    console.log('🔌 Testing local PostgreSQL connection...');
    
    const success = await testDatabaseConnection();
    
    if (success) {
      console.log('📊 Database is accessible and ready!');
      return true;
    } else {
      console.error('❌ Database connection failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Database test error:', error);
    return false;
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testLocalDatabase()
    .then(success => {
      if (success) {
        console.log('🎉 Database test passed!');
        process.exit(0);
      } else {
        console.log('💥 Database test failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Test error:', error);
      process.exit(1);
    });
} 