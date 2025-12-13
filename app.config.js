module.exports = {
  expo: {
    name: "Toki",
    slug: "toki",
    version: "1.0.16",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "tokimap",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    runtimeVersion: "1.0.1",
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.toki.socialmap",
      buildNumber: "5",
      config: {},
      infoPlist: {
        UIBackgroundModes: ["remote-notification"],
        NSLocationWhenInUseUsageDescription: "Your location is used to show nearby scenes and events on the map and help you discover what's happening around you.",
        NSLocationAlwaysUsageDescription: "Your location is used to show nearby scenes and events on the map and help you discover what's happening around you."
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
      url: "https://u.expo.dev/41a24d0b-1d53-429a-8753-acd4a5b9972c"
    },
    android: {
      versionCode: 5,
      permissions: [
        "android.permission.RECORD_AUDIO"
      ]
    }
  }
};

