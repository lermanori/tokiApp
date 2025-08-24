import { pool } from '../src/config/database';

const testUsers = [
  {
    id: 'b2069d88-6bf9-4c8c-a1a1-5d23368d7f1c', // Alice Johnson
    name: 'Alice Johnson'
  },
  {
    id: 'e06e2578-96c1-4882-b723-c7b3561a2f8e', // ori lerman
    name: 'ori lerman'
  },
  {
    id: '4f32ebc5-ff82-416c-9bac-896539ecd905', // John Smith
    name: 'John Smith'
  }
];

// Tel Aviv area coordinates
const telAvivLocations = [
  {
    title: 'Rothschild Boulevard Coffee',
    description: 'Morning coffee and networking on the famous boulevard',
    location: 'Rothschild Boulevard, Tel Aviv',
    latitude: 32.0648,
    longitude: 34.7747,
    time_slot: 'morning',
    category: 'social',
    max_attendees: 8
  },
  {
    title: 'Gordon Beach Yoga',
    description: 'Sunrise yoga session by the Mediterranean',
    location: 'Gordon Beach, Tel Aviv',
    latitude: 32.0800,
    longitude: 34.7640,
    time_slot: 'morning',
    category: 'wellness',
    max_attendees: 15
  },
  {
    title: 'Sarona Market Food Tour',
    description: 'Explore the best food spots in Sarona Market',
    location: 'Sarona Market, Tel Aviv',
    latitude: 32.0720,
    longitude: 34.7890,
    time_slot: 'afternoon',
    category: 'food',
    max_attendees: 12
  },
  {
    title: 'Yarkon Park Running Club',
    description: 'Group running session in beautiful Yarkon Park',
    location: 'Yarkon Park, Tel Aviv',
    latitude: 32.1000,
    longitude: 34.8000,
    time_slot: 'morning',
    category: 'sports',
    max_attendees: 20
  },
  {
    title: 'Old Jaffa Photography Walk',
    description: 'Capture the historic beauty of Old Jaffa',
    location: 'Old Jaffa, Tel Aviv',
    latitude: 32.0500,
    longitude: 34.7500,
    time_slot: 'afternoon',
    category: 'creative',
    max_attendees: 10
  },
  {
    title: 'Carmel Market Cooking Class',
    description: 'Learn to cook with fresh ingredients from Carmel Market',
    location: 'Carmel Market, Tel Aviv',
    latitude: 32.0600,
    longitude: 34.7600,
    time_slot: 'afternoon',
    category: 'educational',
    max_attendees: 8
  },
  {
    title: 'Bograshov Beach Volleyball',
    description: 'Competitive beach volleyball tournament',
    location: 'Bograshov Beach, Tel Aviv',
    latitude: 32.0750,
    longitude: 34.7650,
    time_slot: 'afternoon',
    category: 'sports',
    max_attendees: 16
  },
  {
    title: 'Dizengoff Center Shopping Meetup',
    description: 'Shopping and socializing at Dizengoff Center',
    location: 'Dizengoff Center, Tel Aviv',
    latitude: 32.0800,
    longitude: 34.7750,
    time_slot: 'afternoon',
    category: 'social',
    max_attendees: 6
  },
  {
    title: 'Florentin Street Art Tour',
    description: 'Discover street art in the trendy Florentin neighborhood',
    location: 'Florentin, Tel Aviv',
    latitude: 32.0550,
    longitude: 34.7700,
    time_slot: 'afternoon',
    category: 'creative',
    max_attendees: 12
  },
  {
    title: 'Neve Tzedek Sunset Walk',
    description: 'Evening stroll through the charming Neve Tzedek area',
    location: 'Neve Tzedek, Tel Aviv',
    latitude: 32.0650,
    longitude: 34.7650,
    time_slot: 'evening',
    category: 'social',
    max_attendees: 8
  },
  {
    title: 'Tel Aviv Port Boardwalk',
    description: 'Evening walk along the scenic port boardwalk',
    location: 'Tel Aviv Port',
    latitude: 32.0950,
    longitude: 34.7700,
    time_slot: 'evening',
    category: 'social',
    max_attendees: 10
  },
  {
    title: 'Ramat Aviv Mall Meetup',
    description: 'Coffee and conversation at Ramat Aviv Mall',
    location: 'Ramat Aviv Mall, Tel Aviv',
    latitude: 32.1100,
    longitude: 34.8000,
    time_slot: 'afternoon',
    category: 'social',
    max_attendees: 6
  },
  {
    title: 'Tel Aviv University Campus Tour',
    description: 'Explore the beautiful TAU campus',
    location: 'Tel Aviv University, Tel Aviv',
    latitude: 32.1150,
    longitude: 34.8050,
    time_slot: 'afternoon',
    category: 'educational',
    max_attendees: 15
  },
  {
    title: 'Hilton Beach Kite Surfing',
    description: 'Kite surfing lessons at Hilton Beach',
    location: 'Hilton Beach, Tel Aviv',
    latitude: 32.0850,
    longitude: 34.7600,
    time_slot: 'afternoon',
    category: 'sports',
    max_attendees: 8
  },
  {
    title: 'Levinsky Market Spice Tour',
    description: 'Explore exotic spices and flavors at Levinsky Market',
    location: 'Levinsky Market, Tel Aviv',
    latitude: 32.0550,
    longitude: 34.7650,
    time_slot: 'morning',
    category: 'food',
    max_attendees: 10
  },
  {
    title: 'Tel Aviv Museum of Art Visit',
    description: 'Cultural afternoon at the Tel Aviv Museum of Art',
    location: 'Tel Aviv Museum of Art',
    latitude: 32.0750,
    longitude: 34.7850,
    time_slot: 'afternoon',
    category: 'cultural',
    max_attendees: 12
  },
  {
    title: 'Hayarkon River Kayaking',
    description: 'Kayaking adventure on the Yarkon River',
    location: 'Yarkon River, Tel Aviv',
    latitude: 32.1050,
    longitude: 34.7950,
    time_slot: 'morning',
    category: 'adventure',
    max_attendees: 8
  },
  {
    title: 'Tel Aviv Central Bus Station Meetup',
    description: 'Quick coffee meetup at the central station',
    location: 'Tel Aviv Central Bus Station',
    latitude: 32.0450,
    longitude: 34.7800,
    time_slot: 'morning',
    category: 'social',
    max_attendees: 4
  },
  {
    title: 'Azrieli Center Rooftop Party',
    description: 'Evening party with amazing city views',
    location: 'Azrieli Center, Tel Aviv',
    latitude: 32.0750,
    longitude: 34.7900,
    time_slot: 'evening',
    category: 'social',
    max_attendees: 25
  },
  {
    title: 'Tel Aviv Zoo Family Day',
    description: 'Family-friendly day at the Tel Aviv Zoo',
    location: 'Tel Aviv Zoo',
    latitude: 32.1200,
    longitude: 34.8100,
    time_slot: 'morning',
    category: 'family',
    max_attendees: 20
  }
];

const participantCombinations = [
  // Mix of different participant counts
  [testUsers[1].id, testUsers[2].id], // 2 participants
  [testUsers[0].id], // 1 participant
  [testUsers[0].id, testUsers[1].id], // 2 participants
  [testUsers[2].id], // 1 participant
  [testUsers[0].id, testUsers[1].id, testUsers[2].id], // 3 participants
  [], // No participants
  [testUsers[1].id], // 1 participant
  [testUsers[0].id, testUsers[2].id], // 2 participants
  [testUsers[1].id, testUsers[2].id], // 2 participants
  [testUsers[0].id], // 1 participant
  [testUsers[0].id, testUsers[1].id], // 2 participants
  [testUsers[2].id], // 1 participant
  [testUsers[0].id, testUsers[1].id], // 2 participants
  [testUsers[1].id], // 1 participant
  [testUsers[0].id, testUsers[2].id], // 2 participants
  [testUsers[1].id, testUsers[2].id], // 2 participants
  [testUsers[0].id], // 1 participant
  [testUsers[0].id, testUsers[1].id], // 2 participants
  [testUsers[2].id], // 1 participant
  [testUsers[0].id, testUsers[1].id, testUsers[2].id] // 3 participants
];

async function create20MoreTokis() {
  try {
    console.log('🚀 Starting to create 20 more test Tokis with coordinates...');
    
    for (let i = 0; i < telAvivLocations.length; i++) {
      const location = telAvivLocations[i];
      const participants = participantCombinations[i];
      
      // Rotate hosts between the three users
      const hostIndex = i % 3;
      const hostId = testUsers[hostIndex].id;
      
      console.log(`\n📝 Creating Toki ${i + 1}: ${location.title}`);
      console.log(`👑 Host: ${hostId}`);
      console.log(`📍 Location: ${location.latitude}, ${location.longitude}`);
      console.log(`👥 Participants: ${participants.length > 0 ? participants.join(', ') : 'None'}`);
      
      // Create the Toki
      const tokiResult = await pool.query(
        `INSERT INTO tokis (title, description, location, scheduled_time, max_attendees, host_id, status, time_slot, category, latitude, longitude, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING id`,
        [
          location.title,
          location.description,
          location.location,
          new Date(Date.now() + (i * 24 * 60 * 60 * 1000)), // Spread out over days
          location.max_attendees,
          hostId,
          'active',
          location.time_slot,
          location.category,
          location.latitude,
          location.longitude,
          new Date(),
          new Date()
        ]
      );
      
      const tokiId = tokiResult.rows[0].id;
      console.log(`✅ Toki created with ID: ${tokiId}`);
      
      // Add participants
      for (const participantId of participants) {
        await pool.query(
          `INSERT INTO toki_participants (toki_id, user_id, status, joined_at, updated_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            tokiId,
            participantId,
            'approved',
            new Date(),
            new Date()
          ]
        );
        console.log(`✅ Added participant: ${participantId}`);
      }
      
      console.log(`🎉 Toki ${i + 1} completed!`);
    }
    
    console.log('\n🎊 All 20 additional test Tokis created successfully!');
    
    // Show summary
    const summaryResult = await pool.query(`
      SELECT 
        t.title,
        t.host_id,
        t.latitude,
        t.longitude,
        COUNT(tp.user_id) as participant_count
      FROM tokis t
      LEFT JOIN toki_participants tp ON t.id = tp.toki_id AND tp.status = 'approved'
      WHERE t.latitude IS NOT NULL AND t.longitude IS NOT NULL
      GROUP BY t.id, t.title, t.host_id, t.latitude, t.longitude
      ORDER BY t.created_at DESC
      LIMIT 20
    `);
    
    console.log('\n📊 Summary of created Tokis with coordinates:');
    summaryResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.title} (Host: ${row.host_id}, Participants: ${row.participant_count}, Coords: ${row.latitude}, ${row.longitude})`);
    });
    
  } catch (error) {
    console.error('❌ Error creating additional test Tokis:', error);
  } finally {
    await pool.end();
  }
}

create20MoreTokis();
