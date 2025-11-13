# File: app/(tabs)/index.tsx

### Summary
Explore screen - now redirects to exMap since exMap is the main explore screen. The original explore functionality has been moved to exMap.

### Fixes Applied log
- problem: Index route was the old explore screen, but exMap is now the main explore screen.
- solution: Replaced entire component with a simple redirect to exMap.

### How Fixes Were Implemented
- Removed all explore screen code.
- Added useEffect that redirects to '/(tabs)/exMap' on mount.
- Returns null since it's just a redirect component.
