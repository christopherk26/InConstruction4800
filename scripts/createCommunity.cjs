// scripts/createCommunity.cjs
const { initializeApp } = require("firebase/app");
const { 
  getFirestore, 
  collection, 
  addDoc, 
  doc, 
  setDoc, 
  Timestamp 
} = require("firebase/firestore");

// Firebase configuration - same as your populateFirestore.cjs script
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

// Helper function to create timestamps for future dates
const createFutureTimestamp = (daysInFuture = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + daysInFuture);
  return Timestamp.fromDate(date);
};

console.log("Starting Cal Poly Pomona community creation script...");

async function createCommunity() {
  try {
    console.log("Creating Cal Poly Pomona community...");
    
    // Cal Poly Pomona and surrounding area ZIP codes
    const cppZipCodes = ['91768', '91767', '91766', '91789', '91708'];
    
    // Create timestamps
    const now = Timestamp.now();
    const oneYearFromNow = createFutureTimestamp(365);
    
    // Community data
    const communityData = {
      name: 'Cal Poly Pomona',
      bio: 'The official community for Cal Poly Pomona students, faculty, staff, and residents of the surrounding area. Connect with your campus community, share resources, and stay informed about campus events and news.',
      location: {
        city: 'Pomona',
        state: 'CA',
        zipCodes: cppZipCodes,
        coordinates: {
          latitude: 34.0583,
          longitude: -117.8218,
        }
      },
      stats: {
        memberCount: 0,
        verifiedCount: 0,
        ghostCount: 0,
        lastUpdated: now,
      },
      contractInfo: {
        startDate: now,
        renewalDate: oneYearFromNow,
        status: 'active',
      },
      status: 'active',
      createdAt: now
    };
    
    // Add community to Firestore
    const communityRef = await addDoc(collection(db, "communities"), communityData);
    const communityId = communityRef.id;
    
    console.log(`✅ Successfully created Cal Poly Pomona community with ID: ${communityId}`);
    
    // Create default official roles for the community
    await createCommunityRoles(communityId);
    
    return communityId;
  } catch (error) {
    console.error('❌ Error creating community:', error);
    throw error;
  }
}

// Create default official roles for the community
async function createCommunityRoles(communityId) {
  try {
    console.log(`Creating official roles for community ${communityId}...`);
    const now = Timestamp.now();
    
    // Define roles
    const roles = [
      {
        communityId,
        title: 'Community Admin',
        displayName: 'Administrator',
        permissions: {
          canPin: true,
          canArchive: true,
          canPostEmergency: true,
          canModerate: true,
          canManageUsers: true,
          canManageRoles: true,
        },
        badge: {
          iconUrl: '',
          color: '#FF5722', // Orange
        },
        documentProvidedBy: 'Town Hall',
        documentUploadDate: now,
      },
      {
        communityId,
        title: 'Faculty Member',
        displayName: 'Faculty',
        permissions: {
          canPin: true,
          canArchive: false,
          canPostEmergency: true,
          canModerate: false,
          canManageUsers: false,
          canManageRoles: false,
        },
        badge: {
          iconUrl: '',
          color: '#2196F3', // Blue
        },
        documentProvidedBy: 'Town Hall',
        documentUploadDate: now,
      },
      {
        communityId,
        title: 'Student Representative',
        displayName: 'Student Rep',
        permissions: {
          canPin: false,
          canArchive: false,
          canPostEmergency: false,
          canModerate: true,
          canManageUsers: false,
          canManageRoles: false,
        },
        badge: {
          iconUrl: '',
          color: '#4CAF50', // Green
        },
        documentProvidedBy: 'Town Hall',
        documentUploadDate: now,
      },
    ];
    
    // Create roles in Firestore
    const rolePromises = roles.map(role => addDoc(collection(db, "official_roles"), role));
    const results = await Promise.all(rolePromises);
    
    console.log(`✅ Created ${results.length} official roles for the community`);
    
    // Create a welcome post in the community
    await createWelcomePost(communityId);
    
  } catch (error) {
    console.error('❌ Error creating community roles:', error);
    throw error;
  }
}

// Create a welcome post for the community
async function createWelcomePost(communityId) {
  try {
    console.log(`Creating welcome post for community ${communityId}...`);
    const now = Timestamp.now();
    
    // Welcome post data
    const postData = {
      authorId: "system", // System-generated post
      communityId: communityId,
      title: "Welcome to Cal Poly Pomona Community!",
      content: "Welcome to the official Town Hall community for Cal Poly Pomona!\n\nThis platform is designed to connect students, faculty, staff, and residents of the surrounding area. Use this space to share resources, discuss campus events, and stay informed about important news and updates.\n\nPlease take a moment to explore the community, update your notification preferences, and introduce yourself!",
      categoryTag: "generalDiscussion",
      geographicTag: "Campus-wide",
      mediaUrls: [],
      stats: {
        upvotes: 0,
        downvotes: 0,
        commentCount: 0
      },
      author: {
        name: "Town Hall Admin",
        role: "System",
        badgeUrl: ""
      },
      status: "pinned",
      pinExpiresAt: createFutureTimestamp(30), // Pinned for 30 days
      isEmergency: false,
      createdAt: now
    };
    
    // Add welcome post to Firestore
    const postRef = await addDoc(collection(db, "posts"), postData);
    
    console.log(`✅ Created welcome post with ID: ${postRef.id}`);
    
  } catch (error) {
    console.error('❌ Error creating welcome post:', error);
    // Don't throw here - we don't want to fail the whole process if just the welcome post fails
  }
}

// Run the script
async function main() {
  try {
    console.log("Starting Cal Poly Pomona community setup...");
    
    // Create community and get its ID
    const communityId = await createCommunity();
    
    console.log("✅ Community setup completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to complete community setup:", error);
    process.exit(1);
  }
}

// Execute the script
main();