
import admin from 'firebase-admin';

// Option 1: Use GOOGLE_APPLICATION_CREDENTIALS environment variable
// Set this environment variable to the path of your service account key JSON file.
// Firebase Admin SDK will automatically find and use it.
// Example (in .env.local or your server environment):
// GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/serviceAccountKey.json"

// Option 2: Parse service account from an environment variable holding the JSON content
// Set FIREBASE_SERVICE_ACCOUNT_JSON to the stringified content of your service account key.
// Example (in .env.local or your server environment):
// FIREBASE_SERVICE_ACCOUNT_JSON='{"type": "service_account", "project_id": "...", ...}'
const serviceAccountJsonString = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const googleAppCreds = process.env.GOOGLE_APPLICATION_CREDENTIALS;

let adminApp: admin.app.App;

if (admin.apps.length === 0) {
  console.log("[Firebase Admin SDK] Attempting to initialize...");
  if (googleAppCreds) {
    console.log(`[Firebase Admin SDK] Found GOOGLE_APPLICATION_CREDENTIALS: ${googleAppCreds}. Initializing with application default credentials.`);
    try {
      adminApp = admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
      console.log("[Firebase Admin SDK] Initialization successful using GOOGLE_APPLICATION_CREDENTIALS.");
    } catch (error) {
        console.error("[Firebase Admin SDK] Error initializing with GOOGLE_APPLICATION_CREDENTIALS. Ensure the path is correct and the file is valid JSON.", error);
        // @ts-ignore adminApp might not be initialized here
        adminApp = null;
    }
  } else if (serviceAccountJsonString) {
    console.log("[Firebase Admin SDK] GOOGLE_APPLICATION_CREDENTIALS not found. Checking for FIREBASE_SERVICE_ACCOUNT_JSON...");
    console.log("[Firebase Admin SDK] Found FIREBASE_SERVICE_ACCOUNT_JSON. Attempting to parse and initialize.");
    try {
      const serviceAccount = JSON.parse(serviceAccountJsonString);
      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("[Firebase Admin SDK] Initialization successful using FIREBASE_SERVICE_ACCOUNT_JSON.");
    } catch (error) {
      console.error("[Firebase Admin SDK] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON or initialize. Ensure it's valid JSON content (not a file path) and properly escaped if in a .env file.", error);
      // @ts-ignore adminApp might not be initialized here
      adminApp = null;
    }
  } else {
    console.warn(
      "[Firebase Admin SDK] CRITICAL: Firebase Admin SDK not initialized. " +
      "Neither GOOGLE_APPLICATION_CREDENTIALS nor FIREBASE_SERVICE_ACCOUNT_JSON environment variables were found. " +
      "Server-side Firebase operations (like sending FCM messages) will fail."
    );
    // @ts-ignore adminApp might not be initialized here
    adminApp = null;
  }
} else {
  console.log("[Firebase Admin SDK] Already initialized, getting default app.");
  adminApp = admin.app(); // Get the default app if already initialized
}

export { adminApp };
