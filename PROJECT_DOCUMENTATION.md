# Toki App - Complete Project Documentation
**Last Updated**: October 29, 2025

---

## Table of Contents
1. [Project Overview & Status](#project-overview--status)
2. [Architecture & Technology Stack](#architecture--technology-stack)
3. [Core Features & Architecture](#core-features--architecture)
4. [Feature Implementations](#feature-implementations)
5. [Deployment & Infrastructure](#deployment--infrastructure)
6. [Development Guide](#development-guide)

---

# Project Overview & Status

## 🎯 Project Overview

**Toki** is a React Native/Expo social networking app focused on local activities and events. It allows users to discover, create, and join local activities (called "Tokis") in their area, with features for real-time messaging, user connections, and location-based discovery.

### Current Project Status: **85% Complete** 🎉

The Toki app has evolved from a basic concept to a fully functional social networking platform with real-time messaging, activity management, and comprehensive social features. The core infrastructure is solid, and most major features are implemented and tested. The focus is now on completing remaining features, optimizing performance, and preparing for production deployment.

## 📊 Project Metrics

### Code Coverage
- **Frontend**: ~85% of planned features implemented
- **Backend**: ~90% of planned features implemented
- **Database**: 100% of planned schema implemented
- **API**: 100% of planned endpoints implemented

### Feature Completeness
- **Core Features**: 95% complete
- **Social Features**: 90% complete
- **Messaging**: 95% complete
- **Discovery**: 85% complete
- **Real-time**: 90% complete

---

# Architecture & Technology Stack

## Frontend (React Native/Expo)
- **Framework**: React Native 0.79.1 with Expo SDK 53
- **Navigation**: Expo Router v5 with file-based routing
- **State Management**: React Context API with useReducer
- **UI Components**: Custom components with Lucide React Native icons
- **Styling**: StyleSheet with Inter font family
- **Real-time**: Socket.io client for WebSocket communication
- **Storage**: AsyncStorage for local data persistence
- **Platforms**: iOS, Android, and Web support

## Backend (Node.js/Express)
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL via Supabase
- **Authentication**: JWT with refresh token system
- **Real-time**: Socket.io server
- **File Upload**: Multer for image handling
- **Security**: Helmet, CORS, rate limiting
- **Validation**: Input validation and sanitization

## Database Schema
- **Users**: Authentication, profiles, social links, statistics
- **Tokis**: Activities with categories, locations, time slots
- **Messages**: Individual and group chat messages
- **Connections**: User-to-user relationships
- **Ratings**: User rating system
- **Blocks**: User blocking functionality
- **Read States**: Message read tracking per user

---

# Core Features & Architecture

## 1. Activity Discovery & Exploration
- **Explore Feed**: Main feed showing nearby Tokis with search and filtering
- **Map Discovery**: Visual map interface showing Toki locations with interactive markers
- **Advanced Filtering**: Filter by category, distance, availability, and visibility
- **Search Functionality**: Search across titles, descriptions, locations, tags, and hosts
- **Tag-based Discovery**: Browse activities by tags (sports, coffee, work, music, etc.)
- **Real-time Updates**: Live updates of new Tokis and participant counts

## 2. Activity Creation & Management
- **Create Toki**: Comprehensive form for creating new activities
- **Activity Types**: Predefined categories (sports, coffee, music, food, work, art, nature, drinks)
- **Custom Tags**: Add custom tags to improve discoverability
- **Location Setting**: Specify activity location (area-based, not exact coordinates)
- **Time Scheduling**: Flexible time slots (Now, 30 min, 1 hour, 2 hours, 3 hours, Tonight, Tomorrow)
- **Capacity Management**: Set maximum attendees and track current participants
- **Photo Upload**: Optional photo attachment for activities
- **Visibility Controls**: Public, connections-only, or friends-only visibility

## 3. Social Features & Networking
- **User Profiles**: Comprehensive profiles with bio, location, social links, and stats
- **Connection System**: Build connections with other users
- **Social Media Integration**: Instagram, TikTok, LinkedIn, Facebook links
- **User Verification**: Verified user badges and ratings
- **Activity Statistics**: Track Tokis created, joined, and connections made
- **Invite Friends**: Share app and invite connections to activities

## 4. Messaging & Communication
- **Group Chats**: Real-time messaging for Toki participants
- **Individual Chats**: Direct messaging between users
- **Access Control**: Chat access based on join status (approved/joined/hosting)
- **Message History**: Persistent message storage with timestamps
- **Media Support**: Image attachment capabilities
- **Offline Support**: Messages queued when offline, sent when connection restored
- **Real-time Updates**: WebSocket-based instant messaging
- **Auto-mark-as-read**: Messages marked read when actively viewing
- **Unread Counts**: Per-user unread message tracking

## 5. Join Request System
- **Request Flow**: Send join requests to activity hosts
- **Status Tracking**: Track request status (not_joined, pending, approved, joined)
- **Host Approval**: Hosts can approve or reject join requests
- **Automatic Joining**: Direct join for approved users
- **Status Indicators**: Visual badges showing current join status

## 6. User Management & Profiles
- **Profile Editing**: Edit bio, location, social links, and preferences
- **Activity History**: View created and joined Tokis
- **Saved Tokis**: Bookmark favorite activities
- **Settings Management**: Notification preferences, privacy settings
- **Data Management**: Export/clear data options
- **Account Management**: Sign out and account deletion

## 7. Real-time Features
- **WebSocket Connection**: Stable real-time communication
- **Room Management**: Automatic joining of chat rooms
- **Cross-device Sync**: Messages sync across devices
- **Offline Support**: Message queuing when offline
- **Connection Status**: Real-time connection monitoring

---

# Feature Implementations

## ✅ Completed Features

### 1. Core Infrastructure 🏗️
- ✅ **Authentication System**: Complete JWT-based auth with refresh tokens
- ✅ **User Management**: Registration, login, profile management
- ✅ **Database Setup**: Full PostgreSQL schema with relationships
- ✅ **API Foundation**: RESTful API with proper middleware
- ✅ **Error Handling**: Comprehensive error handling and validation
- ✅ **Security**: CORS, Helmet, rate limiting, input sanitization

### 2. Activity Management 🎯
- ✅ **Toki Creation**: Full CRUD operations for activities
- ✅ **Category System**: Predefined activity categories (sports, coffee, music, etc.)
- ✅ **Tag System**: Custom tags for better discoverability
- ✅ **Location Management**: Area-based location system
- ✅ **Time Scheduling**: Flexible time slots (now, 30min, 1hour, etc.)
- ✅ **Capacity Management**: Attendee limits and tracking
- ✅ **Photo Upload**: Image attachment for activities
- ✅ **Visibility Controls**: Public, connections-only, friends-only

### 3. Social Features 👥
- ✅ **User Profiles**: Comprehensive profiles with bio, location, social links
- ✅ **Connection System**: Send/accept/decline connection requests
- ✅ **Social Media Integration**: Instagram, TikTok, LinkedIn, Facebook links
- ✅ **User Verification**: Verified user badges and rating system
- ✅ **Activity Statistics**: Track created/joined Tokis and connections
- ✅ **Join Request System**: Host approval workflow for Toki participation

### 4. Messaging System 💬
- ✅ **Individual Chats**: Direct messaging between users
- ✅ **Group Chats**: Real-time messaging for Toki participants
- ✅ **Message Persistence**: Database storage with timestamps
- ✅ **Media Support**: Image attachment capabilities
- ✅ **Real-time Updates**: WebSocket-based instant messaging
- ✅ **Auto-mark-as-read**: Messages marked read when actively viewing
- ✅ **Unread Counts**: Per-user unread message tracking
- ✅ **Message History**: Persistent conversation storage

### 5. Discovery & Search 🔍
- ✅ **Explore Feed**: Main feed with nearby Tokis
- ✅ **Advanced Filtering**: Category, distance, availability, visibility
- ✅ **Search Functionality**: Full-text search across titles, descriptions, tags
- ✅ **Map Interface**: Visual map with interactive markers
- ✅ **Distance Calculation**: Show distance from user location
- ✅ **Tag-based Discovery**: Browse activities by tags

## 🔄 Recently Implemented Features

### Auto-Mark-as-Read System ✅
- **Real-time marking**: Messages marked read when actively viewing
- **User engagement detection**: Typing, scrolling, screen focus
- **Smart debouncing**: Prevents excessive API calls
- **Instant UI feedback**: Unread counts update immediately
- **Backend sync**: Read status persisted and shared

### Enhanced Authentication ✅
- **Retry logic**: Authentication checks retry failed requests
- **Caching**: Authentication status cached for 30 seconds
- **Better error handling**: Distinguishes between auth and network errors
- **Debounced checks**: Layout auth checks limited to once every 5 seconds

### WebSocket Room Management ✅
- **Auto-room joining**: Users automatically join relevant chat rooms
- **Listener re-establishment**: Global listeners re-established when needed
- **Cross-screen messaging**: Messages work across all app screens
- **Navigation resilience**: Messaging continues after screen navigation

---

# Detailed Feature Documentation

## Invite Links Feature

### Overview
The Invite Links feature allows Toki hosts to generate shareable URLs that enable direct joining of events without requiring individual invitations. This feature provides a convenient way to share events publicly while maintaining control over access.

### Features
- **Generate Invite Links**: Create unique, shareable URLs for any Toki
- **Custom Messages**: Add personalized messages for invitees
- **Usage Limits**: Set maximum number of uses (or unlimited)
- **Link Management**: View, regenerate, and deactivate links
- **Public Access**: Anyone with the link can view event details and join
- **Usage Tracking**: Monitor how many times a link has been used

### Database Schema
```sql
CREATE TABLE toki_invite_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  toki_id UUID NOT NULL REFERENCES tokis(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invite_code VARCHAR(32) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  max_uses INTEGER DEFAULT NULL,
  used_count INTEGER DEFAULT 0,
  custom_message TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### API Endpoints
- `POST /api/tokis/:id/invite-links` - Generate invite link
- `POST /api/tokis/join-by-link` - Join by invite code
- `GET /api/tokis/invite-links/:code` - Get link info (public)
- `GET /api/tokis/:id/invite-links` - List links for Toki
- `POST /api/tokis/:id/invite-links/regenerate` - Regenerate link
- `DELETE /api/tokis/invite-links/:linkId` - Deactivate link

---

## User Rating System

### Overview
The User Rating System allows Toki app users to rate and review each other after participating in events together. This builds community trust, encourages good behavior, and helps users identify reliable hosts and participants.

### Core Concept
- **User Reputation**: Build trust through community ratings
- **Event-Based Ratings**: Ratings tied to specific Toki participation
- **Bidirectional**: Both hosts and participants can rate each other
- **Quality Assurance**: Encourage positive community behavior

### Database Schema
```sql
CREATE TABLE user_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rater_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rated_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  toki_id UUID NOT NULL REFERENCES tokis(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rater_id, rated_user_id, toki_id)
);
```

### API Endpoints
- `POST /api/ratings` - Submit new rating
- `GET /api/users/:id/ratings` - Get user's rating history
- `PUT /api/ratings/:id` - Update existing rating
- `DELETE /api/ratings/:id` - Delete rating
- `GET /api/users/:id/rating-stats` - Get user's rating statistics

---

## User Blocking System

### Overview
The user blocking system provides safety and moderation features by allowing users to block other users, preventing unwanted interactions while maintaining data integrity.

### Features
- **Block Users**: Prevent specific users from interacting with you
- **Unblock Users**: Restore normal interaction capabilities
- **Block Management**: View and manage your blocked users list
- **Block Status Checking**: Check if a user is blocked by you or has blocked you

### Interaction Restrictions
- **Messaging**: Blocked users cannot send messages to blockers
- **Toki Visibility**: Blocked users cannot see Tokis hosted by blockers
- **Connection Requests**: Blocked users cannot send connection requests
- **Connection Visibility**: Blocked users are filtered out of connection lists

### API Endpoints
- `POST /api/blocks/users/:userId` - Block a user
- `DELETE /api/blocks/users/:userId` - Unblock a user
- `GET /api/blocks/blocked-users` - Get list of blocked users
- `GET /api/blocks/check/:userId` - Check blocking status

---

## Toki Images Feature

### Overview
Implementation of Toki Pictures - allowing users to upload and manage multiple images for their Toki events, with intelligent fallback images based on activity type using high-quality Pexels photos.

### Components
- **Backend Infrastructure**: Cloudinary integration, image service, API routes
- **Frontend Components**: `TokiImageUpload` component for managing images
- **Smart Fallback System**: Pexels photo integration for activity-based fallbacks
- **Maximum 6 images per Toki**

### API Endpoints
- `POST /api/toki-images/upload/:tokiId` - Upload single image
- `DELETE /api/toki-images/delete/:tokiId/:publicId` - Delete specific image
- `GET /api/toki-images/info/:tokiId` - Get all images for a Toki

---

## Rich Link Previews Implementation

### Overview
Enhanced sharing system that generates beautiful Open Graph and Twitter Card meta tags for Toki events, making shared links look professional when posted on social media or messaging platforms.

### Features
- **Dynamic Meta Tags**: Generated on-the-fly for each Toki
- **Image Fallback System**: Category-based high-quality images
- **Description Generation**: Smart description logic with fallbacks
- **URL Generation**: Deep link support with parameter preservation

---

## Enhanced Sharing Implementation

### Features
- **Native Share Sheet**: Use platform-native sharing capabilities
- **Link Generation**: Generate shareable links for Tokis
- **Social Media Integration**: Direct sharing to major platforms
- **Custom Share Messages**: Personalized sharing messages

---

## Real-time Messaging Enhancements

### Features
- **Real-time Updates**: WebSocket-based instant messaging
- **Auto-mark-as-read**: Messages marked read when actively viewing
- **Room Management**: Automatic joining of chat rooms
- **Cross-device Sync**: Messages sync across devices
- **Connection Resilience**: Robust reconnection handling

---

## Comprehensive Logging Setup

### Overview
Complete logging infrastructure for both frontend and backend, providing detailed insights into app behavior, errors, and user interactions.

### Components
- **Backend Logging**: Structured logging with Winston
- **Frontend Logging**: Console and remote logging
- **Error Tracking**: Comprehensive error capture and reporting
- **Performance Monitoring**: Request timing and performance metrics

---

## Redirection Feature

### Overview
System for handling URL redirections and deep linking, ensuring users are redirected to appropriate screens based on authentication status and URL parameters.

### Features
- **Authentication-Aware Redirection**: Redirect based on auth status
- **Deep Link Support**: Handle deep links to specific Tokis
- **Parameter Preservation**: Maintain URL parameters through redirects
- **Fallback Handling**: Graceful fallbacks for invalid links

---

## Public Profile Improvements

### Features
- **Enhanced Profile Display**: Comprehensive user profiles
- **Social Links Integration**: Instagram, TikTok, LinkedIn, Facebook
- **Activity Statistics**: Display created/joined Tokis and connections
- **Rating Display**: Show user ratings and reviews
- **Verification Badges**: Display verified user status

---

## Toki Categories Fix

### Overview
Standardization of Toki categories to ensure consistency across the platform, removing duplicate tags and ensuring all categories match supported activity types.

### Results
- **Categories Standardized**: 21 → 11 standardized categories
- **Duplicate Tags Removed**: 27 duplicate category tags removed
- **All Tokis Valid**: 100% of Tokis now use valid categories

---

# Deployment & Infrastructure

## Railway Frontend Deployment

### Overview
Deployment guide for React Native/Expo web app to Railway's free static hosting service.

### Deployment Steps
1. **Build**: `expo export --platform web`
2. **Railway Configuration**: Static site configuration
3. **Environment Variables**: Configure API endpoints
4. **Deployment**: Automatic deployment via Railway

---

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

---

## 🎯 Next Milestones

### Short Term (1-2 weeks)
1. Complete message reporting system
2. Implement advanced search filters
3. Fix any remaining bugs
4. Complete frontend testing

### Medium Term (1-2 months)
1. Integrate push notifications
2. Implement advanced map features
3. Add social sharing capabilities
4. Performance optimization

### Long Term (3-6 months)
1. AI-powered recommendations
2. Advanced analytics
3. Mobile app store deployment
4. User acquisition strategy

---

## 🐛 Known Issues & Limitations

### Current Issues
- **Message reporting**: Frontend UI pending implementation
- **Advanced filters**: Date range and radius filtering not implemented
- **Push notifications**: Not yet integrated
- **Offline mode**: Basic queuing implemented, full offline support pending

### Performance Considerations
- **Image optimization**: Large images may impact performance
- **Database queries**: Some complex queries may need optimization
- **WebSocket scaling**: Room management for large user bases

---

**End of Documentation**

This comprehensive documentation covers all major features, implementations, and technical details of the Toki app. For specific feature details, refer to individual implementation documents in the `relevant-md/` folder.


