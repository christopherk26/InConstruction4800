// scripts/add-communities.js
require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

// Target user ID (or set to null to use email lookup)
const TARGET_USER_ID = null; 
// Target user email (used if TARGET_USER_ID is null)
const TARGET_USER_EMAIL = 'christopherkurdoghlian@gmail.com';

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

// Helper function to create timestamps
const createTimestamp = (daysAgo = 0) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return admin.firestore.Timestamp.fromDate(date);
};

async function addCommunitiesToUser() {
  try {
    let userId = TARGET_USER_ID;
    
    // If no user ID is provided, look up by email
    if (!userId) {
      console.log(`Finding user with email: ${TARGET_USER_EMAIL}...`);
      
      // First find the user by email
      const userRecord = await admin.auth().getUserByEmail(TARGET_USER_EMAIL)
        .catch(error => {
          if (error.code === 'auth/user-not-found') {
            console.error(`User with email ${TARGET_USER_EMAIL} not found in Authentication.`);
            console.log('Please ensure the user has created an account first.');
            return null;
          }
          throw error;
        });
      
      if (!userRecord) {
        process.exit(1);
      }
      
      userId = userRecord.uid;
    }
    
    console.log(`Adding communities for user ID: ${userId}`);
    
    // Check if user exists in Firestore
    const userDocRef = admin.firestore().collection('users').doc(userId);
    const userDoc = await userDocRef.get();
    
    if (!userDoc.exists) {
      console.error(`User document for ID ${userId} not found in Firestore.`);
      console.log('Please ensure the user has created an account and their document exists in Firestore.');
      process.exit(1);
    }
    
    // Define new community memberships
    const newMemberships = [
      {
        id: `membership-${userId}-community1-${Date.now()}`, // Unique ID for this membership
        userId: userId,
        communityId: "community1", // Springfield
        type: "resident",
        address: {
          street: "789 Pine St", // Example address, adjust as needed
          city: "Springfield",
          state: "IL",
          zipCode: "62703",
          verificationDocumentUrls: ["https://example.com/docs/verification_id.jpg"]
        },
        notificationPreferences: {
          emergencyAlerts: true,
          generalDiscussion: true,
          safetyAndCrime: true,
          governance: false,
          disasterAndFire: true,
          businesses: true,
          resourcesAndRecovery: true,
          communityEvents: true,
          pushNotifications: true
        },
        joinDate: createTimestamp(10), // Joined 10 days ago
        status: "active",
        verificationStatus: "verified",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        id: `membership-${userId}-community2-${Date.now()}`, // Unique ID for this membership
        userId: userId,
        communityId: "community2", // Shelbyville
        type: "resident",
        address: {
          street: "101 Elm St", // Example address, adjust as needed
          city: "Shelbyville",
          state: "IL",
          zipCode: "62565",
          verificationDocumentUrls: ["https://example.com/docs/verification_id.jpg"]
        },
        notificationPreferences: {
          emergencyAlerts: true,
          generalDiscussion: false,
          safetyAndCrime: true,
          governance: false,
          disasterAndFire: true,
          businesses: false,
          resourcesAndRecovery: true,
          communityEvents: false,
          pushNotifications: true
        },
        joinDate: createTimestamp(5), // Joined 5 days ago
        status: "active",
        verificationStatus: "verified",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }
    ];

    // Add memberships to Firestore
    console.log("Adding community memberships...");
    const firestore = admin.firestore();
    const batch = firestore.batch();
    
    for (const membership of newMemberships) {
      const { id, ...membershipData } = membership;
      const membershipRef = firestore.collection("community_memberships").doc(id);
      batch.set(membershipRef, membershipData);
      console.log(`Prepared membership: ${membership.userId} in ${membership.communityId} (${id})`);
    }
    
    // Commit the batch
    await batch.commit();
    console.log("Community memberships successfully added to Firestore!");

    // Update community stats (memberCount and verifiedCount)
    console.log("Updating community stats...");
    for (const membership of newMemberships) {
      const communityRef = firestore.collection("communities").doc(membership.communityId);
      const communityDoc = await communityRef.get();
      
      if (!communityDoc.exists) {
        console.warn(`Community document ${membership.communityId} not found. Creating it...`);
        await communityRef.set({
          id: membership.communityId,
          name: membership.communityId === "community1" ? "Springfield" : "Shelbyville",
          stats: {
            memberCount: 1,
            verifiedCount: membership.verificationStatus === "verified" ? 1 : 0,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
          },
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        // Get current stats or initialize them
        const stats = communityDoc.data().stats || {};
        const memberCount = (stats.memberCount || 0) + 1;
        const verifiedCount = (stats.verifiedCount || 0) + (membership.verificationStatus === "verified" ? 1 : 0);
        
        await communityRef.update({
          "stats.memberCount": memberCount,
          "stats.verifiedCount": verifiedCount,
          "stats.lastUpdated": admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      
      console.log(`Updated stats for community: ${membership.communityId}`);
    }

    console.log(`✅ Successfully added communities for user ID: ${userId}!`);
    process.exit(0);
  } catch (error) {
    console.error("Error adding communities to user:", error);
    process.exit(1);
  }
}

// Run the script
addCommunitiesToUser();

// To run: npm run add:communities
// Add to package.json scripts: "add:communities": "node scripts/add-communities.js"