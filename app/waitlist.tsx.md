# File: waitlist.tsx

### Summary
This file implements the waitlist screen for native platforms, allowing users to join the waitlist with their contact information.

### Fixes Applied log
- **Problem**: Phone input layout was glitching on very small screens due to inflexible flex layout.
- **Solution**: Improved responsive layout with proper min/max width constraints and better flex properties.
- **Problem**: Waitlist screen had plain white background instead of the attractive gradient used in login screen.
- **Solution**: Applied the same gradient background (`['rgb(255, 241, 235)', 'rgb(243, 231, 255)', 'rgb(229, 220, 255)']`) to the entire waitlist screen for visual consistency.

### How Fixes Were Implemented
- **Problem**: The original phone input used `flexBasis: 100` for country code and `flex: 1` for phone number, which caused layout issues on small screens.
- **Solution**: 
  - Created separate `phoneField` and `phoneContainer` styles for better structure
  - Added `countryCodeInput` style with `minWidth: 80`, `maxWidth: 100`, and `flex: 0` to prevent it from taking too much space
  - Added `phoneNumberInput` style with `flex: 1` to take remaining space
  - Added proper `gap: 8` and `alignItems: 'center'` for consistent spacing and alignment
  - Reduced padding on country code input (`paddingHorizontal: 12` vs `14`) to optimize space usage

### Technical Details
- **Responsive Design**: Country code field has fixed width constraints to prevent layout breaking
- **Flex Layout**: Phone number field takes remaining space while country code maintains consistent size
- **Spacing**: Consistent 8px gap between inputs with proper alignment
- **Cross-platform**: Works consistently across different screen sizes on native platforms
- **Gradient Background**: Applied the same gradient colors from login screen (`['rgb(255, 241, 235)', 'rgb(243, 231, 255)', 'rgb(229, 220, 255)']`) to create visual consistency across the app
