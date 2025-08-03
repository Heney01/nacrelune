// src/lib/firebase-admin.ts
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';

const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;

let adminApp: App | null = null;

if (serviceAccountString) {
  try {
    const serviceAccount = JSON.parse(serviceAccountString);
    if (getApps().some(app => app.name === 'admin')) {
      adminApp = getApps().find(app => app.name === 'admin')!;
    } else {
      adminApp = initializeApp({
        credential: cert(serviceAccount),
      }, 'admin');
    }
  } catch (error) {
    console.error("Failed to parse or initialize Firebase Admin SDK:", error);
    adminApp = null;
  }
} else {
  console.warn("FIREBASE_SERVICE_ACCOUNT environment variable is not set. Admin features will be disabled.");
}

export { adminApp };
