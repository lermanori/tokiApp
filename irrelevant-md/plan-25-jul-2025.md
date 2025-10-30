# Toki Backend Implementation Plan
## Express + Supabase Backend Development Plan
### Date: July 25, 2025

## Overview
This plan outlines the development of a comprehensive backend system for the Toki social map app using Express.js and Supabase. The backend will provide persistent data storage, real-time features, authentication, and API endpoints to support all frontend functionality.

## Technology Stack

### Backend Framework
- **Express.js** - Node.js web framework
- **TypeScript** - Type safety and better development experience
- **Supabase** - PostgreSQL database with real-time features
- **JWT** - Authentication and authorization
- **Multer** - File upload handling
- **Bcrypt** - Password hashing
- **Cors** - Cross-origin resource sharing
- **Helmet** - Security headers
- **Rate Limiting** - API protection

### Development Tools
- **Nodemon** - Development server with auto-restart
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Jest** - Testing framework
- **Supertest** - API testing
- **Docker** - Containerization
- **PM2** - Production process manager

## Database Schema Design

### 1. Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  bio TEXT,
  location VARCHAR(255),
  avatar_url VARCHAR(500),
  verified BOOLEAN DEFAULT FALSE,
  rating DECIMAL(3,2) DEFAULT 0.00,
  member_since TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Social links table (one-to-many with users)
CREATE TABLE user_social_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL, -- 'instagram', 'tiktok', 'linkedin', 'facebook'
  username VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User statistics table
CREATE TABLE user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tokis_created INTEGER DEFAULT 0,
  tokis_joined INTEGER DEFAULT 0,
  connections_count INTEGER DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW()
);
```

### 2. Tokis (Activities) Table
```sql
CREATE TABLE tokis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  location VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  time_slot VARCHAR(50) NOT NULL, -- 'now', '30min', '1hour', '2hours', '3hours', 'tonight', 'tomorrow'
  scheduled_time TIMESTAMP,
  max_attendees INTEGER DEFAULT 10,
  current_attendees INTEGER DEFAULT 0,
  category VARCHAR(50) NOT NULL, -- 'sports', 'coffee', 'music', 'food', 'work', 'art', 'nature', 'drinks'
  visibility VARCHAR(20) DEFAULT 'public', -- 'public', 'connections', 'friends'
  image_url VARCHAR(500),
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'cancelled', 'completed'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Toki tags table (many-to-many)
CREATE TABLE toki_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  toki_id UUID REFERENCES tokis(id) ON DELETE CASCADE,
  tag_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 3. Toki Participants Table
```sql
CREATE TABLE toki_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  toki_id UUID REFERENCES tokis(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'joined', 'declined'
  joined_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(toki_id, user_id)
);
```

### 4. Messages Table
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  toki_id UUID REFERENCES tokis(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'image', 'location'
  media_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 5. User Connections Table
```sql
CREATE TABLE user_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(requester_id, recipient_id)
);
```

### 6. Saved Tokis Table
```sql
CREATE TABLE saved_tokis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  toki_id UUID REFERENCES tokis(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, toki_id)
);
```

### 7. Notifications Table
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'join_request', 'request_approved', 'new_message', 'connection_request'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  related_toki_id UUID REFERENCES tokis(id) ON DELETE CASCADE,
  related_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints Design

### Authentication Endpoints
```
POST /api/auth/register - User registration
POST /api/auth/login - User login
POST /api/auth/refresh - Refresh JWT token
POST /api/auth/logout - User logout
GET /api/auth/me - Get current user profile
PUT /api/auth/me - Update current user profile
POST /api/auth/verify-email - Email verification
POST /api/auth/forgot-password - Password reset request
POST /api/auth/reset-password - Reset password
```

### Users Endpoints
```
GET /api/users/:id - Get user profile
PUT /api/users/:id - Update user profile
GET /api/users/:id/tokis - Get user's created Tokis
GET /api/users/:id/joined-tokis - Get user's joined Tokis
GET /api/users/:id/stats - Get user statistics
POST /api/users/:id/avatar - Upload user avatar
DELETE /api/users/:id - Delete user account
```

### Tokis Endpoints
```
GET /api/tokis - Get all Tokis (with filters)
POST /api/tokis - Create new Toki
GET /api/tokis/:id - Get specific Toki
PUT /api/tokis/:id - Update Toki
DELETE /api/tokis/:id - Delete Toki
POST /api/tokis/:id/join - Join Toki
PUT /api/tokis/:id/leave - Leave Toki
GET /api/tokis/:id/participants - Get Toki participants
POST /api/tokis/:id/approve/:userId - Approve join request
POST /api/tokis/:id/decline/:userId - Decline join request
POST /api/tokis/:id/image - Upload Toki image
GET /api/tokis/nearby - Get nearby Tokis
```

### Messages Endpoints
```
GET /api/tokis/:id/messages - Get Toki messages
POST /api/tokis/:id/messages - Send message
DELETE /api/messages/:id - Delete message
POST /api/messages/:id/report - Report message
```

### Connections Endpoints
```
GET /api/connections - Get user connections
POST /api/connections/:userId - Send connection request
PUT /api/connections/:userId - Accept/decline connection request
DELETE /api/connections/:userId - Remove connection
GET /api/connections/pending - Get pending connection requests
```

### Saved Tokis Endpoints
```
GET /api/saved-tokis - Get user's saved Tokis
POST /api/saved-tokis/:tokiId - Save Toki
DELETE /api/saved-tokis/:tokiId - Remove saved Toki
```

### Notifications Endpoints
```
GET /api/notifications - Get user notifications
PUT /api/notifications/:id/read - Mark notification as read
PUT /api/notifications/read-all - Mark all notifications as read
DELETE /api/notifications/:id - Delete notification
```

### Search & Discovery Endpoints
```
GET /api/search/tokis - Search Tokis
GET /api/search/users - Search users
GET /api/categories - Get all categories
GET /api/tags - Get popular tags
```

## Implementation Phases

### Phase 1: Foundation & Authentication (Week 1-2)
**Goals**: Set up basic infrastructure and user authentication

#### Week 1: Project Setup
- [x] Initialize Express.js project with TypeScript
- [x] Set up Railway PostgreSQL database
- [x] Configure environment variables and secrets
- [x] Set up development tools (ESLint, Prettier, Nodemon)
- [x] Create basic Express server with middleware
- [x] Set up CORS, Helmet, and security middleware
- [x] Configure JWT authentication middleware
- [x] Set up error handling and logging

#### Week 2: Authentication System
- [x] Implement user registration endpoint
- [x] Implement user login endpoint
- [x] Set up password hashing with bcrypt
- [x] Implement JWT token generation and validation
- [x] Create authentication middleware
- [x] Implement email verification system
- [x] Set up password reset functionality
- [x] Create user profile endpoints

### Phase 2: Core Toki Features (Week 3-4)
**Goals**: Implement Toki creation, management, and discovery

#### Week 3: Toki CRUD Operations
- [x] Create Toki database schema
- [x] Implement Toki creation endpoint
- [x] Implement Toki retrieval endpoints (single, list, filtered)
- [x] Implement Toki update and deletion
- [x] Set up file upload for Toki images
- [x] Implement category and tag system
- [x] Create location-based search functionality

#### Week 4: Toki Discovery & Search
- [x] Implement advanced filtering system
- [x] Create search functionality across multiple fields
- [x] Implement nearby Tokis functionality
- [x] Set up pagination for large result sets
- [x] Implement sorting options (date, distance, popularity)
- [x] Create tag-based discovery system

### Phase 3: Social Features (Week 5-6)
**Goals**: Implement user connections and social networking

#### Week 5: User Connections
- [x] Create connections database schema
- [x] Implement connection request system
- [x] Create connection approval/decline functionality
- [x] Implement connection management endpoints
- [x] Set up user statistics tracking
- [x] Create user profile enhancement features

#### Week 6: Social Media Integration
- [x] Implement social media link management
- [x] Create user verification system
- [x] Set up user rating and review system
- [x] Implement user blocking functionality
- [x] Create user search and discovery features

### Phase 4: Messaging System (Week 7-8)
**Goals**: Implement real-time messaging and communication

#### Week 7: Message Infrastructure
- [ ] Set up messages database schema
- [ ] Implement message creation and retrieval
- [ ] Create message access control system
- [ ] Set up file upload for message media
- [ ] Implement message deletion and reporting
- [ ] Create conversation management system

#### Week 8: Real-time Features
- [ ] Integrate Supabase real-time subscriptions
- [ ] Implement WebSocket connections for live messaging
- [ ] Set up push notifications for new messages
- [ ] Create message read receipts
- [ ] Implement typing indicators
- [ ] Set up message encryption (optional)

### Phase 5: Join Request System (Week 9-10)
**Goals**: Implement comprehensive join request workflow

#### Week 9: Join Request Infrastructure
- [ ] Create participants database schema
- [ ] Implement join request system
- [ ] Create request approval/decline functionality
- [ ] Set up automatic participant counting
- [ ] Implement capacity management
- [ ] Create join status tracking

#### Week 10: Request Management
- [ ] Implement host notification system
- [ ] Create request history and analytics
- [ ] Set up automatic request expiration
- [ ] Implement bulk request management
- [ ] Create request analytics and insights

### Phase 6: Advanced Features (Week 11-12)
**Goals**: Implement notifications, saved items, and advanced features

#### Week 11: Notifications & Saved Items
- [ ] Create notifications database schema
- [ ] Implement notification system
- [ ] Set up push notification delivery
- [ ] Create saved Tokis functionality
- [ ] Implement notification preferences
- [ ] Set up notification analytics

#### Week 12: Advanced Features
- [ ] Implement location services and geolocation
- [ ] Create advanced search with filters
- [ ] Set up data export functionality
- [ ] Implement user activity tracking
- [ ] Create admin dashboard endpoints
- [ ] Set up analytics and reporting

### Phase 7: Testing & Optimization (Week 13-14)
**Goals**: Comprehensive testing and performance optimization

#### Week 13: Testing
- [ ] Write unit tests for all endpoints
- [ ] Create integration tests
- [ ] Set up API testing with Supertest
- [ ] Implement error handling tests
- [ ] Create load testing scenarios
- [ ] Set up automated testing pipeline

#### Week 14: Optimization & Security
- [ ] Implement rate limiting
- [ ] Set up caching with Redis (optional)
- [ ] Optimize database queries
- [ ] Implement API versioning
- [ ] Set up monitoring and logging
- [ ] Security audit and penetration testing

### Phase 8: Deployment & Documentation (Week 15-16)
**Goals**: Deploy to production and create comprehensive documentation

#### Week 15: Deployment
- [ ] Set up production environment
- [ ] Configure Docker containers
- [ ] Set up CI/CD pipeline
- [ ] Configure production database
- [ ] Set up monitoring and alerting
- [ ] Implement backup strategies

#### Week 16: Documentation & Handover
- [ ] Create comprehensive API documentation
- [ ] Write deployment guides
- [ ] Create maintenance procedures
- [ ] Set up developer onboarding
- [ ] Create troubleshooting guides
- [ ] Final testing and bug fixes

## Database Indexes & Performance

### Primary Indexes
```sql
-- Users table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_location ON users(location);

-- Tokis table indexes
CREATE INDEX idx_tokis_host_id ON tokis(host_id);
CREATE INDEX idx_tokis_category ON tokis(category);
CREATE INDEX idx_tokis_location ON tokis(latitude, longitude);
CREATE INDEX idx_tokis_created_at ON tokis(created_at);
CREATE INDEX idx_tokis_status ON tokis(status);

-- Participants table indexes
CREATE INDEX idx_participants_toki_id ON toki_participants(toki_id);
CREATE INDEX idx_participants_user_id ON toki_participants(user_id);
CREATE INDEX idx_participants_status ON toki_participants(status);

-- Messages table indexes
CREATE INDEX idx_messages_toki_id ON messages(toki_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Connections table indexes
CREATE INDEX idx_connections_requester ON user_connections(requester_id);
CREATE INDEX idx_connections_recipient ON user_connections(recipient_id);
CREATE INDEX idx_connections_status ON user_connections(status);
```

### Full-Text Search Indexes
```sql
-- Enable full-text search on Tokis
ALTER TABLE tokis ADD COLUMN search_vector tsvector;
CREATE INDEX idx_tokis_search ON tokis USING gin(search_vector);

-- Create function to update search vector
CREATE OR REPLACE FUNCTION update_toki_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.location, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search vector
CREATE TRIGGER toki_search_update
  BEFORE INSERT OR UPDATE ON tokis
  FOR EACH ROW EXECUTE FUNCTION update_toki_search_vector();
```

## Security Implementation

### Authentication Security
- JWT tokens with short expiration times
- Refresh token rotation
- Password strength requirements
- Rate limiting on authentication endpoints
- Account lockout after failed attempts

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CORS configuration
- HTTPS enforcement
- Data encryption at rest

### API Security
- API key authentication for external services
- Request signing for sensitive operations
- Audit logging for all operations
- Rate limiting per user/IP
- Request size limits

## Monitoring & Analytics

### Application Monitoring
- Request/response logging
- Error tracking and alerting
- Performance metrics collection
- Database query monitoring
- Memory and CPU usage tracking

### Business Analytics
- User registration and retention metrics
- Toki creation and participation rates
- Message activity tracking
- Connection growth analytics
- Popular categories and locations

## Deployment Strategy

### Development Environment
- Local development with Docker
- Hot reloading for development
- Environment-specific configurations
- Database seeding for development

### Staging Environment
- Automated deployment from main branch
- Production-like environment
- Integration testing
- Performance testing

### Production Environment
- Blue-green deployment strategy
- Automated backups
- Monitoring and alerting
- Load balancing
- CDN for static assets

## API Documentation

### OpenAPI/Swagger Specification
- Complete API documentation
- Interactive API testing
- Request/response examples
- Authentication documentation
- Error code documentation

### SDK Development
- JavaScript/TypeScript SDK
- React Native integration examples
- Authentication helpers
- Real-time subscription helpers

## Testing Strategy

### Unit Testing
- Controller function testing
- Service layer testing
- Database operation testing
- Authentication testing

### Integration Testing
- API endpoint testing
- Database integration testing
- Authentication flow testing
- File upload testing

### End-to-End Testing
- Complete user flow testing
- Real-time feature testing
- Performance testing
- Security testing

## Success Metrics

### Technical Metrics
- API response time < 200ms
- 99.9% uptime
- Zero security vulnerabilities
- 100% test coverage for critical paths

### Business Metrics
- User registration growth
- Toki creation rate
- User engagement metrics
- Message activity levels

## Risk Mitigation

### Technical Risks
- Database performance issues
- Real-time scaling challenges
- Security vulnerabilities
- API rate limiting

### Mitigation Strategies
- Database optimization and indexing
- Horizontal scaling preparation
- Regular security audits
- Comprehensive monitoring

## Conclusion

This comprehensive backend implementation plan provides a roadmap for building a robust, scalable, and secure backend system for the Toki social map app. The phased approach ensures steady progress while maintaining code quality and system reliability.

The combination of Express.js and Supabase provides a modern, efficient stack that can handle the app's current needs while being prepared for future growth and scaling requirements. 