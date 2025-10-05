# Dev User Accounts for Autofill Testing

## How to Test Autofill with Multiple Users

### 1. Create Test Accounts
Register these test accounts in your app:

**User 1 - Alice (Developer)**
- Name: Alice Johnson
- Email: alice@dev.toki.com
- Password: dev123456

**User 2 - Bob (Developer)**
- Name: Bob Smith
- Email: bob@dev.toki.com
- Password: dev123456

**User 3 - Charlie (Developer)**
- Name: Charlie Brown
- Email: charlie@dev.toki.com
- Password: dev123456

### 2. Enable Chrome Autofill
1. Open Chrome DevTools (F12)
2. Go to the "Autofill" tab
3. Check "Show test addresses in autofill menu"
4. Check "Automatically open this panel"

### 3. Test Autofill Flow
1. Go to your login page
2. Click on the email field
3. Chrome should now detect the form and show autofill suggestions
4. Select one of the test accounts
5. The password should auto-fill as well

### 4. Save Credentials
When you login with each account, Chrome will prompt to save the credentials:
- Click "Save" when prompted
- This will enable autofill for future logins

### 5. Verify Autofill Works
1. Clear the form fields
2. Click on email field again
3. You should see all saved accounts in the dropdown
4. Select any account to auto-fill both email and password

## Troubleshooting

If autofill still doesn't work:
1. Make sure you're testing on the web version (not mobile)
2. Check that the form has proper `autoComplete` attributes
3. Verify the form structure is correct
4. Try refreshing the page and testing again
