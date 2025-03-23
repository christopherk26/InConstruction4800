// scripts/setup-admin-user.js
require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

// Admin user email
const ADMIN_EMAIL = 'christopherkurdoghlian@gmail.com';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // Parse the credentials from environment variable
    const serviceAccount = JSON.parse(
      Buffer.from(process.env.FIREBASE_ADMIN_CREDENTIALS, 'base64').toString()
    );

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });
  } catch (error) {
    console.error('Error initializing admin SDK:', error);
    process.exit(1);
  }
}

async function setupAdminUser() {
  try {
    console.log(`Finding user with email: ${ADMIN_EMAIL}...`);
    
    // First find the user by email
    const userRecord = await admin.auth().getUserByEmail(ADMIN_EMAIL)
      .catch(error => {
        if (error.code === 'auth/user-not-found') {
          console.error(`User with email ${ADMIN_EMAIL} not found in Authentication.`);
          console.log('Please ensure the user has created an account first.');
          return null;
        }
        throw error;
      });

    if (!userRecord) {
      process.exit(1);
    }

    const userId = userRecord.uid;
    console.log(`Found user with ID: ${userId}`);

    // Check if user exists in Firestore
    const userDocRef = admin.firestore().collection('users').doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      console.error(`User document for ID ${userId} not found in Firestore.`);
      console.log('Please ensure the user has created an account and their document exists in Firestore.');
      process.exit(1);
    }

    // Set the isAdmin field to true
    await userDocRef.update({
      isAdmin: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Successfully set ${ADMIN_EMAIL} as an admin user!`);
    process.exit(0);
  } catch (error) {
    console.error('Error setting up admin user:', error);
    process.exit(1);
  }
}

setupAdminUser();


//npm run setup:admin
