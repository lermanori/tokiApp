# File: _layout.tsx

### Summary
This file defines the bottom tab navigation layout for the Toki app, implementing responsive design that adapts to different screen sizes.

### Fixes Applied log
- **problem**: Fixed import path for AppContext from '../context/AppContext' to '../../contexts/AppContext'
- **solution**: Corrected the relative path to match the actual file structure
- **problem**: Fixed totalUnreadCount property access by calculating it from conversations and tokiGroupChats arrays
- **solution**: Implemented proper calculation using reduce() on state.conversations and state.tokiGroupChats

### How Fixes Were Implemented
- **Responsive Design**: Implemented useWindowDimensions hook for real-time screen size detection
- **Dynamic Styling**: Created getResponsiveStyles() function that returns different values based on screen width:
  - Small screens (< 375px): tabBarHeight: 50, iconSize: 20, fontSize: 10, padding: 6, unreadDotSize: 6
  - Medium screens (375px - 414px): tabBarHeight: 60, iconSize: 24, fontSize: 12, padding: 8, unreadDotSize: 8
  - Large screens (> 414px): tabBarHeight: 70, iconSize: 26, fontSize: 14, padding: 10, unreadDotSize: 10
- **Dynamic Tab Bar**: Applied responsive styles to tabBarStyle, tabBarLabelStyle, and individual tab icons
- **Unread Count**: Properly calculated total unread messages from conversations and tokiGroupChats arrays
- **Enhanced Styling**: Added shadow effects and improved visual appearance with elevation and shadow properties
