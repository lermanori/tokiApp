# Building and Submitting iOS App Without Expo/EAS

This guide explains how to build and submit your iOS app to the App Store using Xcode directly, without using Expo's EAS Build service.

## Prerequisites

1. **Xcode** installed (latest version recommended)
2. **Apple Developer Account** with App Store Connect access
3. **Valid provisioning profiles and certificates** set up in Xcode
4. **CocoaPods** installed (`sudo gem install cocoapods`)

## Step 1: Install Dependencies

```bash
cd ios
pod install
cd ..
```

## Step 2: Open Project in Xcode

```bash
open ios/Toki.xcworkspace
```

**Important**: Always open the `.xcworkspace` file, NOT the `.xcodeproj` file.

## Step 3: Configure Signing & Capabilities

1. In Xcode, select the **Toki** project in the navigator
2. Select the **Toki** target
3. Go to **Signing & Capabilities** tab
4. Select your **Team** (Apple Developer account)
5. Ensure **Bundle Identifier** is `com.toki.socialmap`
6. Xcode will automatically manage provisioning profiles

## Step 4: Update Build Number (if needed)

In `app.config.js`, the build number is currently `3`. You may need to increment it:
- Version: `1.0.10` (this is the user-facing version)
- Build Number: `3` (this must be unique and incrementing for each App Store submission)

## Step 5: Build for Release

### Option A: Using Xcode GUI

1. In Xcode, select **Product → Scheme → Toki**
2. Select **Any iOS Device** or a connected device (not a simulator)
3. Go to **Product → Archive**
4. Wait for the archive to complete

### Option B: Using Command Line

```bash
# Build and archive from command line
xcodebuild -workspace ios/Toki.xcworkspace \
  -scheme Toki \
  -configuration Release \
  -archivePath ios/build/Toki.xcarchive \
  archive \
  CODE_SIGN_IDENTITY="Apple Development" \
  DEVELOPMENT_TEAM="YOUR_TEAM_ID"
```

Replace `YOUR_TEAM_ID` with your Apple Developer Team ID (found in Apple Developer portal).

## Step 6: Validate Archive

1. After archiving, Xcode Organizer will open automatically
2. Select your archive
3. Click **Validate App**
4. Fix any validation errors if they appear

## Step 7: Submit to App Store

### Option A: Using Xcode Organizer (Recommended)

1. In Xcode Organizer, select your archive
2. Click **Distribute App**
3. Select **App Store Connect**
4. Choose **Upload**
5. Follow the wizard:
   - Select distribution options
   - Review app information
   - Upload to App Store Connect

### Option B: Using Command Line (xcrun altool)

```bash
# Upload using altool (requires App Store Connect API key or app-specific password)
xcrun altool --upload-app \
  --type ios \
  --file "ios/build/Toki.ipa" \
  --apiKey YOUR_API_KEY \
  --apiIssuer YOUR_ISSUER_ID
```

### Option C: Using Transporter App

1. Export the archive as an `.ipa` file from Xcode Organizer
2. Open **Transporter** app (from Mac App Store)
3. Drag and drop the `.ipa` file
4. Click **Deliver**

## Step 8: Complete Submission in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to your app
3. Go to the **TestFlight** or **App Store** tab
4. Wait for processing to complete (can take 10-30 minutes)
5. Submit for review when ready

## Troubleshooting

### Build Errors

- **Pod issues**: Run `cd ios && pod install && cd ..`
- **Signing errors**: Check your Team selection and provisioning profiles in Xcode
- **Missing dependencies**: Ensure all CocoaPods are installed

### Archive Issues

- Make sure you're building for **Release** configuration
- Ensure you're not building for a simulator (must be a device)
- Check that all required capabilities are enabled

### Submission Errors

- Verify your Apple Developer account has App Store Connect access
- Ensure your app's metadata is complete in App Store Connect
- Check that the bundle identifier matches exactly

## Alternative: Using Expo CLI (Still Local Build)

You can also use Expo CLI to build locally without EAS:

```bash
# This still uses Expo but builds on your machine
npx expo run:ios --configuration Release --device
```

Then archive and submit through Xcode as described above.

## Notes

- Building locally requires a Mac with Xcode
- The build process can take 10-30 minutes depending on your machine
- You'll need to manage code signing and certificates yourself
- Updates to native code require rebuilding and resubmitting

