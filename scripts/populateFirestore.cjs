// scripts/populateFirestore.cjs
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

console.log("Starting Firestore population script...");

async function populateFirestore() {
  try {
    console.log("Connected to Firestore. Adding sample data...");
    
    // 1. Add users
    const users = [
      {
        id: "user1",
        email: "john.doe@example.com",
        firstName: "John",
        lastName: "Doe",
        phoneNumber: "555-123-4567",
        birthDate: createTimestamp(10000), // About 27 years ago
        bio: "Resident of Springfield for 10 years and active community volunteer.",
        profilePhotoUrl: "https://randomuser.me/api/portraits/men/1.jpg",
        verification: {
          status: "verified",
          method: "internal",
          documentUrls: ["https://example.com/docs/john_id.jpg"],
          verificationDate: createTimestamp(60)
        },
        createdAt: createTimestamp(90),
        lastLogin: createTimestamp(0),
        accountStatus: "active"
      },
      {
        id: "user2",
        email: "mayor.smith@springfield.gov",
        firstName: "Mayor",
        lastName: "Smith",
        phoneNumber: "555-234-5678",
        birthDate: createTimestamp(20000), // About 55 years ago
        bio: "Mayor of Springfield since 2020.",
        profilePhotoUrl: "https://randomuser.me/api/portraits/men/2.jpg",
        verification: {
          status: "verified",
          method: "internal",
          documentUrls: ["https://example.com/docs/mayor_id.jpg"],
          verificationDate: createTimestamp(120)
        },
        createdAt: createTimestamp(120),
        lastLogin: createTimestamp(1),
        accountStatus: "active"
      },
      {
        id: "user3",
        email: "sarah.johnson@example.com",
        firstName: "Sarah",
        lastName: "Johnson",
        phoneNumber: "555-345-6789",
        birthDate: createTimestamp(15000), // About 41 years ago
        bio: "Business owner and community advocate.",
        profilePhotoUrl: "https://randomuser.me/api/portraits/women/1.jpg",
        verification: {
          status: "verified",
          method: "internal",
          documentUrls: ["https://example.com/docs/sarah_id.jpg"],
          verificationDate: createTimestamp(45)
        },
        createdAt: createTimestamp(60),
        lastLogin: createTimestamp(2),
        accountStatus: "active"
      }
    ];

    console.log("Adding users...");
    for (const user of users) {
      const { id, ...userData } = user;
      await setDoc(doc(db, "users", id), userData);
      console.log(`Added user: ${user.firstName} ${user.lastName} (${id})`);
    }

    // 2. Add communities
    const communities = [
      {
        id: "community1",
        name: "Springfield",
        location: {
          city: "Springfield",
          state: "IL",
          zipCodes: ["62701", "62702", "62703"]
        },
        stats: {
          memberCount: 250,
          verifiedCount: 230,
          ghostCount: 20,
          lastUpdated: createTimestamp(0)
        },
        contractInfo: {
          startDate: createTimestamp(180),
          renewalDate: createTimestamp(-180), // 180 days in the future
          status: "active"
        },
        status: "active",
        createdAt: createTimestamp(180)
      },
      {
        id: "community2",
        name: "Shelbyville",
        location: {
          city: "Shelbyville",
          state: "IL",
          zipCodes: ["62565", "62566"]
        },
        stats: {
          memberCount: 150,
          verifiedCount: 130,
          ghostCount: 20,
          lastUpdated: createTimestamp(0)
        },
        contractInfo: {
          startDate: createTimestamp(90),
          renewalDate: createTimestamp(-270), // 270 days in the future
          status: "active"
        },
        status: "active",
        createdAt: createTimestamp(90)
      }
    ];

    console.log("Adding communities...");
    for (const community of communities) {
      const { id, ...communityData } = community;
      await setDoc(doc(db, "communities", id), communityData);
      console.log(`Added community: ${community.name} (${id})`);
    }

    // 3. Add official roles
    const officialRoles = [
      {
        id: "role1",
        communityId: "community1",
        title: "Mayor",
        displayName: "Mayor of Springfield",
        permissions: {
          canPin: true,
          canArchive: true,
          canPostEmergency: true,
          canModerate: true
        },
        badge: {
          iconUrl: "https://example.com/badges/mayor.png",
          color: "#1E40AF"
        },
        documentProvidedBy: "springfield_officials_2025.pdf",
        documentUploadDate: createTimestamp(180)
      },
      {
        id: "role2",
        communityId: "community1",
        title: "Citizen",
        displayName: "Verified Resident",
        permissions: {
          canPin: false,
          canArchive: false,
          canPostEmergency: false,
          canModerate: false
        },
        badge: {
          iconUrl: "https://example.com/badges/citizen.png",
          color: "#15803D"
        },
        documentProvidedBy: "springfield_officials_2025.pdf",
        documentUploadDate: createTimestamp(180)
      },
      {
        id: "role3",
        communityId: "community2",
        title: "Mayor",
        displayName: "Mayor of Shelbyville",
        permissions: {
          canPin: true,
          canArchive: true,
          canPostEmergency: true,
          canModerate: true
        },
        badge: {
          iconUrl: "https://example.com/badges/mayor.png",
          color: "#1E40AF"
        },
        documentProvidedBy: "shelbyville_officials_2025.pdf",
        documentUploadDate: createTimestamp(90)
      }
    ];

    console.log("Adding official roles...");
    for (const role of officialRoles) {
      const { id, ...roleData } = role;
      await setDoc(doc(db, "official_roles", id), roleData);
      console.log(`Added role: ${role.title} (${id})`);
    }

    // 4. Add community memberships
    const communityMemberships = [
      {
        id: "membership1",
        userId: "user1",
        communityId: "community1",
        type: "resident",
        address: {
          street: "123 Main St",
          city: "Springfield",
          state: "IL",
          zipCode: "62701",
          verificationDocumentUrls: ["https://example.com/docs/john_address.jpg"]
        },
        notificationPreferences: {
          emergencyAlerts: true,
          generalDiscussion: true,
          safetyAndCrime: true,
          governance: false,
          disasterAndFire: true,
          businesses: false,
          resourcesAndRecovery: true,
          communityEvents: true,
          pushNotifications: true
        },
        joinDate: createTimestamp(90),
        status: "active",
        verificationStatus: "verified"
      },
      {
        id: "membership2",
        userId: "user2",
        communityId: "community1",
        type: "resident",
        address: {
          street: "1 City Hall Plaza",
          city: "Springfield",
          state: "IL",
          zipCode: "62701",
          verificationDocumentUrls: ["https://example.com/docs/mayor_address.jpg"]
        },
        notificationPreferences: {
          emergencyAlerts: true,
          generalDiscussion: true,
          safetyAndCrime: true,
          governance: true,
          disasterAndFire: true,
          businesses: true,
          resourcesAndRecovery: true,
          communityEvents: true,
          pushNotifications: true
        },
        joinDate: createTimestamp(120),
        status: "active",
        verificationStatus: "verified"
      },
      {
        id: "membership3",
        userId: "user3",
        communityId: "community1",
        type: "resident",
        address: {
          street: "456 Oak St",
          city: "Springfield",
          state: "IL",
          zipCode: "62702",
          verificationDocumentUrls: ["https://example.com/docs/sarah_address.jpg"]
        },
        notificationPreferences: {
          emergencyAlerts: true,
          generalDiscussion: false,
          safetyAndCrime: true,
          governance: false,
          disasterAndFire: true,
          businesses: true,
          resourcesAndRecovery: false,
          communityEvents: true,
          pushNotifications: true
        },
        joinDate: createTimestamp(60),
        status: "active",
        verificationStatus: "verified"
      },
      {
        id: "membership4",
        userId: "user1",
        communityId: "community2",
        type: "ghost",
        address: {},
        notificationPreferences: {
          emergencyAlerts: true,
          generalDiscussion: false,
          safetyAndCrime: false,
          governance: false,
          disasterAndFire: true,
          businesses: false,
          resourcesAndRecovery: false,
          communityEvents: false,
          pushNotifications: false
        },
        joinDate: createTimestamp(30),
        status: "active",
        verificationStatus: "verified"
      }
    ];

    console.log("Adding community memberships...");
    for (const membership of communityMemberships) {
      const { id, ...membershipData } = membership;
      await setDoc(doc(db, "community_memberships", id), membershipData);
      console.log(`Added membership: user ${membership.userId} in ${membership.communityId} (${id})`);
    }

    // 5. Add user roles
    const userRoles = [
      {
        id: "userRole1",
        userId: "user1",
        communityId: "community1",
        roleId: "role2", // Citizen role
        assignedAt: createTimestamp(90)
      },
      {
        id: "userRole2",
        userId: "user2",
        communityId: "community1",
        roleId: "role1", // Mayor role
        assignedAt: createTimestamp(120)
      },
      {
        id: "userRole3",
        userId: "user3",
        communityId: "community1",
        roleId: "role2", // Citizen role
        assignedAt: createTimestamp(60)
      }
    ];

    console.log("Adding user roles...");
    for (const userRole of userRoles) {
      const { id, ...userRoleData } = userRole;
      await setDoc(doc(db, "user_roles", id), userRoleData);
      console.log(`Added user role: ${userRole.roleId} to user ${userRole.userId} (${id})`);
    }

    // 6. Add posts
    const posts = [
      {
        id: "post1",
        authorId: "user2", // Mayor
        communityId: "community1",
        title: "Welcome to Town Hall!",
        content: "We're excited to launch our new Town Hall platform. This will be our official channel for community updates and discussions.",
        categoryTag: "generalDiscussion",
        geographicTag: "City-wide",
        mediaUrls: ["https://example.com/images/townhall_launch.jpg"],
        stats: {
          upvotes: 25,
          downvotes: 0,
          commentCount: 3
        },
        author: {
          name: "Mayor Smith",
          role: "Mayor",
          badgeUrl: "https://example.com/badges/mayor.png"
        },
        status: "pinned",
        pinExpiresAt: createTimestamp(-7), // 7 days in future
        isEmergency: false,
        createdAt: createTimestamp(7),
        editedAt: null
      },
      {
        id: "post2",
        authorId: "user2", // Mayor
        communityId: "community1",
        title: "Emergency Alert: Severe Weather Warning",
        content: "The National Weather Service has issued a severe thunderstorm warning for our area from 3pm to 8pm today. Please stay indoors and away from windows.",
        categoryTag: "officialEmergencyAlerts",
        geographicTag: "City-wide",
        mediaUrls: [],
        stats: {
          upvotes: 15,
          downvotes: 0,
          commentCount: 2
        },
        author: {
          name: "Mayor Smith",
          role: "Mayor",
          badgeUrl: "https://example.com/badges/mayor.png"
        },
        status: "active",
        pinExpiresAt: null,
        isEmergency: true,
        createdAt: createTimestamp(2),
        editedAt: null
      },
      {
        id: "post3",
        authorId: "user1", // John Doe
        communityId: "community1",
        title: "Downtown Cleanup Initiative",
        content: "I'm organizing a downtown cleanup this Saturday from 9am to noon. We'll meet at Central Park. Tools and refreshments provided!",
        categoryTag: "communityEvents",
        geographicTag: "Downtown",
        mediaUrls: ["https://example.com/images/cleanup.jpg"],
        stats: {
          upvotes: 32,
          downvotes: 1,
          commentCount: 8
        },
        author: {
          name: "John Doe",
          role: "Citizen",
          badgeUrl: "https://example.com/badges/citizen.png"
        },
        status: "active",
        pinExpiresAt: null,
        isEmergency: false,
        createdAt: createTimestamp(5),
        editedAt: null
      },
      {
        id: "post4",
        authorId: "user3", // Sarah Johnson
        communityId: "community1",
        title: "Local Business Fair Announcement",
        content: "The annual Springfield Business Fair will be held next month at the convention center. Registration is now open for local vendors.",
        categoryTag: "businesses",
        geographicTag: "Convention Center",
        mediaUrls: ["https://example.com/images/business_fair.jpg"],
        stats: {
          upvotes: 18,
          downvotes: 0,
          commentCount: 4
        },
        author: {
          name: "Sarah Johnson",
          role: "Citizen",
          badgeUrl: "https://example.com/badges/citizen.png"
        },
        status: "active",
        pinExpiresAt: null,
        isEmergency: false,
        createdAt: createTimestamp(3),
        editedAt: null
      }
    ];

    console.log("Adding posts...");
    for (const post of posts) {
      const { id, ...postData } = post;
      await setDoc(doc(db, "posts", id), postData);
      console.log(`Added post: ${post.title} (${id})`);
    }

    // 7. Add comments
    const comments = [
      {
        id: "comment1",
        postId: "post1",
        authorId: "user1",
        parentCommentId: null,
        content: "This is fantastic! Looking forward to better community engagement.",
        stats: {
          upvotes: 5,
          downvotes: 0
        },
        author: {
          name: "John Doe",
          role: "Citizen",
          badgeUrl: "https://example.com/badges/citizen.png"
        },
        status: "active",
        createdAt: createTimestamp(7),
        editedAt: null
      },
      {
        id: "comment2",
        postId: "post1",
        authorId: "user3",
        parentCommentId: null,
        content: "Will there be a mobile app version available soon?",
        stats: {
          upvotes: 3,
          downvotes: 0
        },
        author: {
          name: "Sarah Johnson",
          role: "Citizen",
          badgeUrl: "https://example.com/badges/citizen.png"
        },
        status: "active",
        createdAt: createTimestamp(6),
        editedAt: null
      },
      {
        id: "comment3",
        postId: "post1",
        authorId: "user2",
        parentCommentId: "comment2",
        content: "Yes, we're working on a mobile app that should be available within the next few months.",
        stats: {
          upvotes: 4,
          downvotes: 0
        },
        author: {
          name: "Mayor Smith",
          role: "Mayor",
          badgeUrl: "https://example.com/badges/mayor.png"
        },
        status: "active",
        createdAt: createTimestamp(6),
        editedAt: null
      },
      {
        id: "comment4",
        postId: "post2",
        authorId: "user1",
        parentCommentId: null,
        content: "Is there a designated emergency shelter available?",
        stats: {
          upvotes: 8,
          downvotes: 0
        },
        author: {
          name: "John Doe",
          role: "Citizen",
          badgeUrl: "https://example.com/badges/citizen.png"
        },
        status: "active",
        createdAt: createTimestamp(2),
        editedAt: null
      },
      {
        id: "comment5",
        postId: "post2",
        authorId: "user2",
        parentCommentId: "comment4",
        content: "The community center and high school gym are both open as emergency shelters if needed.",
        stats: {
          upvotes: 10,
          downvotes: 0
        },
        author: {
          name: "Mayor Smith",
          role: "Mayor",
          badgeUrl: "https://example.com/badges/mayor.png"
        },
        status: "active",
        createdAt: createTimestamp(2),
        editedAt: null
      }
    ];

    console.log("Adding comments...");
    for (const comment of comments) {
      const { id, ...commentData } = comment;
      await setDoc(doc(db, "comments", id), commentData);
      console.log(`Added comment: ${comment.content.substring(0, 30)}... (${id})`);
    }

    // 8. Add activity logs
    const activityLogs = [
      {
        id: "activity1",
        userId: "user2",
        communityId: "community1",
        type: "pin",
        targetId: "post1",
        details: {
          oldStatus: "active",
          newStatus: "pinned",
          reason: "Important announcement for all community members"
        },
        createdAt: createTimestamp(7)
      },
      {
        id: "activity2",
        userId: "user1",
        communityId: "community1",
        type: "post_create",
        targetId: "post3",
        details: {},
        createdAt: createTimestamp(5)
      },
      {
        id: "activity3",
        userId: "user3",
        communityId: "community1",
        type: "post_create",
        targetId: "post4",
        details: {},
        createdAt: createTimestamp(3)
      }
    ];

    console.log("Adding activity logs...");
    for (const log of activityLogs) {
      const { id, ...logData } = log;
      await setDoc(doc(db, "activity_logs", id), logData);
      console.log(`Added activity log: ${log.type} on ${log.targetId} (${id})`);
    }

    // 9. Add user votes
    const userVotes = [
      {
        id: "vote1",
        userId: "user1",
        communityId: "community1",
        targetType: "post",
        targetId: "post1",
        voteType: "upvote",
        createdAt: createTimestamp(7)
      },
      {
        id: "vote2",
        userId: "user3",
        communityId: "community1",
        targetType: "post",
        targetId: "post1",
        voteType: "upvote",
        createdAt: createTimestamp(6)
      },
      {
        id: "vote3",
        userId: "user1",
        communityId: "community1",
        targetType: "post",
        targetId: "post2",
        voteType: "upvote",
        createdAt: createTimestamp(2)
      },
      {
        id: "vote4",
        userId: "user1",
        communityId: "community1",
        targetType: "comment",
        targetId: "comment5",
        voteType: "upvote",
        createdAt: createTimestamp(2)
      },
      {
        id: "vote5",
        userId: "user3",
        communityId: "community1",
        targetType: "post",
        targetId: "post3",
        voteType: "upvote",
        createdAt: createTimestamp(4)
      }
    ];

    console.log("Adding user votes...");
    for (const vote of userVotes) {
      const { id, ...voteData } = vote;
      await setDoc(doc(db, "user_votes", id), voteData);
      console.log(`Added vote: ${vote.voteType} on ${vote.targetType} ${vote.targetId} (${id})`);
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