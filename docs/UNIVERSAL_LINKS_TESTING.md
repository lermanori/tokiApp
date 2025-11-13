# Testing Universal Links Before iOS App Deployment

This guide explains how to test universal links for your Toki app before deploying to the App Store.

## Prerequisites

- Your web app deployed at `https://toki-app.com`
- The `apple-app-site-association` file accessible at `https://toki-app.com/.well-known/apple-app-site-association`
- A development build of your iOS app installed on a device or simulator

## Step 1: Verify AASA File is Accessible

First, ensure your AASA file is properly deployed and accessible:

```bash
# Test from command line
curl -I https://toki-app.com/.well-known/apple-app-site-association

# Should return:
# Content-Type: application/json (or application/pkcs7-mime)
# Status: 200 OK
```

**Important Requirements:**
- ✅ Must be served over HTTPS
- ✅ Must return `Content-Type: application/json` (or `application/pkcs7-mime`)
- ✅ Must be accessible without authentication
- ✅ Must be at `/.well-known/apple-app-site-association` (no file extension)
- ✅ Must be valid JSON

## Step 2: Validate AASA File Format

Use Apple's online validator or check manually:

### Option A: Apple's Validator (Recommended)
Visit: https://search.developer.apple.com/appsearch-validation-tool/

Enter your domain: `toki-app.com`

### Option B: Manual Validation
Check that your file matches this structure:

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "PA7L4ZHG8D.com.toki.socialmap",
        "paths": [
          "/toki-details*",
          "/join/*",
          "/user-profile/*"
        ]
      }
    ]
  }
}
```

**Note:** The `appID` format is `{TeamID}.{BundleID}`. Your Team ID is `PA7L4ZHG8D` and Bundle ID is `com.toki.socialmap`.

## Step 3: Build iOS App for Testing

You need to install the app on a device/simulator to test universal links. You have two options:

### Option A: EAS Build (Development Build)

```bash
# Build for development
eas build --profile development --platform ios

# Or for internal distribution (TestFlight-like)
eas build --profile preview --platform ios
```

After the build completes:
1. Download the `.ipa` file
2. Install on your device using:
   - **Xcode**: Window → Devices and Simulators → Drag `.ipa` to device
   - **Apple Configurator 2**: Install app on device
   - **TestFlight**: Upload to TestFlight and install via TestFlight app

### Option B: Local Development Build

```bash
# Build locally (requires Xcode)
npx expo run:ios

# Or for a specific device
npx expo run:ios --device
```

## Step 4: Test Universal Links

### Method 1: Notes App (Easiest)

1. Open the **Notes** app on your iOS device
2. Type or paste a universal link, for example:
   ```
   https://toki-app.com/join/ABC123
   ```
3. **Long-press** the link
4. You should see an option to **"Open in Toki"** (if the app is installed and AASA is valid)

### Method 2: Safari Browser

1. Open **Safari** on your iOS device
2. Navigate to: `https://toki-app.com/join/ABC123`
3. If the app is installed and AASA is valid, you should see:
   - A banner at the top saying "Open in Toki"
   - Or a prompt asking to open in the app

### Method 3: Messages App

1. Send yourself a message with a universal link:
   ```
   https://toki-app.com/join/ABC123
   ```
2. Tap the link
3. It should open directly in the Toki app (if installed)

### Method 4: Command Line (Simulator)

If testing on a simulator, you can use `xcrun simctl`:

```bash
# Open a universal link in the simulator
xcrun simctl openurl booted "https://toki-app.com/join/ABC123"
```

Replace `booted` with your simulator's UDID if needed.

## Step 5: Debug Universal Links

If universal links aren't working, check the following:

### Check AASA File Caching

iOS caches the AASA file. To force a refresh:

1. **On Device:**
   - Settings → Developer → Associated Domains Development (if available)
   - Or delete and reinstall the app

2. **Via Command Line (Simulator):**
   ```bash
   # Clear AASA cache
   xcrun simctl privacy booted reset all
   ```

### Verify App Configuration

Check that your app's `Info.plist` includes the associated domain:

```xml
<key>com.apple.developer.associated-domains</key>
<array>
  <string>applinks:toki-app.com</string>
</array>
```

This should be automatically configured by Expo based on your `app.config.js`.

### Check Console Logs

1. Connect your device to Xcode
2. Window → Devices and Simulators
3. Select your device
4. Click "Open Console"
5. Filter for "swcd" (Smart Web Content Daemon) to see AASA validation logs

### Test AASA File Directly

```bash
# Check if file is accessible
curl https://toki-app.com/.well-known/apple-app-site-association

# Check content type
curl -I https://toki-app.com/.well-known/apple-app-site-association | grep -i content-type

# Should show: Content-Type: application/json
```

## Step 6: Test Web Fallback

When the app is **not installed**, links should open in Safari/web:

1. Uninstall the app from your device
2. Open a universal link (e.g., in Messages or Notes)
3. It should open in Safari and show your web app

This ensures your web deployment works correctly as a fallback.

## Common Issues & Solutions

### Issue: "Open in Toki" doesn't appear

**Solutions:**
- ✅ Verify AASA file is accessible over HTTPS
- ✅ Check that Content-Type is `application/json`
- ✅ Ensure the app is installed and associated domain is configured
- ✅ Clear AASA cache (reinstall app or use developer settings)
- ✅ Wait a few minutes (iOS caches AASA files)

### Issue: Link opens in Safari instead of app

**Solutions:**
- ✅ Check that the path matches your AASA configuration (`/join/*`, `/toki-details*`, etc.)
- ✅ Verify the app is installed
- ✅ Check that you're using HTTPS (not HTTP)
- ✅ Ensure the link is tapped (not long-pressed) in Messages/Notes

### Issue: AASA file returns 404

**Solutions:**
- ✅ Ensure the file is in `public/.well-known/apple-app-site-association`
- ✅ Check your deployment configuration serves static files from `public/`
- ✅ Verify the file is deployed to production
- ✅ Check server configuration allows `.well-known` directory access

## Testing Checklist

Before deploying to App Store:

- [ ] AASA file is accessible at `https://toki-app.com/.well-known/apple-app-site-association`
- [ ] AASA file returns correct Content-Type header
- [ ] AASA file contains valid JSON with correct appID
- [ ] App builds and installs successfully on device
- [ ] Universal links open in app when app is installed
- [ ] Universal links open in Safari when app is not installed
- [ ] All configured paths work (`/join/*`, `/toki-details*`, `/user-profile/*`)
- [ ] Deep link routing works correctly in the app

## Additional Resources

- [Apple Universal Links Documentation](https://developer.apple.com/documentation/xcode/supporting-universal-links-in-your-app)
- [AASA File Format](https://developer.apple.com/documentation/xcode/supporting-universal-links-in-your-app#create-an-apple-app-site-association-file)
- [Expo Universal Links Guide](https://docs.expo.dev/guides/linking/)

