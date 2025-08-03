
import * as admin from 'firebase-admin';

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : null;

export async function initAdmin() {
  if (admin.apps.length > 0) {
    return;
  }
  if (!serviceAccount) {
    throw new Error('Firebase service account key is not set in environment variables.');
  }
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
