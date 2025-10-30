# Toki - Social Map App Features & Architecture

## Overview
Toki is a React Native/Expo social networking app focused on local activities and events. It allows users to discover, create, and join local activities (called "Tokis") in their area, with features for real-time messaging, user connections, and location-based discovery.

## Core Features

### 1. Activity Discovery & Exploration
- **Explore Feed**: Main feed showing nearby Tokis with search and filtering
- **Map Discovery**: Visual map interface showing Toki locations with interactive markers
- **Advanced Filtering**: Filter by category, distance, availability, and visibility
- **Search Functionality**: Search across titles, descriptions, locations, tags, and hosts
- **Tag-based Discovery**: Browse activities by tags (sports, coffee, work, music, etc.)
- **Real-time Updates**: Live updates of new Tokis and participant counts

### 2. Activity Creation & Management
- **Create Toki**: Comprehensive form for creating new activities
- **Activity Types**: Predefined categories (sports, coffee, music, food, work, art, nature, drinks)
- **Custom Tags**: Add custom tags to improve discoverability
- **Location Setting**: Specify activity location (area-based, not exact coordinates)
- **Time Scheduling**: Flexible time slots (Now, 30 min, 1 hour, 2 hours, 3 hours, Tonight, Tomorrow)
- **Capacity Management**: Set maximum attendees and track current participants
- **Photo Upload**: Optional photo attachment for activities
- **Visibility Controls**: Public, connections-only, or friends-only visibility

### 3. Social Features & Networking
- **User Profiles**: Comprehensive profiles with bio, location, social links, and stats
- **Connection System**: Build connections with other users
- **Social Media Integration**: Instagram, TikTok, LinkedIn, Facebook links
- **User Verification**: Verified user badges and ratings
- **Activity Statistics**: Track Tokis created, joined, and connections made
- **Invite Friends**: Share app and invite connections to activities

### 4. Messaging & Communication
- **Group Chats**: Real-time messaging for Toki participants
- **Access Control**: Chat access based on join status (approved/joined/hosting)
- **Message History**: Persistent message storage with timestamps
- **Media Support**: Image attachment capabilities
- **Offline Support**: Messages queued when offline, sent when connection restored
- **Conversation Management**: List of all active conversations

### 5. Join Request System
- **Request Flow**: Send join requests to activity hosts
- **Status Tracking**: Track request status (not_joined, pending, approved, joined)
- **Host Approval**: Hosts can approve or reject join requests
- **Automatic Joining**: Direct join for approved users
- **Status Indicators**: Visual badges showing current join status

### 6. Location & Maps
- **Interactive Map**: Visual map showing Toki locations
- **Map Markers**: Category-colored markers with attendee counts
- **Distance Calculation**: Show distance from user location
- **Location Services**: Optional location sharing for better discovery
- **Map Controls**: Zoom in/out functionality
- **Bottom Sheet**: Quick preview of selected Toki on map

### 7. User Management & Profiles
- **Profile Editing**: Edit bio, location, social links, and preferences
- **Activity History**: View created and joined Tokis
- **Saved Tokis**: Bookmark favorite activities
- **Settings Management**: Notification preferences, privacy settings
- **Data Management**: Export/clear data options
- **Account Management**: Sign out and account deletion

### 8. Notifications & Alerts
- **Push Notifications**: Configurable notification preferences
- **Activity Updates**: Notifications for join requests, approvals, and messages
- **Connection Alerts**: New connection requests and updates
- **Offline Indicators**: Connection status warnings
- **Sync Status**: Last sync time and connection status

## Key User Flows

### 1. Activity Discovery Flow
1. User opens Explore tab
2. Views nearby Tokis with search/filter options
3. Applies filters (category, distance, availability)
4. Searches for specific activities
5. Views Toki details
6. Sends join request or joins directly

### 2. Activity Creation Flow
1. User taps Create tab
2. Fills out activity form (title, type, description, location, time)
3. Sets capacity and custom tags
4. Optionally adds photo
5. Sets visibility preferences
6. Publishes Toki
7. Toki appears in discovery feeds

### 3. Join Request Flow
1. User finds interesting Toki
2. Views detailed information
3. Sends join request
4. Host receives notification
5. Host approves/rejects request
6. User receives approval notification
7. User can join chat and participate

### 4. Messaging Flow
1. User joins approved Toki
2. Accesses group chat
3. Sends/receives messages
4. Views participant list
5. Shares media and coordinates

### 5. Profile Management Flow
1. User accesses profile tab
2. Views activity statistics
3. Edits profile information
4. Manages connections
5. Adjusts privacy settings
6. Views saved activities

## Technical Architecture

### Frontend Framework
- **React Native** with **Expo SDK 53**
- **TypeScript** for type safety
- **Expo Router** for navigation
- **React Context** for state management

### State Management
- **AppContext**: Central state management with reducer pattern
- **AsyncStorage**: Local data persistence
- **Real-time Updates**: Context-based state synchronization

### Navigation Structure
```
Root Layout
├── (tabs) - Main Tab Navigation
│   ├── index.tsx - Explore Feed
│   ├── discover.tsx - Map Discovery
│   ├── create.tsx - Create Toki
│   ├── messages.tsx - Conversations
│   └── profile.tsx - User Profile
├── toki-details.tsx - Activity Details
├── chat.tsx - Group Messaging
├── edit-profile.tsx - Profile Editing
├── my-tokis.tsx - User's Activities
├── saved-tokis.tsx - Saved Activities
├── connections.tsx - User Connections
└── notifications.tsx - Notifications
```

### Data Models

#### Toki (Activity)
```typescript
interface Toki {
  id: string;
  title: string;
  description: string;
  location: string;
  time: string;
  attendees: number;
  maxAttendees: number;
  tags: string[];
  host: {
    name: string;
    avatar: string;
  };
  image: string;
  distance: string;
  isHostedByUser?: boolean;
  joinStatus?: 'not_joined' | 'pending' | 'approved' | 'joined';
  visibility: 'public' | 'connections' | 'friends';
  category: string;
  createdAt: string;
}
```

#### User Profile
```typescript
interface User {
  id: string;
  name: string;
  email?: string;
  bio: string;
  location: string;
  avatar: string;
  verified: boolean;
  socialLinks: {
    instagram?: string;
    tiktok?: string;
    linkedin?: string;
    facebook?: string;
  };
  memberSince: string;
  tokisCreated: number;
  tokisJoined: number;
  connections: number;
  rating: number;
}
```

#### Message
```typescript
interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: string;
  isOwn: boolean;
  tokiId?: string;
  createdAt: string;
}
```

### Key Components

#### 1. TokiIcon Component
- **Purpose**: Displays category-specific icons for activities
- **Features**: Dynamic icon selection based on activity category
- **Categories**: Sports, coffee, work, music, wellness, art, food, nature, drinks, etc.

#### 2. AppContext Provider
- **Purpose**: Central state management and data persistence
- **Features**: 
  - AsyncStorage integration
  - Real-time data synchronization
  - Offline support
  - Error handling
  - Connection status management

#### 3. Navigation Components
- **Tab Navigation**: Bottom tab bar with 5 main sections
- **Stack Navigation**: Modal and detail screen navigation
- **Deep Linking**: Support for direct navigation to specific Tokis

### Data Persistence
- **AsyncStorage**: Local data storage for offline functionality
- **Storage Keys**: Organized storage for Tokis, users, messages, and sync data
- **Data Sync**: Automatic synchronization when connection is restored
- **Cache Management**: Efficient data loading and caching strategies

### Offline Capabilities
- **Offline Mode**: Full functionality when disconnected
- **Data Queuing**: Messages and actions queued for later sync
- **Connection Status**: Visual indicators for online/offline state
- **Local Storage**: All data cached locally for offline access

### UI/UX Design
- **Design System**: Consistent color scheme and typography
- **Inter Font Family**: Modern, readable typography
- **Gradient Backgrounds**: Beautiful visual design with gradients
- **Responsive Layout**: Adapts to different screen sizes
- **Accessibility**: Proper contrast and touch targets
- **Loading States**: Smooth loading and error handling

### Performance Optimizations
- **Lazy Loading**: Efficient data loading strategies
- **Image Optimization**: Optimized image loading and caching
- **Memory Management**: Proper cleanup and memory optimization
- **Smooth Animations**: 60fps animations and transitions

## Security & Privacy

### Data Protection
- **Local Storage**: Sensitive data stored locally
- **Privacy Controls**: User-configurable privacy settings
- **Location Privacy**: Area-based location, not exact coordinates
- **Data Export**: User control over data export and deletion

### User Safety
- **Verification System**: User verification and ratings
- **Blocking Features**: User blocking and content filtering
- **Report System**: Inappropriate content reporting
- **Host Approval**: Join request approval system

## Future Enhancements

### Planned Features
- **Real-time Location**: Live location sharing during activities
- **Video Chat**: Integrated video calling for Toki participants
- **Payment Integration**: Paid activities and ticketing
- **Advanced Analytics**: Detailed activity and user analytics
- **Social Features**: Stories, posts, and social feed
- **AI Recommendations**: Smart activity recommendations
- **Multi-language Support**: Internationalization
- **Dark Mode**: Theme customization

### Technical Improvements
- **Backend Integration**: Full backend API integration
- **Real-time Database**: Firebase or similar real-time database
- **Push Notifications**: Native push notification system
- **Advanced Maps**: Full map integration with directions
- **Image Processing**: Advanced image upload and processing
- **Performance Monitoring**: Analytics and crash reporting

## Development Setup

### Prerequisites
- Node.js 18+
- Expo CLI
- React Native development environment
- iOS Simulator / Android Emulator

### Installation
```bash
npm install
npx expo start
```

### Key Dependencies
- **Expo SDK 53**: Core framework
- **React Native**: Mobile app framework
- **Expo Router**: Navigation
- **AsyncStorage**: Local storage
- **Lucide React Native**: Icons
- **Expo Linear Gradient**: UI components
- **React Native Safe Area**: Safe area handling

### Development Workflow
1. **Frontend-only Mode**: Currently runs in frontend-only mode with mock data
2. **Local Storage**: All data persisted in AsyncStorage
3. **Hot Reloading**: Fast development with hot reloading
4. **TypeScript**: Full type safety and IntelliSense
5. **Linting**: ESLint configuration for code quality

This comprehensive feature set makes Toki a full-featured social networking app focused on local activities and community building, with robust offline capabilities and a modern, user-friendly interface. 