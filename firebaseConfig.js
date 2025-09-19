// firebaseConfig.js (veya ts)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_APP_ID,
};

if (!firebaseConfig.apiKey) {
  console.warn('Firebase API key yok (env okunmadı).');
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// RN/Expo için Auth’u AsyncStorage ile **bir kez** başlat
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  // Eğer daha önce init edildiyse
  auth = getAuth(app);
}

const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };

