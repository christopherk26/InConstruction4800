// scripts/populateNotifications.cjs
const { initializeApp } = require("firebase/app");
const { 
  getFirestore, 
  collection, 
  addDoc, 
  doc, 
  setDoc, 
  Timestamp 
} = require("firebase/firestore");

// Firebase configuration
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

console.log("Starting Notifications population script...");

async function populateNotifications() {
  try {
    console.log("Connected to Firestore. Adding sample notifications...");
    
    // Sample notifications
    const notifications = [
      {
        id: "notification1",
        userId: "user1", // John Doe
        communityId: "community1",
        type: "emergency",
        content: {
          title: "Emergency Alert: Severe Weather Warning",
          body: "The National Weather Service has issued a severe thunderstorm warning for our area from 3pm to 8pm today.",
          sourceId: "post2", // Emergency post
          sourceCategoryTag: "officialEmergencyAlerts"
        },
        status: {
          read: true,
          delivered: true,
          deliveredAt: createTimestamp(2)
        },
        createdAt: createTimestamp(2),
        priority: 10 // High priority
      },
      {
        id: "notification2",
        userId: "user3", // Sarah Johnson
        communityId: "community1",
        type: "emergency",
        content: {
          title: "Emergency Alert: Severe Weather Warning",
          body: "The National Weather Service has issued a severe thunderstorm warning for our area from 3pm to 8pm today.",
          sourceId: "post2", // Emergency post
          sourceCategoryTag: "officialEmergencyAlerts"
        },
        status: {
          read: false,
          delivered: true,
          deliveredAt: createTimestamp(2)
        },
        createdAt: createTimestamp(2),
        priority: 10 // High priority
      },
      {
        id: "notification3",
        userId: "user1", // John Doe
        communityId: "community1",
        type: "post",
        content: {
          title: "New Announcement",
          body: "Mayor Smith has posted a new announcement: Welcome to Town Hall!",
          sourceId: "post1", // Welcome post
          sourceCategoryTag: "generalDiscussion"
        },
        status: {
          read: true,
          delivered: true,
          deliveredAt: createTimestamp(7)
        },
        createdAt: createTimestamp(7),
        priority: 5 // Medium priority
      },
      {
        id: "notification4",
        userId: "user2", // Mayor Smith
        communityId: "community1",
        type: "comment",
        content: {
          title: "New Comment on Your Post",
          body: "John Doe commented: This is fantastic! Looking forward to better community engagement.",
          sourceId: "comment1", // Comment on welcome post
          sourceCategoryTag: "generalDiscussion"
        },
        status: {
          read: true,
          delivered: true,
          deliveredAt: createTimestamp(7)
        },
        createdAt: createTimestamp(7),
        priority: 3 // Low priority
      },
      {
        id: "notification5",
        userId: "user2", // Mayor Smith
        communityId: "community1",
        type: "comment",
        content: {
          title: "New Question on Your Emergency Alert",
          body: "John Doe asked: Is there a designated emergency shelter available?",
          sourceId: "comment4", // Question about emergency post
          sourceCategoryTag: "officialEmergencyAlerts"
        },
        status: {
          read: true,
          delivered: true,
          deliveredAt: createTimestamp(2)
        },
        createdAt: createTimestamp(2),
        priority: 7 // Medium-high priority due to emergency context
      },
      {
        id: "notification6",
        userId: "user1", // John Doe
        communityId: "community1",
        type: "system",
        content: {
          title: "Welcome to Town Hall",
          body: "Thank you for joining Town Hall! Complete your profile to get started.",
          sourceId: "",
          sourceCategoryTag: "system"
        },
        status: {
          read: true,
          delivered: true,
          deliveredAt: createTimestamp(90)
        },
        createdAt: createTimestamp(90),
        priority: 5 // Medium priority
      },
      {
        id: "notification7",
        userId: "user3", // Sarah Johnson
        communityId: "community1",
        type: "post",
        content: {
          title: "Community Event Announced",
          body: "John Doe has posted a new event: Downtown Cleanup Initiative",
          sourceId: "post3", // Cleanup event post
          sourceCategoryTag: "communityEvents"
        },
        status: {
          read: false,
          delivered: true,
          deliveredAt: createTimestamp(5)
        },
        createdAt: createTimestamp(5),
        priority: 4 // Medium-low priority
      }
    ];

    console.log("Adding notifications...");
    for (const notification of notifications) {
      const { id, ...notificationData } = notification;
      await setDoc(doc(db, "notifications", id), notificationData);
      console.log(`Added notification: ${notification.content.title} (${id})`);
    }

    console.log("Notifications populated successfully!");
  } catch (error) {
    console.error("Error populating notifications:", error);
    console.error("Error details:", error.message);
  }
}

// Run the function
populateNotifications()
  .then(() => console.log("Script execution completed"))
  .catch(err => console.error("Unhandled error in script:", err));