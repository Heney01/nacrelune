// src/lib/firebase-admin.ts
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : undefined;

let adminApp: App;

if (!getApps().some(app => app.name === 'admin')) {
  adminApp = initializeApp({
    credential: cert(serviceAccount),
  }, 'admin');
} else {
  adminApp = getApps().find(app => app.name === 'admin')!;
}

export { adminApp };
