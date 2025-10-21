# File: components/ParticipantsModal.tsx

### Summary
This file contains a modal component for displaying and managing participants in a Toki event. It provides a searchable list of participants with the ability for hosts to remove participants.

### Features Implemented
- **Participant Display**: Shows all participants with avatars, names, and host status
- **Search Functionality**: Allows filtering participants by name
- **Host Actions**: Enables hosts to remove participants (except themselves)
- **Responsive Design**: Modal with proper backdrop and responsive layout
- **User Experience**: Clean interface with loading states and proper feedback

### Component Structure
1. **Modal Header**: Title and close button
2. **Search Input**: Filter participants by name
3. **Participant List**: Scrollable list with participant cards
4. **Remove Actions**: Remove buttons for hosts (excluding host)
5. **Footer**: Participant count display

### Props Interface
- `visible`: Controls modal visibility
- `participants`: Array of participant objects with id, name, avatar, isHost
- `search`: Current search query
- `onChangeSearch`: Search input handler
- `isLoading`: Loading state
- `isHost`: Whether current user is the host
- `onClose`: Modal close handler
- `onRemoveParticipant`: Remove participant handler

### Technical Implementation
- **Avatar Fallback**: Shows initials when no avatar is available
- **Host Protection**: Prevents hosts from removing themselves
- **Search Filtering**: Real-time filtering of participants
- **Responsive Layout**: Adapts to different screen sizes
- **Error Handling**: Proper error states and user feedback

### Styling
- **Consistent Design**: Matches app's design system
- **Accessibility**: Proper contrast and touch targets
- **Visual Hierarchy**: Clear separation between elements
- **Interactive States**: Proper hover and active states
