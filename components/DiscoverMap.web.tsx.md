# File: components/DiscoverMap.web.tsx

### Summary
This file contains the web version of the DiscoverMap component that displays interactive maps with event markers using Leaflet.

### Fixes Applied log
- **Changed map marker backgrounds to white**: Updated marker styling to use white background with colored borders instead of colored backgrounds.

### How Fixes Were Implemented
- **Background color**: Changed `background-color: ${getCategoryColorForMap(group.items[0].category)}` to `background-color: #FFFFFF`
- **Border color**: Changed `border: 3px solid white` to `border: 3px solid ${getCategoryColorForMap(group.items[0].category)}`
- **Visual consistency**: All markers now have white backgrounds with category-colored borders for better visual consistency across the map