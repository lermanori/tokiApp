module.exports = {
  expo: {
    name: "Toki",
    slug: "toki",
    version: "1.0.1",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "myapp",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    runtimeVersion: "1.0.0",
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.toki.socialmap",
      buildNumber: "2",
      config: {},
      infoPlist: {
        UIBackgroundModes: ["remote-notification"]
      }
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
      permissions: [
        "android.permission.RECORD_AUDIO"
      ]
    }
  }
};

