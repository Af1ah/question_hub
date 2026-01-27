import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAuth, Auth } from 'firebase/auth';

// ============================================================
// Firebase Configuration
// ============================================================

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// ============================================================
// Validate Configuration
// ============================================================

const validateConfig = (): void => {
  const requiredKeys = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
  ];

  const missingKeys = requiredKeys.filter(
    (key) => !process.env[key]
  );

  if (missingKeys.length > 0 && typeof window !== 'undefined') {
    console.warn(
      `Missing Firebase config keys: ${missingKeys.join(', ')}`
    );
  }
};

// ============================================================
// Initialize Firebase (Singleton Pattern)
// ============================================================

let firebaseApp: FirebaseApp;
let firestoreDb: Firestore;
let firebaseStorage: FirebaseStorage;
let firebaseAuth: Auth;

const initializeFirebase = (): FirebaseApp => {
  if (getApps().length > 0) {
    return getApp();
  }

  validateConfig();
  return initializeApp(firebaseConfig);
};

// ============================================================
// Exports
// ============================================================

export const getFirebaseApp = (): FirebaseApp => {
  if (!firebaseApp) {
    firebaseApp = initializeFirebase();
  }
  return firebaseApp;
};

export const getDb = (): Firestore => {
  if (!firestoreDb) {
    firestoreDb = getFirestore(getFirebaseApp());
  }
  return firestoreDb;
};

export const getFirebaseStorage = (): FirebaseStorage => {
  if (!firebaseStorage) {
    firebaseStorage = getStorage(getFirebaseApp());
  }
  return firebaseStorage;
};

export const getFirebaseAuth = (): Auth => {
  if (!firebaseAuth) {
    firebaseAuth = getAuth(getFirebaseApp());
  }
  return firebaseAuth;
};

// Default exports for convenience
export const app = getFirebaseApp();
export const db = getDb();
export const storage = getFirebaseStorage();
export const auth = getFirebaseAuth();
