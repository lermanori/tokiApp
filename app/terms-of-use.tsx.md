# File: terms-of-use.tsx

### Summary
This file contains the Terms of Use page displaying the complete legal terms and conditions for using the Toki application. The page includes a scrollable view with all 18 sections of the terms, covering eligibility, service nature, user accounts, content policies, event hosting and attendance, liability limitations, dispute resolution, and general provisions.

### Fixes Applied log
- **problem**: No terms of use page existed in the application, which is required for legal compliance and user agreement.
- **solution**: Created a new terms-of-use.tsx page with a scrollable view displaying the complete terms of use document. The page includes a header with back button, styled content area with proper typography, and matches the app's design system with gradient background and consistent styling.

### How Fixes Were Implemented
- **Page Structure**: Created a new screen component with SafeAreaView, LinearGradient background matching the app's design, and a header with back navigation
- **Content Display**: Implemented a ScrollView with formatted text displaying all 18 sections of the terms, including proper spacing and readability
- **Styling**: Applied consistent styling with the app's design system including:
  - Gradient background (#FFF1EB, #F3E7FF, #E5DCFF)
  - White content card with shadow and rounded corners
  - Inter font family for typography
  - Proper line height and padding for readability
- **Navigation**: Added back button in header using ArrowLeft icon from lucide-react-native, allowing users to return to previous screen
- **Content Formatting**: Stored terms content as a constant string with proper formatting including bullet points, sections, and subsections


