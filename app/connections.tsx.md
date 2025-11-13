# File: app/connections.tsx

### Summary
Connections screen displaying user connections, pending requests, and blocked users. Now uses global state instead of local state for connections, pending connections, and blocked users.

### Fixes Applied log
- problem: Connections screen maintained local state for connections, pendingConnections, and blockedUsers, causing duplicate API calls and inconsistent state across screens.
- solution: Removed local state and updated to use global state (state.connections, state.pendingConnections, state.blockedUsers). Added transformation helper function to convert backend format to display format.

### How Fixes Were Implemented
- Removed `const [connections, setConnections] = useState<Connection[]>([]);`
- Removed `const [pendingConnections, setPendingConnections] = useState<any[]>([]);`
- Removed `const [blockedUsers, setBlockedUsers] = useState<any[]>([]);`
- Added `getTransformedConnections()` helper function to transform global state connections to display format.
- Updated `loadConnections()` and `loadPendingConnections()` to call actions which update global state.
- Updated `loadBlockedUsers()` to use `actions.loadBlockedUsers()`.
- Updated all references to use `state.connections`, `state.pendingConnections`, and `state.blockedUsers`.
- Updated `getUnifiedResults()` to use transformed connections from global state.
