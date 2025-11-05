# Push Notifications Testing Guide

## ✅ Setup Complete

The push notification system is now fully implemented:
- ✅ Database migration completed (`push_tokens` table created)
- ✅ Client-side token registration implemented
- ✅ Backend push sending infrastructure ready
- ✅ All notification events wired to send pushes

## 🧪 Testing Steps

### 1. Test Token Registration

1. **Start the backend server** (if not already running):
   ```bash
   cd toki-backend
   npm run dev
   ```

2. **Build and run the app on a physical device** (simulators don't support push notifications):
   ```bash
   cd /Users/orilerman/Desktop/tokiApp
   npx expo run:ios  # or npx expo run:android
   ```

3. **Login to the app** - The app will automatically:
   - Request push notification permissions
   - Register the device token with the backend
   - Store it in the `push_tokens` table

4. **Verify token registration**:
   - Check backend logs for successful `/api/push/register` requests
   - Or query the database:
     ```sql
     SELECT * FROM push_tokens WHERE user_id = 'your-user-id';
     ```

### 2. Test Push Notifications via API

You can test push notifications using the test endpoint:

```bash
curl -X POST http://localhost:3002/api/push/send-test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

This will send a test notification to all devices registered for your user.

### 3. Test Real-World Scenarios

#### Test Connection Request Push
1. User A sends a connection request to User B
2. **Expected**: User B receives push notification: "New Connection Request - [User A] sent you a connection request"

#### Test Connection Accept Push
1. User B accepts User A's connection request
2. **Expected**: User A receives push notification: "[User B] accepted your connection request"

#### Test Toki Invite Push
1. User A invites User B to a Toki
2. **Expected**: User B receives push notification: "New Toki Invite - You've been invited to join '[Toki Name]' by [User A]"

#### Test Join Request Push
1. User A requests to join a Toki hosted by User B
2. **Expected**: User B (host) receives push notification: "New Join Request - [User A] wants to join your [Toki Name] event"

#### Test Join Approval Push
1. User B (host) approves User A's join request
2. **Expected**: User A receives push notification: "Join Request Approved - You can now join '[Toki Name]'"

#### Test Join Decline Push
1. User B (host) declines User A's join request
2. **Expected**: User A receives push notification: "Join Request Declined - Your request to join '[Toki Name]' was declined"

### 4. Test Foreground Notifications

1. **Keep the app open** (in foreground)
2. Trigger any of the above events
3. **Expected**: Notification banner appears at the top of the screen (thanks to `configureForegroundNotificationHandler`)

### 5. Test Background Notifications

1. **Minimize the app** (send to background)
2. Trigger any of the above events
3. **Expected**: OS notification banner appears (iOS/Android native notification)

## 🔍 Troubleshooting

### Token Not Registering
- **Check**: Device must be physical (not simulator)
- **Check**: Permissions granted in device settings
- **Check**: Backend logs for registration errors
- **Check**: Database connection is working

### Push Not Received
- **Check**: Token is valid Expo format (starts with `ExponentPushToken[...]`)
- **Check**: Backend can reach Expo Push Notification Service
- **Check**: Device has internet connection
- **Check**: User hasn't disabled notifications in device settings

### Foreground Notifications Not Showing
- **Check**: `configureForegroundNotificationHandler()` is called after login
- **Check**: App state is "active" (not backgrounded)

## 📊 Verification Queries

### Check registered tokens
```sql
SELECT pt.*, u.name, u.email 
FROM push_tokens pt 
JOIN users u ON pt.user_id = u.id;
```

### Check notification history
```sql
SELECT * FROM notifications 
WHERE user_id = 'your-user-id' 
ORDER BY created_at DESC 
LIMIT 10;
```

## 🚀 Production Checklist

Before deploying to production:

- [ ] Test on both iOS and Android devices
- [ ] Configure EAS credentials for APNs (iOS) and FCM (Android)
- [ ] Set up proper error handling and logging for failed pushes
- [ ] Test with multiple devices per user
- [ ] Verify token cleanup on logout
- [ ] Monitor push delivery rates
- [ ] Set up alerts for high push failure rates

## 📝 Notes

- Push notifications only work on **physical devices** (not simulators)
- iOS requires EAS build with proper APNs credentials
- Android requires FCM configuration (handled automatically by Expo when configured)
- Tokens are automatically registered on login, no manual action needed
- Multiple devices per user are supported (each device has its own token)

