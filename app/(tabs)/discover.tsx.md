# File: discover.tsx

### Summary
The Discover screen is the main screen for browsing and discovering Toki events. It displays events on a map and in a list view, with filtering and search capabilities. This file has been refactored to be smaller, more maintainable, and easier to understand.

### Refactoring Applied
- **Problem**: The original file was 1867 lines long, making it difficult to maintain and understand.
- **Solution**: Extracted functionality into smaller, focused modules:
  - **Types**: Moved `TokiEvent` and related interfaces to `utils/discoverTypes.ts`
  - **Helpers**: Extracted filtering logic and utility functions to `utils/discoverHelpers.ts`
  - **Hooks**: Created custom hooks for data management (`useDiscoverData`) and filtering (`useDiscoverFilters`)
  - **Components**: Extracted header (`DiscoverHeader`) and categories (`DiscoverCategories`) into separate components
  - **Main File**: Reduced from 1867 lines to ~280 lines, focusing on orchestration and UI composition

### How Refactoring Was Implemented

#### 1. Type Extraction (`utils/discoverTypes.ts`)
- Moved `TokiEvent` interface and related types to a dedicated types file
- Created `DiscoverFilters` and `MapRegion` interfaces for better type safety

#### 2. Helper Functions (`utils/discoverHelpers.ts`)
- Extracted `transformTokiToEvent` function for data transformation
- Moved complex filtering logic to `filterEvents` function
- Extracted `getJoinStatusText` and `getJoinStatusColor` helper functions

#### 3. Custom Hooks
- **`useDiscoverData`**: Manages all data loading, state management, and API calls
  - Handles event transformation from backend data
  - Manages map region state
  - Handles pagination and infinite scroll
  - Manages user connections loading
- **`useDiscoverFilters`**: Manages filtering state and logic
  - Handles search query, category selection, and filter state
  - Computes filtered events using memoization

#### 4. Component Extraction
- **`DiscoverHeader`**: Extracted header with refresh, map toggle, and filter buttons
- **`DiscoverCategories`**: Extracted category selection UI into a reusable component

#### 5. Main File Simplification
- Removed all inline helper functions and complex logic
- Uses custom hooks for data and filtering management
- Uses extracted components for UI sections
- Focuses on event handlers and UI composition
- Reduced from 1867 lines to ~280 lines (85% reduction)

### Benefits
- **Maintainability**: Smaller files are easier to understand and modify
- **Reusability**: Extracted components and hooks can be reused elsewhere
- **Testability**: Isolated functions and hooks are easier to test
- **Performance**: Better code splitting and memoization opportunities
- **Context Management**: Smaller files reduce context window usage

### Files Created
- `utils/discoverTypes.ts` - Type definitions
- `utils/discoverHelpers.ts` - Helper functions and filtering logic
- `hooks/useDiscoverData.ts` - Data loading and state management hook
- `hooks/useDiscoverFilters.ts` - Filtering state management hook
- `components/DiscoverHeader.tsx` - Header component
- `components/DiscoverCategories.tsx` - Categories component

