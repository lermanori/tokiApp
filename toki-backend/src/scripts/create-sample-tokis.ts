import { pool } from '../config/database';

const sampleTokis = [
  {
    title: 'Coffee & Code Meetup',
    description: 'Join us for a casual coffee and coding session. All skill levels welcome!',
    location: 'Blue Bottle Coffee, San Francisco',
    latitude: 37.7749,
    longitude: -122.4194,
    timeSlot: '2hours',
    category: 'coffee',
    maxAttendees: 8,
    visibility: 'public',
    tags: ['coding', 'coffee', 'networking', 'javascript']
  },
  {
    title: 'Morning Yoga in the Park',
    description: 'Start your day with energizing yoga in Golden Gate Park',
    location: 'Golden Gate Park, San Francisco',
    latitude: 37.7694,
    longitude: -122.4862,
    timeSlot: '1hour',
    category: 'wellness',
    maxAttendees: 15,
    visibility: 'public',
    tags: ['yoga', 'morning', 'wellness', 'outdoors']
  },
  {
    title: 'Board Game Night',
    description: 'Fun evening of board games and strategy. Bring your favorite games!',
    location: 'Game Parlor, San Francisco',
    latitude: 37.7849,
    longitude: -122.4094,
    timeSlot: '3hours',
    category: 'entertainment',
    maxAttendees: 12,
    visibility: 'public',
    tags: ['boardgames', 'strategy', 'fun', 'social']
  },
  {
    title: 'Photography Walk',
    description: 'Explore the city through photography. All camera types welcome!',
    location: 'Fisherman\'s Wharf, San Francisco',
    latitude: 37.8080,
    longitude: -122.4177,
    timeSlot: '2hours',
    category: 'art',
    maxAttendees: 10,
    visibility: 'public',
    tags: ['photography', 'art', 'exploration', 'city']
  },
  {
    title: 'Tech Networking Happy Hour',
    description: 'Network with fellow tech professionals over drinks',
    location: 'The View Lounge, San Francisco',
    latitude: 37.7849,
    longitude: -122.4094,
    timeSlot: '2hours',
    category: 'drinks',
    maxAttendees: 20,
    visibility: 'public',
    tags: ['networking', 'tech', 'drinks', 'professional']
  }
];

async function createSampleTokis() {
  try {
    console.log('Creating sample Tokis...');
    
    // Get a user to be the host
    const userResult = await pool.query('SELECT id FROM users LIMIT 1');
    if (userResult.rows.length === 0) {
      console.error('❌ No users found. Please create users first.');
      return;
    }
    
    const hostId = userResult.rows[0].id;
    
    for (const toki of sampleTokis) {
      console.log(`Creating Toki: ${toki.title}...`);
      
      // Insert Toki
      const tokiResult = await pool.query(
        `INSERT INTO tokis (
          host_id, title, description, location, latitude, longitude, 
          time_slot, category, max_attendees, visibility
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [
          hostId, toki.title, toki.description, toki.location,
          toki.latitude, toki.longitude, toki.timeSlot, toki.category,
          toki.maxAttendees, toki.visibility
        ]
      );
      
      const tokiId = tokiResult.rows[0].id;
      
      // Insert tags
      for (const tag of toki.tags) {
        await pool.query(
          'INSERT INTO toki_tags (toki_id, tag_name) VALUES ($1, $2)',
          [tokiId, tag]
        );
      }
      
      console.log(`✅ Created Toki: ${toki.title}`);
    }
    
    console.log('\n🎉 Sample Tokis created successfully!');
    console.log('You can now test the frontend with these activities.');
    
  } catch (error) {
    console.error('❌ Error creating sample Tokis:', error);
  } finally {
    await pool.end();
  }
}

createSampleTokis(); 