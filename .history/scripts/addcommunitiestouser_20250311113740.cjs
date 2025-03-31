const { initializeApp } = require("firebase/app");
const { 
  getFirestore, 
  doc, 
  setDoc, 
  Timestamp 
} = require("firebase/firestore");

// Firebase configuration (from your provided config)
const firebaseConfig = {
  apiKey: "AIzaSyA8krcjPPhxF222gKTBUJhgeDuJ_6X5HiE",
  authDomain: "cs-4800-in-construction-63b73.firebaseapp.com",
  databaseURL: "https://cs-4800-in-construction-63b73-default-rtdb.firebaseio.com",
  projectId: "cs-4800-in-construction-63b73",
  storageBucket: "cs-4800-in-construction-63b73.firebasestorage.app",
  messagingSenderId: "430628626450",
  appId: "1:430628626450:web:a55ef8c6768ddb915e38cb",
  measurementId: "G-CRXZ621DDX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Helper function to create timestamps
const createTimestamp = (daysAgo = 0) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return Timestamp.fromDate(date);
};

console.log("Starting script to add communities to user...");

async function addCommunitiesToUser() {
  try {
    const userId = "AN7gijEG12YmniDBE4g1p3OUI6r1"; // Your user ID
    console.log(`Adding communities to user ID: ${userId}`);

    // Define new community memberships
    const newMemberships = [
      {
        id: "membership5", // Unique ID for this membership
        userId: userId,
        communityId: "community1", // Springfield
        type: "resident",
        address: {
          street: "789 Pine St", // Example address, adjust as needed
          city: "Springfield",
          state: "IL",
          zipCode: "62703",
          verificationDocumentUrls: ["https://example.com/docs/ckurdoghlian_springfield_id.jpg"]
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
        verificationStatus: "verified"
      },
      {
        id: "membership6", // Unique ID for this membership
        userId: userId,
        communityId: "community2", // Shelbyville
        type: "resident",
        address: {
          street: "101 Elm St", // Example address, adjust as needed
          city: "Shelbyville",
          state: "IL",
          zipCode: "62565",
          verificationDocumentUrls: ["https://example.com/docs/ckurdoghlian_shelbyville_id.jpg"]
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
        verificationStatus: "verified"
      }
    ];

    // Add memberships to Firestore
    console.log("Adding community memberships...");
    for (const membership of newMemberships) {
      const { id, ...membershipData } = membership;
      await setDoc(doc(db, "community_memberships", id), membershipData);
      console.log(`Added membership: ${membership.userId} in ${membership.communityId} (${id})`);
    }

    // Optional: Update community stats (memberCount and verifiedCount)
    const communityUpdates = [
      { id: "community1", field: "stats.memberCount", increment: 1, verifiedField: "stats.verifiedCount", verifiedIncrement: 1 },
      { id: "community2", field: "stats.memberCount", increment: 1, verifiedField: "stats.verifiedCount", verifiedIncrement: 1 }
    ];

    console.log("Updating community stats...");
    for (const update of communityUpdates) {
      const communityRef = doc(db, "communities", update.id);
      await setDoc(
        communityRef,
        {
          [update.field]: (await getDoc(communityRef)).data()?.stats?.memberCount + update.increment || update.increment,
          [update.verifiedField]: (await getDoc(communityRef)).data()?.stats?.verifiedCount + update.verifiedIncrement || update.verifiedIncrement,
          "stats.lastUpdated": createTimestamp(0)
        },
        { merge: true }
      );
      console.log(`Updated stats for community: ${update.id}`);
    }

    console.log("Communities successfully added to user!");
  } catch (error) {
    console.error("Error adding communities to user:", error);
    console.error("Error details:", error.message);
  }
}

// Run the script
addCommunitiesToUser()
  .then(() => console.log("Script execution completed"))
  .catch(err => console.error("Unhandled error in script:", err));