import { supabase } from './supabase';

export async function testSupabaseConnection() {
  try {
    console.log('🔌 Testing Supabase connection...');
    
    // Test basic connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Supabase connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Supabase connection successful!');
    console.log('📊 Database is accessible');
    
    return true;
  } catch (error) {
    console.error('❌ Supabase connection error:', error);
    return false;
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testSupabaseConnection()
    .then(success => {
      if (success) {
        console.log('🎉 All tests passed!');
        process.exit(0);
      } else {
        console.log('💥 Tests failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Test error:', error);
      process.exit(1);
    });
} 