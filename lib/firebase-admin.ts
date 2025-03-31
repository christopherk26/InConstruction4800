// lib/firebase-admin.ts
import * as admin from 'firebase-admin';

// Check if the app has already been initialized
if (!admin.apps.length) {
  // If you're using environment variables for security (recommended)
  if (process.env.FIREBASE_ADMIN_CREDENTIALS) {
    // Parse the credentials from environment variable
    const serviceAccount = JSON.parse(
      Buffer.from(process.env.FIREBASE_ADMIN_CREDENTIALS, 'base64').toString()
    );

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });
  } else {
    // Initialize without explicit credentials (uses Google Application Default Credentials)
    // This is suitable for environments like Firebase Functions or Google Cloud
    admin.initializeApp();
  }
}

// Export the admin auth, firestore, and storage instances
export const adminAuth = admin.auth();
export const adminFirestore = admin.firestore();
export const adminStorage = admin.storage();