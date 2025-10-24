import { generateTokiMetaTags, generateOpenGraphTags, TokiMetaData } from './metaTags';

// Test data for different scenarios
export const testTokiData: Record<string, TokiMetaData> = {
  complete: {
    id: 'test-toki-1',
    title: 'Coffee & Networking Meetup',
    description: 'Join us for an amazing coffee meetup where professionals from various industries come together to network, share ideas, and build meaningful connections.',
    location: 'Downtown Coffee House, 123 Main St, New York, NY',
    timeSlot: 'Tomorrow at 2:00 PM',
    category: 'coffee',
    hostName: 'Sarah Johnson',
    imageUrl: 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
    maxAttendees: 20,
    currentAttendees: 8,
  },
  minimal: {
    id: 'test-toki-2',
    title: 'Quick Lunch',
    description: '',
    location: '',
    timeSlot: '',
    category: 'food',
    hostName: 'John Doe',
    imageUrl: '',
    maxAttendees: 5,
    currentAttendees: 2,
  },
  longDescription: {
    id: 'test-toki-3',
    title: 'Amazing Music Festival with Multiple Artists and Food Trucks',
    description: 'This is going to be the most incredible music festival you have ever attended! We have lined up amazing artists from all over the world, delicious food trucks serving gourmet cuisine, interactive art installations, and so much more. The festival will span three days and feature multiple stages, VIP areas, and exclusive merchandise. Don\'t miss out on this once-in-a-lifetime experience!',
    location: 'Central Park, New York, NY',
    timeSlot: 'Next Weekend (Friday-Sunday)',
    category: 'music',
    hostName: 'Music Festival Organizers',
    imageUrl: 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
    maxAttendees: 1000,
    currentAttendees: 250,
  },
  noImage: {
    id: 'test-toki-4',
    title: 'Yoga in the Park',
    description: 'Morning yoga session in the beautiful city park',
    location: 'City Park, Los Angeles, CA',
    timeSlot: 'Every Sunday at 8:00 AM',
    category: 'wellness',
    hostName: 'Yoga Instructor Mike',
    imageUrl: '',
    maxAttendees: 15,
    currentAttendees: 12,
  },
};

export const testMetaTags = () => {
  console.log('🧪 Testing Meta Tags Generation\n');
  
  Object.entries(testTokiData).forEach(([scenario, tokiData]) => {
    console.log(`📋 Testing scenario: ${scenario.toUpperCase()}`);
    console.log('─'.repeat(50));
    
    try {
      const metaTags = generateTokiMetaTags(tokiData);
      const openGraphTags = generateOpenGraphTags(metaTags);
      
      console.log('✅ Generated Meta Tags:');
      console.log(`   Title: ${metaTags.title}`);
      console.log(`   Description: ${metaTags.description.substring(0, 100)}${metaTags.description.length > 100 ? '...' : ''}`);
      console.log(`   Image: ${metaTags.image}`);
      console.log(`   URL: ${metaTags.url}`);
      console.log(`   Type: ${metaTags.type}`);
      console.log(`   Site Name: ${metaTags.siteName}`);
      console.log(`   Locale: ${metaTags.locale}`);
      
      console.log('\n📄 Generated HTML Meta Tags:');
      console.log(openGraphTags);
      
      console.log('\n' + '='.repeat(80) + '\n');
    } catch (error) {
      console.error(`❌ Error testing scenario ${scenario}:`, error);
    }
  });
};

export const validateMetaTags = (metaTags: any) => {
  const errors: string[] = [];
  
  if (!metaTags.title || metaTags.title.length === 0) {
    errors.push('Title is missing or empty');
  }
  
  if (!metaTags.description || metaTags.description.length === 0) {
    errors.push('Description is missing or empty');
  }
  
  if (!metaTags.image || metaTags.image.length === 0) {
    errors.push('Image URL is missing or empty');
  }
  
  if (!metaTags.url || metaTags.url.length === 0) {
    errors.push('URL is missing or empty');
  }
  
  if (metaTags.title && metaTags.title.length > 60) {
    errors.push(`Title is too long (${metaTags.title.length} characters, recommended: 60)`);
  }
  
  if (metaTags.description && metaTags.description.length > 160) {
    errors.push(`Description is too long (${metaTags.description.length} characters, recommended: 160)`);
  }
  
  if (errors.length === 0) {
    console.log('✅ All meta tags validation passed!');
  } else {
    console.log('❌ Meta tags validation failed:');
    errors.forEach(error => console.log(`   - ${error}`));
  }
  
  return errors.length === 0;
};

// Run tests if this file is executed directly
if (typeof window !== 'undefined' && window.location?.pathname?.includes('test')) {
  testMetaTags();
}
