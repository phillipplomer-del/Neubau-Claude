/**
 * Firebase Configuration and Initialization
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore, enableIndexedDbPersistence } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDm4FkoCJcllpUCLUtO1x69QLPk79nym-c",
  authDomain: "pps-system-495d5.firebaseapp.com",
  projectId: "pps-system-495d5",
  storageBucket: "pps-system-495d5.firebasestorage.app",
  messagingSenderId: "85416282084",
  appId: "1:85416282084:web:34ad776be2427c8f50e9f1"
};

// Initialize Firebase
let app: FirebaseApp;
let db: Firestore;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);

  // Enable offline persistence
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firebase persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('Firebase persistence not available in this browser');
    }
  });
} catch (error) {
  console.error('Firebase initialization error:', error);
  throw error;
}

export { app, db };
