# File: RatingPrompt.tsx

### Summary
This component provides a comprehensive rating interface that appears after a Toki event is completed, allowing users to rate and review other participants.

### Features
- **Multi-user Rating Flow**: Guides users through rating each participant one by one
- **Star Rating System**: 1-5 star rating with visual feedback
- **Optional Review Text**: Up to 500 characters for detailed feedback
- **Progress Tracking**: Shows current position in the rating flow
- **Navigation Controls**: Previous/Next/Skip buttons for easy navigation
- **Batch Submission**: Submits all ratings at once when completed

### Implementation Details
- **Modal Presentation**: Full-screen modal with slide animation
- **State Management**: Tracks ratings for all participants in local state
- **API Integration**: Calls the rating submission API for each rating
- **User Experience**: Prevents progression without rating selection
- **Error Handling**: Comprehensive error handling with user feedback

### Usage
The component is triggered after event completion and displays:
1. Progress indicator showing current user being rated
2. User information (name, role as host/participant)
3. Star rating selection (1-5 stars)
4. Optional review text input
5. Navigation buttons for moving between users
6. Submit button when all ratings are complete

### Integration
- **Props**: Requires tokiId, tokiTitle, participants array, and visibility control
- **Actions**: Integrates with AppContext rating actions
- **Styling**: Consistent with Toki app design system
- **Accessibility**: Proper touch targets and visual feedback
