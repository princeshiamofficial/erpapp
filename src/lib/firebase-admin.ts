
import admin from 'firebase-admin';

// Directly use the provided service account JSON
const serviceAccount = {
  "type": "service_account",
  "project_id": "colorhut-57f5a",
  "private_key_id": "862182bf5624a20cfbc8b138be100384dc26bed8",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQChhXPKshr0byai\nmR7GK76s2/kYJo0vUnAhhJf1yRfcC2JP8SywG6x6+xdpFfvYwDz7c7q5Un8p0d1w\n06hca+bT86UbmD6dOjWGZGdlFS3AWInX7sv6/b+XZAre0WynoDdD1ecyH3bPdjSr\nmypiyVqMc1vCiGyDXZMrc6f7gyU0r4GXou+0L9JRwLGNCWkq+13i5fsmrwfCXZFk\neGs/bGV0rKco82rMdoygax69+zZ3iEfNs+h22i4E+UVlJqxWKV7H2Y0BNVH/xfhM\nkZkaVgPQJf9yxMKLk8rsGjPWtKOoBx+JSj17FqZJKnJEyRMBk5oMRHznmA76yS6A\nz+xhFSSnAgMBAAECggEAPKX/dHyr4lxaBXO5Om/yiLWQMqFHIh2yPOOsq312mAku\nQRYt0XKSsRrXD35RsnF8dG5gDnYLiYhjvZm7/fgGFE/IDzR7Tk4tCuloaWwqYa7d\nE1d3ACeHaTEHY+L/CXH/TlljFk76LawU2trIb49rkJFAQys2k5zvRcGHscjsj3s9\n7XwYSp/YdqNt4EsEWpA6tWQCxO0QHBdFqgIgQkD35BkKT/bI9/G7s4aYAvkqO/2C\nR1Aci9hoYeUt1AZuzPLBc8FMtVkn2B07UIOf0GJK7QhsEHpLoz9a3EhELBhCpuiq\nBlk5llonjOvgd33PdEHVKKTR+8f/Rqp2wZLac0hLAQKBgQDa97uXekGu30hMT7UO\nyCyTtqr9BJVUUF1waVh05dfyhifUNrIM5a15JPZ/taalsKdhKjEyH4uHYcoXaNXF\nIrGhDBY9G4w4S24uFz1Hq0HSt9o99/JmBM9XLBxjaiZJ1meXLKEx9jq0++os9PbD\n0qp6uDWijZd6Rs8C5IJ9QZ9a7QKBgQC81o+7XEz7mSEg9NTN2Bt341a0eCghNQDG\nwHQUQ+26Hpz5zUrC8yhp+0Pl1zciCLZOyUUV7OTpRtR3oI7LCSxbIJpcT8trFdRs\n2nVwL3kb9njE4fRbjaTYqfzPi+LBBsT5ZEiBNBeNsOs98/WGQbTCVx3jqqBsmj4b\n1sr6i0qHYwKBgHH2b4b2FUtrYFh/P4+S9Uhn0PRgt0urjAYeffBRU6Qg2Iflc6Os\nwi2D5FsxcqtXlrXGXNZmfpsWdTTb1i6E0Qgtn0Fsnf0KnSyV4cn0QwzlrUuFSX55\nUGRhS+Ed9RGG6mFO1BKJwaJCXm3JjMj8UsgOKbQRl14HjmRGA/gm+EY9AoGAICLf\niQIXM8YGhkZEJNe/LPLqYYIFSklr3WcJGh3JSiBFlJlkPLMG0KprDqVGg6s540SL\nVkTfW/eq1sTjKBhijQuKWWVW991aLkArNjFOCf0y5kaRwDbls92R4Xwr1a+iO9Le\nJ+bGj11pWzy2LuflrCEJPCJgdLr3EOPH3UVxJIMCgYEA2sBV92PJYw+pOtR1hCkX\nnTXeL0V0mI7IY6OvrDg3L60I5Nsm7Vhm6n7CgrnrlBQ52yHROwYu9f05noJuY6SQ\n4SsvjBuN15sonjnOTRSUUK9AqsHuqxGbmT47KJ9QzLamJN261X8YIyVpGF61cY2K\nltKsqRnzUltCL4esF7Sgmf8=\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@colorhut-57f5a.iam.gserviceaccount.com",
  "client_id": "117620365648582235851",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40colorhut-57f5a.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
} as admin.ServiceAccount; // Type assertion to admin.ServiceAccount

let adminApp: admin.app.App;

if (!admin.apps.length) {
  console.log("[Firebase Admin SDK - Hardcoded Init] Attempting to initialize with hardcoded credentials...");
  try {
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("[Firebase Admin SDK - Hardcoded Init] Initialization SUCCEEDED. App name:", adminApp.name);
  } catch (error: any) {
    console.error("[Firebase Admin SDK - Hardcoded Init] Initialization FAILED:", error.message);
    // Log the full error object for more details, but be careful as it might contain sensitive info in some cases
    // console.error("Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    // @ts-ignore adminApp might not be initialized
    adminApp = null; // Explicitly set to null on failure to ensure downstream checks fail correctly
  }
} else {
  console.log("[Firebase Admin SDK - Hardcoded Init] Already initialized, getting default app.");
  adminApp = admin.app(); // Get the default app if already initialized
}

// Post-initialization checks
if (adminApp) {
  console.log("[Firebase Admin SDK - Hardcoded Init] adminApp object IS defined after init/get block.");
  if (typeof adminApp.messaging === 'function') {
    console.log("[Firebase Admin SDK - Hardcoded Init] adminApp.messaging IS a function. SDK should be usable for messaging.");
  } else {
    console.warn("[Firebase Admin SDK - Hardcoded Init] adminApp.messaging IS NOT a function. Firebase Admin SDK's messaging service might not be available. This is likely the core issue if initialization succeeded but messaging fails.");
  }
} else {
  console.error("[Firebase Admin SDK - Hardcoded Init] adminApp object IS STILL NULL or UNDEFINED after init/get block. Firebase Admin SDK is not configured.");
}

export { adminApp };
