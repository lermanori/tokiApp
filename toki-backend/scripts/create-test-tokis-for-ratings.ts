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

const tokiTemplates = [
  {
    title: 'Morning Coffee Meetup',
    description: 'Start your day with great coffee and conversation',
    location: 'Rothschild Boulevard, Tel Aviv',
    scheduled_time: new Date('2025-08-15T08:00:00Z'),
    max_attendees: 6,
    host_id: testUsers[0].id, // Alice hosts
    time_slot: 'morning',
    category: 'social'
  },
  {
    title: 'Beach Volleyball Tournament',
    description: 'Competitive beach volleyball for all skill levels',
    location: 'Gordon Beach, Tel Aviv',
    scheduled_time: new Date('2025-08-16T16:00:00Z'),
    max_attendees: 12,
    host_id: testUsers[1].id, // ori hosts
    time_slot: 'afternoon',
    category: 'sports'
  },
  {
    title: 'Tech Networking Event',
    description: 'Connect with fellow developers and entrepreneurs',
    location: 'Sarona Market, Tel Aviv',
    scheduled_time: new Date('2025-08-17T19:00:00Z'),
    max_attendees: 20,
    host_id: testUsers[2].id, // John hosts
    time_slot: 'evening',
    category: 'professional'
  },
  {
    title: 'Yoga in the Park',
    description: 'Peaceful morning yoga session',
    location: 'Yarkon Park, Tel Aviv',
    scheduled_time: new Date('2025-08-18T07:00:00Z'),
    max_attendees: 15,
    host_id: testUsers[0].id, // Alice hosts
    time_slot: 'morning',
    category: 'wellness'
  },
  {
    title: 'Board Game Night',
    description: 'Strategic board games and friendly competition',
    location: 'Dizengoff Center, Tel Aviv',
    scheduled_time: new Date('2025-08-19T20:00:00Z'),
    max_attendees: 8,
    host_id: testUsers[1].id, // ori hosts
    time_slot: 'evening',
    category: 'entertainment'
  },
  {
    title: 'Photography Walk',
    description: 'Explore the city through photography',
    location: 'Old Jaffa, Tel Aviv',
    scheduled_time: new Date('2025-08-20T17:00:00Z'),
    max_attendees: 10,
    host_id: testUsers[2].id, // John hosts
    time_slot: 'afternoon',
    category: 'creative'
  },
  {
    title: 'Cooking Workshop',
    description: 'Learn to cook traditional Israeli dishes',
    location: 'Carmel Market, Tel Aviv',
    scheduled_time: new Date('2025-08-21T14:00:00Z'),
    max_attendees: 12,
    host_id: testUsers[0].id, // Alice hosts
    time_slot: 'afternoon',
    category: 'educational'
  },
  {
    title: 'Sunset Beach Party',
    description: 'Celebrate the end of summer with music and friends',
    location: 'Bograshov Beach, Tel Aviv',
    scheduled_time: new Date('2025-08-22T18:00:00Z'),
    max_attendees: 25,
    host_id: testUsers[1].id, // ori hosts
    time_slot: 'evening',
    category: 'social'
  }
];

const participantCombinations = [
  // Toki 1: Alice hosts, ori and John join
  [testUsers[1].id, testUsers[2].id],
  
  // Toki 2: ori hosts, Alice joins
  [testUsers[0].id],
  
  // Toki 3: John hosts, Alice and ori join
  [testUsers[0].id, testUsers[1].id],
  
  // Toki 4: Alice hosts, ori joins
  [testUsers[1].id],
  
  // Toki 5: ori hosts, Alice and John join
  [testUsers[0].id, testUsers[2].id],
  
  // Toki 6: John hosts, Alice joins
  [testUsers[0].id],
  
  // Toki 7: Alice hosts, John joins
  [testUsers[2].id],
  
  // Toki 8: ori hosts, no participants (solo event)
  []
];

async function createTestTokis() {
  try {
    console.log('🚀 Starting to create test Tokis...');
    
    for (let i = 0; i < tokiTemplates.length; i++) {
      const template = tokiTemplates[i];
      const participants = participantCombinations[i];
      
      console.log(`\n📝 Creating Toki ${i + 1}: ${template.title}`);
      console.log(`👑 Host: ${template.host_id}`);
      console.log(`👥 Participants: ${participants.length > 0 ? participants.join(', ') : 'None'}`);
      
      // Create the Toki
      const tokiResult = await pool.query(
        `INSERT INTO tokis (title, description, location, scheduled_time, max_attendees, host_id, status, time_slot, category, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id`,
        [
          template.title,
          template.description,
          template.location,
          template.scheduled_time,
          template.max_attendees,
          template.host_id,
          'active',
          template.time_slot,
          template.category,
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
    
    console.log('\n🎊 All test Tokis created successfully!');
    
    // Show summary
    const summaryResult = await pool.query(`
      SELECT 
        t.title,
        t.host_id,
        COUNT(tp.user_id) as participant_count
      FROM tokis t
      LEFT JOIN toki_participants tp ON t.id = tp.toki_id AND tp.status = 'approved'
      WHERE t.title LIKE '%Morning Coffee%' OR t.title LIKE '%Beach Volleyball%' OR t.title LIKE '%Tech Networking%' OR t.title LIKE '%Yoga in the Park%' OR t.title LIKE '%Board Game Night%' OR t.title LIKE '%Photography Walk%' OR t.title LIKE '%Cooking Workshop%' OR t.title LIKE '%Sunset Beach Party%'
      GROUP BY t.id, t.title, t.host_id
      ORDER BY t.created_at DESC
    `);
    
    console.log('\n📊 Summary of created Tokis:');
    summaryResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.title} (Host: ${row.host_id}, Participants: ${row.participant_count})`);
    });
    
  } catch (error) {
    console.error('❌ Error creating test Tokis:', error);
  } finally {
    await pool.end();
  }
}

createTestTokis();
