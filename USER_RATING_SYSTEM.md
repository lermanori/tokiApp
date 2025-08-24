# User Rating System - Feature Specification
## Toki App - M012 Task

### 📋 **Overview**
The User Rating System allows Toki app users to rate and review each other after participating in events together. This builds community trust, encourages good behavior, and helps users identify reliable hosts and participants.

### 🎯 **Core Concept**
- **User Reputation**: Build trust through community ratings
- **Event-Based Ratings**: Ratings tied to specific Toki participation
- **Bidirectional**: Both hosts and participants can rate each other
- **Quality Assurance**: Encourage positive community behavior

---

## 🔄 **User Flow**

### **1. Rating Trigger**
- **When**: After a Toki event ends
- **Who**: All participants (including host)
- **What**: Rate other users they interacted with
- **Frequency**: Once per user per event

### **2. Rating Process**
```
Event Ends → Rating Prompt → Select Users → Rate Each User → Submit → Profile Updated
```

### **3. Rating Interface**
- **Star Selection**: 1-5 star rating system
- **Review Text**: Optional written feedback (max 500 characters)
- **User Selection**: Choose which participants to rate
- **Submit**: One-time submission per user per event

---

## 🏗️ **Technical Architecture**

### **Database Schema**
```sql
-- User ratings table
CREATE TABLE user_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rater_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rated_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  toki_id UUID NOT NULL REFERENCES tokis(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one rating per user per event
  UNIQUE(rater_id, rated_user_id, toki_id)
);

-- Indexes for performance
CREATE INDEX idx_user_ratings_rated_user_id ON user_ratings(rated_user_id);
CREATE INDEX idx_user_ratings_toki_id ON user_ratings(toki_id);
CREATE INDEX idx_user_ratings_created_at ON user_ratings(created_at);
```

### **API Endpoints**
```typescript
// Rating Management
POST   /api/ratings                    // Submit new rating
GET    /api/users/:id/ratings          // Get user's rating history
PUT    /api/ratings/:id                // Update existing rating
DELETE /api/ratings/:id                // Delete rating

// Rating Statistics
GET    /api/users/:id/rating-stats     // Get user's rating statistics
```

### **Data Models**
```typescript
interface UserRating {
  id: string;
  raterId: string;           // Who gave the rating
  ratedUserId: string;       // Who received the rating
  tokiId: string;            // Which event
  rating: number;            // 1-5 stars
  reviewText?: string;       // Optional review
  createdAt: string;
  updatedAt?: string;
  
  // Additional context
  rater: {
    id: string;
    name: string;
    avatar?: string;
  };
  ratedUser: {
    id: string;
    name: string;
    avatar?: string;
  };
  toki: {
    id: string;
    title: string;
    date: string;
  };
}

interface UserRatingStats {
  averageRating: number;     // Overall average (e.g., 4.7)
  totalRatings: number;      // Total ratings received
  totalReviews: number;      // Ratings with text reviews
  ratingDistribution: {      // Breakdown by star rating
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  recentRatings: UserRating[]; // Last 5 ratings
}
```

---

## 🎨 **User Interface Design**

### **1. Rating Prompt Modal**
```
┌─────────────────────────────────────┐
│ Rate Your Experience               │
│                                     │
│ How was your experience with:       │
│                                     │
│ 👤 Maya Cohen                      │
│ ⭐⭐⭐⭐⭐ (5 stars)                 │
│                                     │
│ [Optional Review]                   │
│ ┌─────────────────────────────────┐ │
│ │ Maya was an amazing host! The  │ │
│ │ event was well-organized and   │ │
│ │ everyone had a great time.     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Submit Rating] [Skip] [Cancel]     │
└─────────────────────────────────────┘
```

### **2. Profile Rating Display**
```
┌─────────────────────────────────────┐
│ Maya Cohen                         │
│ ⭐⭐⭐⭐⭐ 4.7 (23 ratings)          │
│                                     │
│ Rating Distribution:                │
│ ⭐⭐⭐⭐⭐ 15 (65%)                  │
│ ⭐⭐⭐⭐   6 (26%)                  │
│ ⭐⭐⭐     2 (9%)                   │
│ ⭐⭐       0 (0%)                   │
│ ⭐         0 (0%)                   │
│                                     │
│ Recent Reviews:                     │
│ "Great host, very organized!"       │
│ "Amazing energy and fun events!"    │
│ "Always creates a great atmosphere" │
└─────────────────────────────────────┘
```

### **3. Rating History Page**
```
┌─────────────────────────────────────┐
│ My Ratings                          │
│                                     │
│ Given Ratings (12)                  │
│ ┌─────────────────────────────────┐ │
│ │ Maya Cohen - ⭐⭐⭐⭐⭐           │ │
│ │ Beach Volleyball - 2 days ago  │ │
│ │ "Excellent host!"               │
│ └─────────────────────────────────┘ │
│                                     │
│ Received Ratings (8)                │
│ ┌─────────────────────────────────┐ │
│ │ David Chen - ⭐⭐⭐⭐⭐           │ │
│ │ Coffee Meetup - 1 week ago     │ │
│ │ "Great conversation!"           │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## 🔧 **Implementation Details**

### **Frontend Components**
1. **RatingModal**: Star selection + review input
2. **RatingPrompt**: Appears after event completion
3. **RatingDisplay**: Shows on user profiles
4. **RatingHistory**: User's rating history page
5. **RatingStats**: Rating statistics and distribution

### **State Management**
```typescript
// AppContext additions
interface AppState {
  // ... existing state
  userRatings: { [userId: string]: UserRating[] };
  userRatingStats: { [userId: string]: UserRatingStats };
}

// Actions
const submitRating = async (ratedUserId: string, tokiId: string, rating: number, reviewText?: string): Promise<boolean>;
const getUserRatings = async (userId: string): Promise<void>;
const getUserRatingStats = async (userId: string): Promise<void>;
const updateRating = async (ratingId: string, rating: number, reviewText?: string): Promise<boolean>;
const deleteRating = async (ratingId: string): Promise<boolean>;
```

### **Rating Triggers**
1. **Event Completion**: Show rating prompt when Toki ends
2. **Profile View**: Display ratings when viewing any user profile
3. **Search Results**: Show host ratings in event discovery
4. **Personal History**: Access to own rating history

---

## 📱 **User Experience Features**

### **Smart Rating Prompts**
- **Timing**: Prompt appears 24 hours after event ends
- **Reminders**: Gentle reminders if not completed within 3 days
- **Batch Rating**: Rate multiple users from same event at once
- **Skip Option**: Users can skip rating if they prefer

### **Rating Validation**
- **One Rating Per Event**: Prevent duplicate ratings
- **Event Participation**: Only participants can rate each other
- **Time Window**: Rating window (e.g., 30 days after event)
- **Content Moderation**: Review text filtering for inappropriate content

### **Privacy & Control**
- **Anonymous Ratings**: Ratings are public but reviewer identity is shown
- **Rating Visibility**: Users can see who rated them
- **Edit Window**: Users can edit ratings within 7 days
- **Delete Option**: Users can delete their own ratings

---

## 🚀 **Implementation Phases**

### **Phase 1: Core Rating System**
- [ ] Database schema and API endpoints
- [ ] Basic rating submission and retrieval
- [ ] Rating display on user profiles
- [ ] Basic rating statistics

### **Phase 2: Enhanced Features**
- [ ] Rating prompts after events
- [ ] Rating history page
- [ ] Rating distribution charts
- [ ] Rating search and filtering

### **Phase 3: Advanced Features**
- [ ] Rating analytics and insights
- [ ] Rating-based recommendations
- [ ] Rating notifications and reminders
- [ ] Rating moderation tools

---

## 🧪 **Testing Scenarios**

### **Functional Testing**
- [ ] Submit rating for another user
- [ ] View ratings on user profile
- [ ] Access personal rating history
- [ ] Edit/delete own ratings
- [ ] Prevent duplicate ratings

### **Edge Cases**
- [ ] Rate user from multiple events
- [ ] Handle deleted users/events
- [ ] Rating validation and error handling
- [ ] Performance with many ratings
- [ ] Cross-platform compatibility

### **User Acceptance Testing**
- [ ] Rating flow is intuitive
- [ ] Rating display is clear and informative
- [ ] Rating prompts appear at appropriate times
- [ ] Overall user satisfaction with rating system

---

## 📊 **Success Metrics**

### **Adoption Metrics**
- **Rating Completion Rate**: % of events that result in ratings
- **User Participation**: % of users who give/receive ratings
- **Rating Frequency**: Average ratings per user per month

### **Quality Metrics**
- **Average Rating**: Overall community rating average
- **Rating Distribution**: Balance of ratings across 1-5 stars
- **Review Completion**: % of ratings with text reviews

### **Community Metrics**
- **Trust Building**: User engagement with rated hosts
- **Behavior Improvement**: Rating trends over time
- **Community Satisfaction**: User feedback on rating system

---

## 🔮 **Future Enhancements**

### **Advanced Rating Features**
- **Rating Categories**: Rate specific aspects (organization, communication, etc.)
- **Rating Weights**: Recent ratings count more than old ones
- **Rating Challenges**: Dispute resolution for unfair ratings
- **Rating Analytics**: Detailed insights and trends

### **Integration Features**
- **Event Recommendations**: Suggest events based on host ratings
- **User Matching**: Match users based on rating compatibility
- **Rating Incentives**: Rewards for active rating participation
- **Social Features**: Share ratings and reviews

---

## 📝 **Technical Notes**

### **Performance Considerations**
- **Rating Caching**: Cache rating stats for frequently viewed profiles
- **Database Indexing**: Optimize queries for rating retrieval
- **Pagination**: Handle large numbers of ratings efficiently
- **Real-time Updates**: WebSocket updates for new ratings

### **Security Considerations**
- **Rate Limiting**: Prevent rating spam and abuse
- **Content Filtering**: Moderate review text content
- **User Verification**: Ensure ratings come from real participants
- **Data Privacy**: Protect user rating data appropriately

---

## ✅ **Acceptance Criteria**

### **Must Have**
- [ ] Users can rate other users after participating in events together
- [ ] Ratings are displayed on user profiles
- [ ] Users can view their own rating history
- [ ] Rating statistics are calculated and displayed
- [ ] One rating per user per event enforcement

### **Should Have**
- [ ] Rating prompts appear after event completion
- [ ] Users can edit/delete their own ratings
- [ ] Rating distribution charts and visualizations
- [ ] Rating search and filtering capabilities

### **Could Have**
- [ ] Rating-based event recommendations
- [ ] Rating analytics and insights
- [ ] Rating moderation and dispute resolution
- [ ] Rating incentives and gamification

---

## 📚 **References**

### **Existing Code**
- `services/api.ts`: Rating API service methods
- `contexts/AppContext.tsx`: Rating state management
- `app/(tabs)/profile.tsx`: User profile display
- `app/toki-details.tsx`: Event details and user interaction

### **Related Features**
- **M010**: Profile Page Counters (completed)
- **M011**: Individual Chat Links (completed)
- **M013**: Location Geocoding (completed)

---

*This document serves as the complete specification for implementing the User Rating System (M012) in the Toki app.*
