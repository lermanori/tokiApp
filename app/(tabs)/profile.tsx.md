# File: app/(tabs)/profile.tsx

### Summary
Profile screen displaying user information, stats, and navigation to various sections. Now uses global state for notification count and saved tokis count instead of local state.

### Fixes Applied log
- problem: Profile page maintained local state for unreadNotifications and savedTokisCount, causing inconsistencies when notifications were marked as read or tokis were saved/unsaved.
- solution: Removed local state variables and functions. Updated UI to read directly from global state (state.unreadNotificationsCount and state.savedTokis.length).
- problem: ReferenceError in refreshUserData - calls to non-existent functions `loadUnreadNotificationsCount()` and `loadSavedTokisCount()`.
- solution: Replaced with correct AppContext actions: `actions.loadNotifications()` and `actions.getSavedTokis()`.
- problem: `refreshUserData()` was calling `loadTokis()` which makes unnecessary calls to `/api/tokis` endpoint instead of using the centralized `/api/tokis/nearby` route.
- solution: Removed `loadTokis()` call from `refreshUserData()` since user stats are already updated via `loadCurrentUser()` and don't require loading all tokis.
- problem: Large amount of unused code including unused imports, state variables, functions, and styles from removed features (achievements, enhanced stats, profile completion).
- solution: Removed all unused code to clean up the file and improve maintainability.

### How Fixes Were Implemented
- Removed `const [unreadNotifications, setUnreadNotifications] = useState(0);`
- Removed `const [savedTokisCount, setSavedTokisCount] = useState(0);`
- Removed `loadUnreadNotificationsCount()` and `loadSavedTokisCount()` functions.
- Updated notification count display to use `state.unreadNotificationsCount || 0`.
- Updated saved tokis count display to use `state.savedTokis.length > 0 ? state.savedTokis.length : '-'`.
- Removed `loadSavedTokisCount()` call from useFocusEffect.
- Fixed `refreshUserData()` function: replaced `await loadUnreadNotificationsCount()` with `await actions.loadNotifications()`.
- Fixed `refreshUserData()` function: replaced `await loadSavedTokisCount()` with `await actions.getSavedTokis()`.
- Removed unused imports: `Image` from react-native, `Trash2` from lucide-react-native, `getBackendUrl` from services/config.
- Removed unused state variable: `previewAsMember`.
- Removed unused functions: `calculateProfileCompletion()`, `formatMemberSince()`, `calculateTotalUnreadCount()`, `renderAchievementBadge()`, `getStatCardColor()`, `renderStatCard()`.
- Removed unused styles: `profileImage`, `enhancedStatsContainer`, `statRow`, `statCard`, `statCardNumber`, `statCardLabel`, `statCardSubtext`, `profileCompletionContainer`, `progressBar`, `progressFill`, `verificationContainer`, `messagingStatsContainer`, `achievementsContainer`, `badgesRow`, `badgeItem`, `badgeIconContainer`, `achievedBadge`, `badgeContent`, `badgeTitle`, `badgeDescription`.
- Fixed linter error: Added missing `description` property to TokiCard component in My Activity section.

- problem: When pressing the "Tokis Joined" stat counter, it navigated to the My Tokis page but always showed the "Hosting" tab instead of the "Joined" tab.
- solution: Created separate navigation handlers `handleTokisJoined()` and `handleTokisCreated()` that pass a `tab` parameter to the My Tokis screen. Updated the stat counter buttons to use these specific handlers instead of the generic `handleMyTokis()`.
- problem: Sync Data option in Support section was not needed.
- solution: Removed the "Sync Data" menu item from the Support section and removed the unused `Settings` icon import from lucide-react-native.
