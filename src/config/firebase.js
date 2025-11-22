// src/config/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration - Replace with your actual Firebase config
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "demo-api-key",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "piggypal-demo.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "piggypal-demo",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "piggypal-demo.appspot.com",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:123456789:web:demo"
};

let app = null;
let auth = null;
let db = null;
let isFirebaseAvailable = false;

try {
  // Initialize Firebase
  app = initializeApp(firebaseConfig);
  
  // Initialize Firebase Authentication and Firestore
  auth = getAuth(app);
  db = getFirestore(app);
  
  isFirebaseAvailable = true;
  console.log('Firebase initialized successfully');
} catch (error) {
  console.warn('Firebase initialization failed - running in offline mode:', error.message);
  isFirebaseAvailable = false;
  
  // Create mock objects to prevent crashes
  auth = {
    currentUser: null,
    signInWithEmailAndPassword: () => Promise.reject(new Error('Firebase not available')),
    createUserWithEmailAndPassword: () => Promise.reject(new Error('Firebase not available')),
    signOut: () => Promise.reject(new Error('Firebase not available'))
  };
  
  db = {
    collection: () => Promise.reject(new Error('Firebase not available'))
  };
}

// Helper function to check if Firebase is available
export const isFirebaseConfigured = () => {
  return isFirebaseAvailable && 
         firebaseConfig.apiKey !== "demo-api-key" &&
         firebaseConfig.projectId !== "piggypal-demo";
};

// Safe Firebase operations
export const safeFirebaseOperation = async (operation, fallback = null) => {
  if (!isFirebaseAvailable || !isFirebaseConfigured()) {
    console.warn('Firebase operation skipped - service not available');
    return fallback;
  }
  
  try {
    return await operation();
  } catch (error) {
    console.error('Firebase operation failed:', error);
    throw error;
  }
};

export { auth, db };
export default app;