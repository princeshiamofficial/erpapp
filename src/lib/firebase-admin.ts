
import admin from 'firebase-admin';

// Option 1: Use GOOGLE_APPLICATION_CREDENTIALS environment variable
// Set this environment variable to the path of your service account key JSON file.
// Firebase Admin SDK will automatically find and use it.
// Example: export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/serviceAccountKey.json"

// Option 2: Parse service account from an environment variable holding the JSON content
// Set FIREBASE_SERVICE_ACCOUNT_JSON to the stringified content of your service account key.
const serviceAccountJsonString = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

let adminApp: admin.app.App;

if (admin.apps.length === 0) {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log("Initializing Firebase Admin SDK with GOOGLE_APPLICATION_CREDENTIALS.");
    adminApp = admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } else if (serviceAccountJsonString) {
    console.log("Initializing Firebase Admin SDK from FIREBASE_SERVICE_ACCOUNT_JSON environment variable.");
    try {
      const serviceAccount = JSON.parse(serviceAccountJsonString);
      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (error) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON. Ensure it's valid JSON.", error);
      throw new Error("Firebase Admin SDK initialization failed: Invalid service account JSON.");
    }
  } else {
    console.warn(
      "Firebase Admin SDK not initialized. " +
      "For server-side operations like sending FCM messages, " +
      "set either GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON environment variables."
    );
    // @ts-ignore adminApp might not be initialized here, handle this in consuming code
    adminApp = null; 
  }
} else {
  adminApp = admin.app(); // Get the default app if already initialized
}

export { adminApp };

    