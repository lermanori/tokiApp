# File: utils/discoverTypes.ts

### Summary
TypeScript interfaces for Discover screen data structures including TokiEvent, DiscoverFilters, and MapRegion.

### Fixes Applied log
- **problem**: TokiEvent interface didn't include friendsGoing field, causing TypeScript errors and preventing friends overlay from displaying.
- **solution**: Added `friendsGoing?: Array<{ id: string; name: string; avatar?: string }>` to TokiEvent interface to support friends attending data.

### How Fixes Were Implemented
- **problem**: Friends data from backend was being mapped in AppContext but lost when transforming to TokiEvent format.
- **solution**: Added friendsGoing field to TokiEvent interface to match the data structure used by TokiCard component, allowing friends overlay to display correctly throughout the discover screen.

- **problem**: joinStatus type included 'joined' status which was deprecated in favor of 'approved'.
- **solution**: Removed 'joined' from joinStatus type definition, standardizing on 'not_joined', 'pending', and 'approved' as the only valid statuses.
