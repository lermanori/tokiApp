import { pool } from '../config/database';
import bcrypt from 'bcryptjs';

const testUsers = [
  {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    bio: 'A test user for development',
    location: 'San Francisco, CA'
  },
  {
    name: 'Jane Doe',
    email: 'jane@example.com',
    password: 'password123',
    bio: 'Another test user',
    location: 'New York, NY'
  },
  {
    name: 'John Smith',
    email: 'john@example.com',
    password: 'password123',
    bio: 'Test user for connections',
    location: 'Los Angeles, CA'
  }
];

async function createTestUsers() {
  try {
    console.log('Creating test users...');
    
    for (const user of testUsers) {
      // Check if user already exists
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [user.email]
      );
      
      if (existingUser.rows.length > 0) {
        console.log(`User ${user.email} already exists, updating password...`);
        
        // Update password
        const hashedPassword = await bcrypt.hash(user.password, 12);
        await pool.query(
          'UPDATE users SET password_hash = $1 WHERE email = $2',
          [hashedPassword, user.email]
        );
      } else {
        console.log(`Creating user ${user.email}...`);
        
        // Create new user
        const hashedPassword = await bcrypt.hash(user.password, 12);
        await pool.query(
          'INSERT INTO users (name, email, password_hash, bio, location) VALUES ($1, $2, $3, $4, $5)',
          [user.name, user.email, hashedPassword, user.bio, user.location]
        );
      }
    }
    
    console.log('✅ Test users created/updated successfully!');
    console.log('\n📋 Test User Credentials:');
    console.log('========================');
    testUsers.forEach(user => {
      console.log(`Email: ${user.email}`);
      console.log(`Password: ${user.password}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('❌ Error creating test users:', error);
  } finally {
    await pool.end();
  }
}

createTestUsers(); 