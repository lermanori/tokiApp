import { pool } from '../src/config/database';

const testUsers = [
  { id: 'e06e2578-96c1-4882-b723-c7b3561a2f8e', name: 'ori lerman' },
  { id: 'b2069d88-6bf9-4c8c-a1a1-5d23368d7f1c', name: 'alice' },
  { id: '4f32ebc5-ff82-416c-9bac-896539ecd905', name: 'test' },
  { id: '17b60e04-7237-46ab-a2f4-d404de21209d', name: 'john' }
];

const tokiTemplates = [
  {
    title: 'Morning Coffee Meetup',
    description: 'Start your day with great coffee and conversation',
    location: 'Tel Aviv, Rothschild Blvd',
    maxAttendees: 8,
    timeSlot: 'morning',
    category: 'social',
    latitude: 32.0853,
    longitude: 34.7818
  },
  {
    title: 'Tech Startup Networking',
    description: 'Connect with fellow entrepreneurs and developers',
    location: 'Tel Aviv, Sarona Market',
    maxAttendees: 15,
    timeSlot: 'afternoon',
    category: 'business',
    latitude: 32.0723,
    longitude: 34.7925
  },
  {
    title: 'Sunset Beach Yoga',
    description: 'Relaxing yoga session by the Mediterranean',
    location: 'Tel Aviv, Gordon Beach',
    maxAttendees: 12,
    timeSlot: 'evening',
    category: 'wellness',
    latitude: 32.0800,
    longitude: 34.7600
  },
  {
    title: 'Art Gallery Tour',
    description: 'Explore contemporary Israeli art',
    location: 'Tel Aviv, Neve Tzedek',
    maxAttendees: 10,
    timeSlot: 'afternoon',
    category: 'culture',
    latitude: 32.0667,
    longitude: 34.7667
  },
  {
    title: 'Food Market Adventure',
    description: 'Taste local delicacies at Carmel Market',
    location: 'Tel Aviv, Carmel Market',
    maxAttendees: 6,
    timeSlot: 'morning',
    category: 'food',
    latitude: 32.0667,
    longitude: 34.7667
  },
  {
    title: 'Board Game Night',
    description: 'Strategic games and friendly competition',
    location: 'Tel Aviv, Florentin',
    maxAttendees: 8,
    timeSlot: 'evening',
    category: 'entertainment',
    latitude: 32.0500,
    longitude: 34.7833
  },
  {
    title: 'Photography Walk',
    description: 'Capture the beauty of Tel Aviv streets',
    location: 'Tel Aviv, Jaffa Port',
    maxAttendees: 10,
    timeSlot: 'morning',
    category: 'creative',
    latitude: 32.0500,
    longitude: 34.7500
  },
  {
    title: 'Language Exchange',
    description: 'Practice Hebrew, English, and other languages',
    location: 'Tel Aviv, Dizengoff Center',
    maxAttendees: 12,
    timeSlot: 'afternoon',
    category: 'education',
    latitude: 32.0800,
    longitude: 34.7750
  },
  {
    title: 'Sunrise Running Club',
    description: 'Early morning runs along the beach',
    location: 'Tel Aviv, Tayelet',
    maxAttendees: 20,
    timeSlot: 'morning',
    category: 'fitness',
    latitude: 32.0800,
    longitude: 34.7600
  },
  {
    title: 'Craft Beer Tasting',
    description: 'Sample local and international brews',
    location: 'Tel Aviv, Port Area',
    maxAttendees: 15,
    timeSlot: 'evening',
    category: 'food',
    latitude: 32.0833,
    longitude: 34.7667
  },
  {
    title: 'Street Art Tour',
    description: 'Discover hidden murals and graffiti',
    location: 'Tel Aviv, Florentin',
    maxAttendees: 8,
    timeSlot: 'afternoon',
    category: 'culture',
    latitude: 32.0500,
    longitude: 34.7833
  },
  {
    title: 'Meditation Workshop',
    description: 'Find inner peace and mindfulness',
    location: 'Tel Aviv, Park Hayarkon',
    maxAttendees: 12,
    timeSlot: 'morning',
    category: 'wellness',
    latitude: 32.1000,
    longitude: 34.8000
  },
  {
    title: 'Startup Pitch Night',
    description: 'Present your ideas to investors',
    location: 'Tel Aviv, WeWork',
    maxAttendees: 25,
    timeSlot: 'evening',
    category: 'business',
    latitude: 32.0800,
    longitude: 34.7800
  },
  {
    title: 'Cooking Class',
    description: 'Learn to make authentic Israeli dishes',
    location: 'Tel Aviv, Shuk HaNamal',
    maxAttendees: 10,
    timeSlot: 'afternoon',
    category: 'food',
    latitude: 32.0833,
    longitude: 34.7667
  },
  {
    title: 'Live Music Jam',
    description: 'Bring your instrument and join the session',
    location: 'Tel Aviv, Levinsky Market',
    maxAttendees: 15,
    timeSlot: 'evening',
    category: 'entertainment',
    latitude: 32.0500,
    longitude: 34.7667
  },
  {
    title: 'Urban Gardening',
    description: 'Learn sustainable urban farming techniques',
    location: 'Tel Aviv, Community Garden',
    maxAttendees: 8,
    timeSlot: 'morning',
    category: 'education',
    latitude: 32.0900,
    longitude: 34.7800
  },
  {
    title: 'Dance Workshop',
    description: 'Learn traditional and modern Israeli dances',
    location: 'Tel Aviv, Suzanne Dellal Center',
    maxAttendees: 18,
    timeSlot: 'afternoon',
    category: 'entertainment',
    latitude: 32.0667,
    longitude: 34.7667
  },
  {
    title: 'Book Club Meeting',
    description: 'Discuss contemporary Israeli literature',
    location: 'Tel Aviv, Central Library',
    maxAttendees: 12,
    timeSlot: 'evening',
    category: 'education',
    latitude: 32.0800,
    longitude: 34.7800
  },
  {
    title: 'Cycling Tour',
    description: 'Explore Tel Aviv by bike',
    location: 'Tel Aviv, Yarkon Park',
    maxAttendees: 15,
    timeSlot: 'morning',
    category: 'fitness',
    latitude: 32.1000,
    longitude: 34.8000
  },
  {
    title: 'Wine Tasting',
    description: 'Sample Israeli wines from different regions',
    location: 'Tel Aviv, Wine Bar',
    maxAttendees: 10,
    timeSlot: 'evening',
    category: 'food',
    latitude: 32.0800,
    longitude: 34.7750
  }
];

const participantCombinations = [
  ['b2069d88-6bf9-4c8c-a1a1-5d23368d7f1c', '4f32ebc5-ff82-416c-9bac-896539ecd905'], // alice + test
  ['e06e2578-96c1-4882-b723-c7b3561a2f8e', '17b60e04-7237-46ab-a2f4-d404de21209d'], // ori + john
  ['b2069d88-6bf9-4c8c-a1a1-5d23368d7f1c', 'e06e2578-96c1-4882-b723-c7b3561a2f8e'], // alice + ori
  ['4f32ebc5-ff82-416c-9bac-896539ecd905', '17b60e04-7237-46ab-a2f4-d404de21209d'], // test + john
  ['e06e2578-96c1-4882-b723-c7b3561a2f8e', '4f32ebc5-ff82-416c-9bac-896539ecd905'], // ori + test
  ['b2069d88-6bf9-4c8c-a1a1-5d23368d7f1c', '17b60e04-7237-46ab-a2f4-d404de21209d'], // alice + john
  ['e06e2578-96c1-4882-b723-c7b3561a2f8e', 'b2069d88-6bf9-4c8c-a1a1-5d23368d7f1c'], // ori + alice
  ['4f32ebc5-ff82-416c-9bac-896539ecd905', 'e06e2578-96c1-4882-b723-c7b3561a2f8e'], // test + ori
  ['17b60e04-7237-46ab-a2f4-d404de21209d', 'b2069d88-6bf9-4c8c-a1a1-5d23368d7f1c'], // john + alice
  ['b2069d88-6bf9-4c8c-a1a1-5d23368d7f1c', '4f32ebc5-ff82-416c-9bac-896539ecd905'], // alice + test
  ['e06e2578-96c1-4882-b723-c7b3561a2f8e', '17b60e04-7237-46ab-a2f4-d404de21209d'], // ori + john
  ['4f32ebc5-ff82-416c-9bac-896539ecd905', 'b2069d88-6bf9-4c8c-a1a1-5d23368d7f1c'], // test + alice
  ['17b60e04-7237-46ab-a2f4-d404de21209d', 'e06e2578-96c1-4882-b723-c7b3561a2f8e'], // john + ori
  ['b2069d88-6bf9-4c8c-a1a1-5d23368d7f1c', 'e06e2578-96c1-4882-b723-c7b3561a2f8e'], // alice + ori
  ['4f32ebc5-ff82-416c-9bac-896539ecd905', '17b60e04-7237-46ab-a2f4-d404de21209d'], // test + john
  ['e06e2578-96c1-4882-b723-c7b3561a2f8e', '4f32ebc5-ff82-416c-9bac-896539ecd905'], // ori + test
  ['b2069d88-6bf9-4c8c-a1a1-5d23368d7f1c', '17b60e04-7237-46ab-a2f4-d404de21209d'], // alice + john
  ['17b60e04-7237-46ab-a2f4-d404de21209d', '4f32ebc5-ff82-416c-9bac-896539ecd905'], // john + test
  ['e06e2578-96c1-4882-b723-c7b3561a2f8e', 'b2069d88-6bf9-4c8c-a1a1-5d23368d7f1c'], // ori + alice
  ['4f32ebc5-ff82-416c-9bac-896539ecd905', 'e06e2578-96c1-4882-b723-c7b3561a2f8e']  // test + ori
];

async function create20TokisForRatingTest() {
  try {
    console.log('🚀 Creating 20 new Tokis for rating test...');
    
    const createdTokis = [];
    
    for (let i = 0; i < tokiTemplates.length; i++) {
      const template = tokiTemplates[i];
      const participants = participantCombinations[i];
      const hostIndex = i % 4; // Rotate through all 4 users as hosts
      const hostId = testUsers[hostIndex].id;
      
      console.log(`📝 Creating Toki ${i + 1}: ${template.title} (Host: ${testUsers[hostIndex].name})`);
      
      // Create the Toki
      const tokiResult = await pool.query(
        `INSERT INTO tokis (title, description, location, scheduled_time, max_attendees, host_id, status, time_slot, category, latitude, longitude, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING id, title`,
        [
          template.title,
          template.description,
          template.location,
          new Date(Date.now() + (i * 24 * 60 * 60 * 1000)), // Each Toki 1 day apart
          template.maxAttendees,
          hostId,
          'active',
          template.timeSlot,
          template.category,
          template.latitude,
          template.longitude,
          new Date(),
          new Date()
        ]
      );
      
      const tokiId = tokiResult.rows[0].id;
      const tokiTitle = tokiResult.rows[0].title;
      
      // Add participants (excluding the host)
      for (const participantId of participants) {
        if (participantId !== hostId) {
          await pool.query(
            `INSERT INTO toki_participants (toki_id, user_id, status, joined_at, updated_at)
             VALUES ($1, $2, $3, $4, $5)`,
            [tokiId, participantId, 'approved', new Date(), new Date()]
          );
        }
      }
      
      // Get participant count
      const participantCountResult = await pool.query(
        'SELECT COUNT(*) as count FROM toki_participants WHERE toki_id = $1 AND status = $2',
        [tokiId, 'approved']
      );
      const participantCount = parseInt(participantCountResult.rows[0].count);
      
      createdTokis.push({
        id: tokiId,
        title: tokiTitle,
        host: testUsers[hostIndex].name,
        participants: participantCount,
        location: template.location,
        category: template.category,
        coordinates: `${template.latitude}, ${template.longitude}`
      });
      
      console.log(`✅ Created Toki: ${tokiTitle} with ${participantCount} participants`);
    }
    
    console.log('\n🎉 Successfully created 20 Tokis for rating test!');
    console.log('\n📊 Summary of created Tokis:');
    createdTokis.forEach((toki, index) => {
      console.log(`${index + 1}. ${toki.title}`);
      console.log(`   Host: ${toki.host}`);
      console.log(`   Participants: ${toki.participants}`);
      console.log(`   Location: ${toki.location}`);
      console.log(`   Category: ${toki.category}`);
      console.log(`   Coordinates: ${toki.coordinates}`);
      console.log('');
    });
    
    console.log('🔍 Now you can test the rating system with different ratings!');
    console.log('💡 Try rating users with 1, 2, 3, 4, and 5 stars to see the variety.');
    
  } catch (error) {
    console.error('❌ Error creating Tokis:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
create20TokisForRatingTest();
