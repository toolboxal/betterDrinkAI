export default {
  expo: {
    name: 'BetterDrinkAI',
    slug: 'betterDrinkAI',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'betterdrinkai',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.alvindevapps.betterdrinkai',
      appleTeamId: 'C2GV7H83QS',
      usesAppleSignIn: true,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#ffffffff',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: 'com.alvindevapps.betterdrinkai',
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
          dark: {
            backgroundColor: '#000000',
          },
        },
      ],
      [
        'expo-camera',
        {
          cameraPermission:
            'Allow $(PRODUCT_NAME) to access your camera to take photos of your drinks.',
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission:
            'Allow $(PRODUCT_NAME) to access your photos to upload pictures of your drinks.',
        },
      ],
      [
        'expo-media-library',
        {
          photosPermission:
            'Allow $(PRODUCT_NAME) to access your photo library so you can select and track previous drink photos.',
          savePhotosPermission:
            'Allow $(PRODUCT_NAME) to save photos of your tracked drinks directly to your camera roll.',
          isAccessMediaLocationEnabled: true,
          granularPermissions: ['audio', 'photo'],
        },
      ],
      'expo-font',
      'expo-web-browser',
      'expo-secure-store',
      'expo-localization',
      [
        'apple-health',
        {
          healthSharePermission:
            'Allow $(PRODUCT_NAME) to securely read your health data to personalize your hydration goals and analysis.',
          healthUpdatePermission:
            'Allow $(PRODUCT_NAME) to automatically log your tracked drinks directly into Apple Health.',
          backgroundDelivery: false,
        },
      ],
      '@react-native-community/datetimepicker',
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      posthogProjectToken: process.env.POSTHOG_PROJECT_TOKEN,
      posthogHost: process.env.POSTHOG_HOST,
      eas: {
        projectId: 'aafba71a-ee5d-490c-af11-6d22f4afdf82',
      },
    },
  },
}
