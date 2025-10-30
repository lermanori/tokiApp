# 🧪 Toki App Testing Guide

## 📋 Test User Credentials

### Available Test Users
All test users use the same password for simplicity:

| Email | Password | Name | Location |
|-------|----------|------|----------|
| `test@example.com` | `password123` | Test User | San Francisco, CA |
| `jane@example.com` | `password123` | Jane Doe | New York, NY |
| `john@example.com` | `password123` | John Smith | Los Angeles, CA |

## 🚀 Getting Started

### 1. Start the Backend
```bash
cd toki-backend
npm run dev
```
Backend will be available at: `http://localhost:3002`

### 2. Start the Frontend
```bash
# In a new terminal
cd tokiApp
npm start
```
Frontend will be available at: `http://localhost:8081` (or 8082 if 8081 is busy)

## 🧪 Testing Scenarios

### Authentication Flow
1. **Open the app** - Should redirect to login screen
2. **Login with test credentials**:
   - Email: `test@example.com`
   - Password: `password123`
3. **Verify successful login** - Should redirect to main app
4. **Test logout** - Should return to login screen

### User Registration
1. **Switch to Register mode** on login screen
2. **Fill in registration form**:
   - Name: `New Test User`
   - Email: `newuser@example.com`
   - Password: `password123`
3. **Submit registration** - Should show success message
4. **Login with new account** - Should work immediately

### Toki Discovery
1. **Browse the Explore tab** - Should show 5 sample Tokis
2. **View Toki details** - Tap on any Toki to see full details
3. **Test search functionality** - Search for "coffee" or "yoga"
4. **Test filtering** - Filter by category or time slot

### Sample Tokis Available
- ☕ **Coffee & Code Meetup** - Blue Bottle Coffee, San Francisco
- 🧘 **Morning Yoga in the Park** - Golden Gate Park, San Francisco
- 🎲 **Board Game Night** - Game Parlor, San Francisco
- 📸 **Photography Walk** - Fisherman's Wharf, San Francisco
- 🍷 **Tech Networking Happy Hour** - The View Lounge, San Francisco

### Creating Tokis
1. **Navigate to Create tab**
2. **Fill in Toki details**:
   - Title: `Test Activity`
   - Description: `This is a test activity`
   - Location: `Test Location`
   - Category: Choose any category
   - Time: Choose any time slot
   - Max Attendees: `10`
3. **Submit creation** - Should appear in Explore tab
4. **Verify in backend** - Check database for new Toki

### Profile Management
1. **Go to Profile tab**
2. **View current user info** - Should show authenticated user data
3. **Edit profile** - Update bio, location, or social links
4. **Save changes** - Should persist to backend
5. **View user stats** - Should show Tokis created/joined

### Connection System
1. **Search for users** - Use the search functionality
2. **Send connection request** - To another test user
3. **Switch to another account** - Login as `jane@example.com`
4. **Check pending requests** - Should see connection request
5. **Accept/decline request** - Test both scenarios

## 🔧 API Testing

### Test Backend Health
```bash
curl http://localhost:3002/api
```
Should return: `{"message":"Toki API is running!","version":"1.0.0",...}`

### Test Authentication
```bash
# Login
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Test Toki Retrieval
```bash
# Get all Tokis
curl http://localhost:3002/api/tokis

# Get specific Toki (replace ID)
curl http://localhost:3002/api/tokis/[TOKI_ID]
```

## 🐛 Common Issues & Solutions

### Frontend Issues
1. **Login not working**
   - Check backend is running on port 3002
   - Verify credentials are correct
   - Check browser console for errors

2. **Tokis not loading**
   - Verify backend connection
   - Check if sample data was created
   - Look for API errors in console

3. **Authentication state issues**
   - Clear browser storage
   - Restart the app
   - Check token expiration

### Backend Issues
1. **Database connection errors**
   - Verify Railway database is accessible
   - Check environment variables
   - Restart backend server

2. **API errors**
   - Check server logs
   - Verify database schema
   - Test individual endpoints

## 📊 Expected Data

### Users in Database
- 3 test users with known passwords
- All users have basic profile information
- Users are ready for connection testing

### Tokis in Database
- 5 sample Tokis with different categories
- All Tokis have tags and location data
- Tokis are hosted by test users

### Database Tables
- `users` - User accounts and profiles
- `tokis` - Activity/Toki data
- `toki_tags` - Tags for Tokis
- `user_connections` - User connection relationships
- `user_social_links` - Social media links
- `user_stats` - User activity statistics

## 🎯 Success Criteria

### ✅ Authentication
- [ ] Can register new users
- [ ] Can login with existing users
- [ ] Authentication persists across app restarts
- [ ] Logout works correctly

### ✅ Toki Management
- [ ] Can view existing Tokis
- [ ] Can create new Tokis
- [ ] Can search and filter Tokis
- [ ] Toki data persists in backend

### ✅ User Features
- [ ] Can view and edit profile
- [ ] Can see user statistics
- [ ] Can manage connections
- [ ] Profile changes persist

### ✅ Integration
- [ ] Frontend connects to backend
- [ ] Data flows correctly
- [ ] Error handling works
- [ ] Offline fallback functions

## 🚀 Next Steps After Testing

1. **Test all features** using the scenarios above
2. **Report any bugs** found during testing
3. **Continue development** of remaining features
4. **Add more test data** as needed

## 📞 Support

If you encounter issues:
1. Check the console logs for errors
2. Verify both frontend and backend are running
3. Test individual API endpoints
4. Check database connectivity

Happy testing! 🎉 