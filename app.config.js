module.exports = {
  expo: {
    name: "Toki",
    slug: "toki",
    version: "1.2.2",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "tokimap",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    runtimeVersion: "1.0.1",
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.toki.socialmap",
      buildNumber: "7",
      usesAppleSignIn: true,
      config: {},
      infoPlist: {
        UIBackgroundModes: ["remote-notification"],
        NSLocationWhenInUseUsageDescription: "Your location is used to show nearby scenes and events on the map and help you discover what's happening around you.",
        NSLocationAlwaysUsageDescription: "Your location is used to show nearby scenes and events on the map and help you discover what's happening around you.",
        NSCameraUsageDescription: "The camera is used to take profile photos and to capture photos when creating or uploading an event, for example when adding images during event setup.",
        NSPhotoLibraryUsageDescription: "The photo library is used to select profile photos or photos to upload when creating or uploading an event.",
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: [
              "com.googleusercontent.apps.637006267798-43d8irdorehl3sedc7btq6r1pt2hfhs3"
            ]
          }
        ]
      },
      associatedDomains: [
        "applinks:toki-app.com"
      ]
    },
    web: {
      bundler: "metro",
      output: "single",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      "expo-font",
      "expo-web-browser",
      "expo-notifications",
      "expo-apple-authentication",
      [
        "expo-image-picker",
        {
          photosPermission: "The app accesses your photos to let you share them with your friends."
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      EXPO_PUBLIC_API_URL: 'https://backend-production-d8ec.up.railway.app',
      // Google OAuth client IDs
      GOOGLE_WEB_CLIENT_ID: process.env.GOOGLE_WEB_CLIENT_ID || '637006267798-fto4pgl9cpqktdn7sgl7t54dd2dbdpld.apps.googleusercontent.com',
      GOOGLE_IOS_CLIENT_ID: process.env.GOOGLE_IOS_CLIENT_ID || '637006267798-43d8irdorehl3sedc7btq6r1pt2hfhs3.apps.googleusercontent.com',
      router: {},
      eas: {
        projectId: "41a24d0b-1d53-429a-8753-acd4a5b9972c"
      }
    },
    splash: {
      image: "./assets/images/splash.png",
      resizeMode: "contain",
      backgroundColor: "#000000"
    },
    owner: "lermanori",
    updates: {
      url: "https://u.expo.dev/41a24d0b-1d53-429a-8753-acd4a5b9972c",
      checkAutomatically: "ON_ERROR_RECOVERY",
      fallbackToCacheTimeout: 0
    },
    android: {
      versionCode: 5,
      permissions: [
        "android.permission.RECORD_AUDIO"
      ]
    }
  }
};

