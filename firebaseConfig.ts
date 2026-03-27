import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

/**
 * Firebase Configuration for THE SAVIOUR Emergency Hub.
 * 
 * HOW TO SET UP:
 * 1. Go to https://console.firebase.google.com/
 * 2. Create a new project (or use an existing one)
 * 3. Go to Project Settings > General > Your apps > Add app (Web)
 * 4. Copy the firebaseConfig object and paste it below
 * 5. Go to Firestore Database > Create database > Start in test mode
 * 6. That's it! The app will automatically start saving data to Firestore.
 */

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let firebaseReady = false;

try {
  // Only initialize if we have a valid project ID configured
  if (firebaseConfig.projectId && firebaseConfig.apiKey) {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    firebaseReady = true;
    console.log('🔥 Firebase initialized — Cloud Storage ACTIVE');
  } else {
    console.warn('⚠️ Firebase config missing — running in offline/fallback mode. Add VITE_FIREBASE_* env vars to .env.local');
  }
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
  firebaseReady = false;
}

export { db, firebaseReady };
export default app;
