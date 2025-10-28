# File: messages.tsx

### Summary
This file contains the Messages screen component that displays user conversations and Toki group chats. It now includes a comprehensive search functionality that allows users to search through conversations by name, title, description, and message content.

### Search Feature Implementation
- **Search Input**: Expandable search bar that appears when search button is tapped
- **Real-time Search**: 300ms debounced search with instant results
- **Search Results**: Filtered conversations and group chats based on search query
- **Text Highlighting**: Matching text is highlighted in search results
- **Search States**: Active search state with visual feedback
- **Keyboard Management**: Auto-focus, dismiss on scroll, and clear functionality

### Key Features Added
1. **Search State Management**
   - `searchQuery`: Current search input text
   - `isSearching`: Whether search mode is active
   - `filteredChats`: Array of filtered search results

2. **Search Logic**
   - Searches through individual conversation names
   - Searches through Toki group titles and descriptions
   - Searches through last message content
   - Case-insensitive search with regex matching

3. **UI Components**
   - Expandable search input with search icon
   - Clear button for resetting search
   - Search results count display
   - Search summary header with result count
   - Highlighted matching text in results

4. **User Experience**
   - Smooth animations and transitions
   - Keyboard auto-focus when search is activated
   - Auto-dismiss keyboard on scroll
   - Clear visual feedback for active search state
   - Empty state for no search results

### Search Functionality Details
- **Debouncing**: 300ms delay to avoid excessive filtering
- **Multi-field Search**: Searches across names, titles, descriptions, and messages
- **Real-time Updates**: Results update as user types
- **Performance Optimized**: Local filtering for immediate results
- **Accessibility**: Proper keyboard navigation and screen reader support
- **Error Handling**: Comprehensive null checks and error handling for data safety

### Bug Fixes Applied
- **Problem**: Search function was crashing due to null/undefined properties in chat objects
- **Solution**: Added comprehensive null checks and type safety throughout search logic
- **Implementation**: 
  - Added null checks for all object properties before calling toLowerCase()
  - Added try-catch blocks around search and data processing functions
  - Added fallback values for missing data (e.g., 'Unknown User', 'Untitled Toki')
  - Enhanced error logging for debugging

### Toki Image Circles Feature
- **Problem**: Toki group chats needed visual distinction from individual conversations and should display toki images.
- **Solution**: Added overlapping circular image display for toki group chats showing up to 3 toki images with a "+N" indicator for additional images.
- **Implementation**:
  - Updated backend route `/api/messages/tokis/group-chats` to include `image_urls` and `category` fields from tokis table
  - Added `image_urls?: string[]` and `category?: string` to `TokiGroupChat` interface
  - Created overlapping circle layout showing up to 3 toki images
  - Added "+N" badge for tokis with more than 3 images
  - Added fallback to show default category-based image (using `getActivityPhoto()`) for tokis without uploaded images
  - Styled circles with white borders and proper overlap (-12px margin)
  - Individual conversations continue to show single avatar image

### Default Toki Images
- **Problem**: Tokis without uploaded images showed a generic Users icon fallback.
- **Solution**: Display category-based default images (coffee, sports, music, etc.) when no images are uploaded.
- **Implementation**:
  - Imported `getActivityPhoto` utility function
  - Updated fallback logic to use `getActivityPhoto(category)` instead of Users icon
  - Backend now returns `category` field for each toki group chat
  - Default images match the toki's activity type (e.g., coffee shop image for coffee tokis)

### Responsive Toki Image Sizing
- **Problem**: Toki image circles were too small compared to personal chat avatars.
- **Solution**: Increased all avatar/image sizes and made toki images responsive based on image count - single images match avatar size, multiple images are slightly smaller to fit within the same container.
- **Implementation**:
  - Personal chat avatars: 60x60 (increased from 50x50)
  - Single toki image: 60x60 (same as personal chat avatars)
  - Multiple toki images: 45x45 each (slightly smaller to accommodate overlap within 60px container)
  - Overlap margin: -23px for tight, compact grouping
  - Added `tokiImageCircleSingle` style for single-image tokis
  - Logic automatically detects image count and applies appropriate sizing

### Perfect Text Alignment
- **Problem**: Text started at different positions for personal chats vs toki group chats, creating visual inconsistency.
- **Solution**: Set all avatar/image containers to exactly 60px width, ensuring text always starts at the same position.
- **Implementation**:
  - Personal chat avatar: 60x60
  - Toki image container: 60x60 (constant for all tokis)
  - Single toki images (60x60) fill the container perfectly
  - Multiple toki images (45x45 each) fit within the 60px container with overlap
  - All conversation text now starts at exactly the same horizontal position
  - Maximum 3 images displayed with "+N" badge for additional images

### Styling
- **Search Button**: Active state with purple border and background
- **Search Input**: Clean white input with shadow and rounded corners
- **Highlighted Text**: Yellow background with dark text for search matches
- **Search Summary**: Subtle gray header with clear button
- **Responsive Design**: Adapts to different screen sizes

### Future Enhancements
- Backend search integration for large datasets
- Search history and suggestions
- Advanced filters (date, unread status, etc.)
- Search analytics and metrics 