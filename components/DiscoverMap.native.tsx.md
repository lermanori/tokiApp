# File: components/DiscoverMap.native.tsx

### Summary
This file contains the native (iOS/Android) version of the DiscoverMap component that displays interactive maps with event markers using react-native-maps.

### Fixes Applied log
- **Changed map marker backgrounds to white**: Updated marker styling to use white background with colored borders instead of colored backgrounds.
- **Updated pinColor**: Changed pinColor from category-based colors to white for consistency.
- **Added default icon system**: Created fallback system for categories without specific icons.
- **Added debugging logs**: Added console logs to help identify icon loading issues.

### How Fixes Were Implemented
- **Background color**: Changed `backgroundColor: getCategoryColorForMap(group.items[0].category)` to `backgroundColor: '#FFFFFF'`
- **Border color**: Changed `borderColor: '#FFFFFF'` to `borderColor: getCategoryColorForMap(group.items[0].category)`
- **Pin color**: Changed `pinColor={getCategoryColorForMap(group.items[0].category)}` to `pinColor={'#FFFFFF'}`
- **Default icon system**: Added `DEFAULT_CATEGORY_ICON` import and fallback logic for missing icons
- **Debugging**: Added console logs to track category rendering and icon loading
- **Visual consistency**: All markers now have white backgrounds with category-colored borders for better visual consistency across the map