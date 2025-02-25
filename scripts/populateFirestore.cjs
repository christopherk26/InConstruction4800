// scripts/populateFirestore.js
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, addDoc } = require("firebase/firestore");

// Firebase configuration - copied from your lib/firebase.ts
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

console.log("Starting Firestore population script...");

async function populateFirestore() {
  try {
    console.log("Connected to Firestore. Adding sample data...");
    
    // Sample posts
    const posts = [
      {
        authorId: "user1",
        communityId: "community1",
        title: "Welcome to Town Hall!",
        content: "This is a test post for our community.",
        createdAt: new Date(),
        editedAt: null,
        categoryTag: "generalDiscussion",
        geographicTag: "Downtown",
        status: "active",
        pinExpiresAt: null,
        isEmergency: false,
        mediaUrls: [],
        stats: { upvotes: 0, downvotes: 0, commentCount: 0 },
        author: { name: "John Doe", role: "citizen", badgeUrl: "citizen-icon.png" },
      },
      {
        authorId: "user2",
        communityId: "community1",
        title: "Emergency Alert Test",
        content: "Testing emergency post functionality.",
        createdAt: new Date(),
        editedAt: null,
        categoryTag: "officialEmergencyAlerts",
        geographicTag: "City Hall",
        status: "pinned",
        pinExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        isEmergency: true,
        mediaUrls: ["https://example.com/image.jpg"],
        stats: { upvotes: 5, downvotes: 0, commentCount: 2 },
        author: { name: "Mayor Smith", role: "mayor", badgeUrl: "mayor-icon.png" },
      },
    ];

    // Add each post to Firestore
    for (const post of posts) {
      console.log(`Adding post: ${post.title}`);
      const docRef = await addDoc(collection(db, "posts"), post);
      console.log(`Successfully added post with ID: ${docRef.id}`);
    }

    console.log("Firestore populated successfully!");
  } catch (error) {
    console.error("Error populating Firestore:", error);
    console.error("Error details:", error.message);
  }
}

// Run the function
populateFirestore()
  .then(() => console.log("Script execution completed"))
  .catch(err => console.error("Unhandled error in script:", err));