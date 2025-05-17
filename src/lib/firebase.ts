
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // REPLACE WITH YOUR ACTUAL CONFIG
  authDomain: "YOUR_AUTH_DOMAIN", // REPLACE WITH YOUR ACTUAL CONFIG
  projectId: "YOUR_PROJECT_ID", // REPLACE WITH YOUR ACTUAL CONFIG
  storageBucket: "YOUR_STORAGE_BUCKET", // REPLACE WITH YOUR ACTUAL CONFIG
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID", // REPLACE WITH YOUR ACTUAL CONFIG
  appId: "YOUR_APP_ID", // REPLACE WITH YOUR ACTUAL CONFIG
  measurementId: "YOUR_MEASUREMENT_ID" // Optional
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const db = getFirestore(app);
const auth = getAuth(app); // We'll use this later for Firebase Auth

export { app, db, auth };
