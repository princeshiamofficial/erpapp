
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getMessaging, isSupported as isMessagingSupported } from "firebase/messaging"; // Added for FCM

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA-OULKM7hL85JFSGlNs0BHdIuTOVN73-I",
  authDomain: "colorhut-57f5a.firebaseapp.com",
  projectId: "colorhut-57f5a",
  storageBucket: "colorhut-57f5a.firebasestorage.app",
  messagingSenderId: "282903959856",
  appId: "1:282903959856:web:287ace0c706eb0b11990f5",
  measurementId: "G-57S6VYXE7H"
};

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Use initializeFirestore with modern persistent cache
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  }),
  ignoreUndefinedProperties: true
});

console.log("[Firestore] Offline persistence enabled via initializeFirestore.");


const auth = getAuth(app);

// Analytics initialization removed

// Initialize Firebase Messaging
let messagingInstance = null;
if (typeof window !== 'undefined') {
  isMessagingSupported().then(supported => {
    if (supported) {
      messagingInstance = getMessaging(app);
      console.log("Firebase Messaging initialized.");
    } else {
      console.log("Firebase Messaging is not supported in this browser.");
    }
  }).catch(err => {
    console.error("Error checking messaging support:", err);
  });
}


export { app, db, auth, /* analytics, */ messagingInstance as messaging }; // Removed analytics from export

