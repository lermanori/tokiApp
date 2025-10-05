# Message Scripts

This folder contains test scripts for different types of notifications and messaging features in the Toki app.

## Scripts

### 1. `test-connection-requests.sh`
**Purpose**: Tests the connection request notification flow
- Login as test@example.com
- Delete any existing connection with John
- Login as john@example.com  
- John sends connection request to test@example.com
- Fetch combined notifications for test@example.com to verify it appears

**Usage**: `./test-connection-requests.sh [BACKEND] [TEST_EMAIL] [TEST_PASS] [JOHN_EMAIL] [JOHN_PASS]`

### 2. `test-join-requests.sh`
**Purpose**: Tests the join request notification flow
- Login as test@example.com (host)
- Get test@example.com's toki ID (or create one)
- Login as john@example.com
- Clean up John from participants (if exists)
- John sends join request to test's toki
- Fetch combined notifications for test@example.com to verify it appears

**Usage**: `./test-join-requests.sh [BACKEND] [TEST_EMAIL] [TEST_PASS] [JOHN_EMAIL] [JOHN_PASS]`

### 3. `test-invite-notifications.sh`
**Purpose**: Tests the invite notification flow with actions
- Login as test@example.com (host)
- Create a private toki
- Login as john@example.com
- Clean up any existing invites/notifications
- Send invite from test to john
- Fetch combined notifications for john to verify invite appears
- Test accept/decline actions

**Usage**: `./test-invite-notifications.sh [BACKEND] [TEST_EMAIL] [TEST_PASS] [JOHN_EMAIL] [JOHN_PASS]`

### 4. `cleanup-test-data.sh`
**Purpose**: Clean up test data created during testing
- Connect to database using DATABASE_URL from toki-backend/.env
- Remove test tokis created by test@example.com
- Remove test notifications (invite, join, connection related)
- Remove test invites and participants
- Show cleanup summary with before/after counts

**Usage**: `./cleanup-test-data.sh` (run from toki-backend directory or with DATABASE_URL set)

## Default Parameters

All scripts use these defaults if not provided:
- `BACKEND`: http://localhost:3002
- `TEST_EMAIL`: test@example.com
- `TEST_PASS`: password123
- `JOHN_EMAIL`: john@example.com
- `JOHN_PASS`: password123

## Prerequisites

- Backend server running on specified URL
- Database accessible (for cleanup operations)
- Users must exist in the database
- Scripts will create test data as needed

## Features Tested

- **Connection Requests**: User-to-user connection requests and notifications
- **Join Requests**: Toki join requests and host approval workflow
- **Invite Notifications**: Private toki invites with accept/decline actions
- **Notification System**: Combined notifications endpoint
- **Database Cleanup**: Automatic cleanup of test data
- **Action Testing**: Full workflow testing including user actions
