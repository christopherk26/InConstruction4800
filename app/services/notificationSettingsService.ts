import { db } from "@/lib/firebase-client";
import { collection, doc, getDoc, updateDoc, query, where, getDocs } from "firebase/firestore";
import { Timestamp } from "firebase/firestore";

// Define the NotificationPreferences type to match the CommunityMembership interface
export type NotificationPreferences = {
  emergencyAlerts: boolean;
  generalDiscussion: boolean;
  safetyAndCrime: boolean; // Note the field name change
  governance: boolean;
  disasterAndFire: boolean; // Note the field name change
  businesses: boolean;
  resourcesAndRecovery: boolean; // Note the field name change
  communityEvents: boolean;
  pushNotifications: boolean;
};

// Default notification preferences (all enabled by default)
const defaultPreferences: NotificationPreferences = {
  emergencyAlerts: true,
  generalDiscussion: true,
  safetyAndCrime: true, // Updated field name
  governance: true,
  disasterAndFire: true, // Updated field name
  businesses: true,
  resourcesAndRecovery: true, // Updated field name
  communityEvents: true,
  pushNotifications: true,
};

// Define the membership type to match your CommunityMembership interface
interface Membership {
  id: string;
  userId: string;
  communityId: string;
  type: 'resident' | 'ghost';
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    verificationDocumentUrls: string[];
  };
  notificationPreferences?: {
    emergencyAlerts: boolean;
    generalDiscussion: boolean;
    safetyAndCrime: boolean;
    governance: boolean;
    disasterAndFire: boolean;
    businesses: boolean;
    resourcesAndRecovery: boolean;
    communityEvents: boolean;
    pushNotifications: boolean;
  };
  joinDate: { seconds: number; nanoseconds: number };
  status: 'active' | 'suspended';
  verificationStatus: 'verified' | 'pending' | 'rejected';
}

// Find the membership document for a user and community
async function findMembershipDoc(userId: string, communityId: string): Promise<Membership | null> {
  try {
    const membershipRef = collection(db, 'community_memberships');
    const q = query(
      membershipRef, 
      where('userId', '==', userId),
      where('communityId', '==', communityId)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    // Return the first matching document
    return {
      id: querySnapshot.docs[0].id,
      ...querySnapshot.docs[0].data()
    } as Membership;
  } catch (error) {
    console.error("Error finding membership document:", error);
    throw error;
  }
}

// Initialize notification preferences for a user and community
export async function initializeNotificationPreferences(userId: string, communityId: string): Promise<void> {
  if (!userId || !communityId) {
    throw new Error("userId and communityId are required.");
  }

  // Find the membership document
  const membership = await findMembershipDoc(userId, communityId);
  
  if (!membership) {
    throw new Error("Membership not found for this user and community.");
  }
  
  // Check if notification preferences already exist
  // Using optional chaining to avoid TypeScript errors
  if (!membership?.notificationPreferences) {
    // Update the membership document with default preferences
    const membershipRef = doc(db, 'community_memberships', membership.id);
    await updateDoc(membershipRef, {
      notificationPreferences: defaultPreferences
    });
  }
}

// Check if notification preferences exist for a user and community
export async function hasNotificationPreferences(userId: string, communityId: string): Promise<boolean> {
  if (!userId || !communityId) {
    throw new Error("userId and communityId are required.");
  }

  const membership = await findMembershipDoc(userId, communityId);
  return !!(membership && membership.notificationPreferences);
}

// Get notification preferences for a user and community
export async function getNotificationPreferences(userId: string, communityId: string): Promise<NotificationPreferences> {
  if (!userId || !communityId) {
    throw new Error("userId and communityId are required.");
  }

  const membership = await findMembershipDoc(userId, communityId);
  
  if (!membership) {
    throw new Error("Membership not found for this user and community.");
  }

  if (membership.notificationPreferences) {
    const prefs = membership.notificationPreferences;
    return {
      emergencyAlerts: prefs.emergencyAlerts ?? defaultPreferences.emergencyAlerts,
      generalDiscussion: prefs.generalDiscussion ?? defaultPreferences.generalDiscussion,
      safetyAndCrime: prefs.safetyAndCrime ?? defaultPreferences.safetyAndCrime,
      governance: prefs.governance ?? defaultPreferences.governance,
      disasterAndFire: prefs.disasterAndFire ?? defaultPreferences.disasterAndFire,
      businesses: prefs.businesses ?? defaultPreferences.businesses,
      resourcesAndRecovery: prefs.resourcesAndRecovery ?? defaultPreferences.resourcesAndRecovery,
      communityEvents: prefs.communityEvents ?? defaultPreferences.communityEvents,
      pushNotifications: prefs.pushNotifications ?? defaultPreferences.pushNotifications,
    };
  }

  // If no preferences exist, initialize them and return the defaults
  await initializeNotificationPreferences(userId, communityId);
  return { ...defaultPreferences };
}

// Update notification preferences for a user and community
export async function updateNotificationPreferences(
  userId: string,
  communityId: string,
  preferences: NotificationPreferences
): Promise<void> {
  if (!userId || !communityId) {
    throw new Error("userId and communityId are required.");
  }

  const membership = await findMembershipDoc(userId, communityId);
  
  if (!membership) {
    throw new Error("Membership not found for this user and community.");
  }

  const membershipRef = doc(db, 'community_memberships', membership.id);
  await updateDoc(membershipRef, {
    notificationPreferences: preferences
  });
}