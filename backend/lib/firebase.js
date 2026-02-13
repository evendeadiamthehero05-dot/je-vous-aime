import admin from 'firebase-admin';
import 'dotenv/config';

// Initialize Firebase Admin SDK centrally so other modules can import a ready-to-use instance.
if (!admin.apps.length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } catch (err) {
      // If the env var is malformed, fall back to ADC and log a clear message.
      console.warn('FIREBASE_SERVICE_ACCOUNT_KEY parsing failed, falling back to applicationDefault():', err.message);
      admin.initializeApp({ credential: admin.credential.applicationDefault() });
    }
  } else {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
  }
}

const db = admin.firestore();
const timestamp = admin.firestore.FieldValue.serverTimestamp;

export { admin, db, timestamp };
