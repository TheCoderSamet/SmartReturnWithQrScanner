import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

function getExpoExtra() {
  const extraFromExpoConfig = Constants?.expoConfig?.extra;
  const extraFromManifest = Constants?.manifest?.extra;
  const extra = extraFromExpoConfig ?? extraFromManifest;
  if (!extra) {
    console.warn('[Expo] extra config not found. Make sure app.config.js defines extra and you are running in Expo Go/dev build.');
  }
  return extra ?? {};
}

const {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID,
} = getExpoExtra();

// Firebase config validation
if (!FIREBASE_API_KEY || !FIREBASE_AUTH_DOMAIN || !FIREBASE_PROJECT_ID) {
  console.error('❌ Firebase configuration is missing! Please check your environment variables.');
  console.error('Required: FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, FIREBASE_PROJECT_ID');
  throw new Error('Firebase configuration is incomplete. Check your environment variables.');
}

const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET || `${FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: FIREBASE_APP_ID || '1:123456789:android:abcdef',
};

console.log('✅ Firebase config loaded successfully');
console.log('Project ID:', FIREBASE_PROJECT_ID);

const app = initializeApp(firebaseConfig);

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

const db = getFirestore(app);

export { auth, db };
