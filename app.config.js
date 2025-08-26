export default {
  expo: {
    name: "SmartReturn - QR Scanner",
    slug: "qr-scanner",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    scheme: "qrscanner",
    
    // Bildirim sistemi için gerekli ayarlar
    plugins: [
      [
        "expo-notifications",
        {
          icon: "./assets/notification-icon.png",
          color: "#ffffff"
        }
      ]
    ],
    
    // Bildirim konfigürasyonu
    notification: {
      icon: "./assets/notification-icon.png",
      color: "#ffffff",
      iosDisplayInForeground: true,
      androidMode: "default",
      androidCollapsedTitle: "Yeni Bildirim",
      androidChannelId: "default",
      androidImportance: "max",
      androidShowBadge: true
    },
    
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      permissions: [
        "android.permission.CAMERA",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.VIBRATE",
        "android.permission.WAKE_LOCK"
      ],
      // Android için bildirim ayarları
      useNextNotificationsApi: true
    },
    
    ios: {
      supportsTablet: true,
      // iOS için bildirim ayarları
      infoPlist: {
        UIBackgroundModes: ["remote-notification"]
      }
    },
    
    extra: {
      FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
      FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
      FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
      FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
      FIREBASE_APP_ID: process.env.FIREBASE_APP_ID,
      GOOGLE_EXPO_CLIENT_ID: process.env.GOOGLE_EXPO_CLIENT_ID,
      GOOGLE_IOS_CLIENT_ID: process.env.GOOGLE_IOS_CLIENT_ID,
      GOOGLE_ANDROID_CLIENT_ID: process.env.GOOGLE_ANDROID_CLIENT_ID,
      CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_UPLOAD_PRESET: process.env.CLOUDINARY_UPLOAD_PRESET,
      EXPO_PROJECT_ID: process.env.EXPO_PROJECT_ID || 'ed7a3840-d6ba-4597-9e73-1c9e5125e4cb',
    }
  }
};
