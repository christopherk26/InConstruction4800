import { db } from "@/lib/firebase-client";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Timestamp } from "firebase/firestore";

// Define the NotificationPreferences type
export type NotificationPreferences = {
  emergencyAlerts: boolean;
  generalDiscussion: boolean;
  safetyCrime: boolean;
  governance: boolean;
  disasterFire: boolean;
  businesses: boolean;
  resourcesRecovery: boolean;
  communityEvents: boolean;
  pushNotifications: boolean;
};

// Default notification preferences (all enabled by default)
const defaultPreferences: NotificationPreferences = {
  emergencyAlerts: true,
  generalDiscussion: true,
  safetyCrime: true,
  governance: true,
  disasterFire: true,
  businesses: true,
  resourcesRecovery: true,
  communityEvents: true,
  pushNotifications: true,
};

// Initialize notification preferences for a user and community
export async function initializeNotificationPreferences(userId: string, communityId: string): Promise<void> {
  if (!userId || !communityId) {
    throw new Error("userId and communityId are required.");
  }

  const notificationPrefsRef = doc(db, `users/${userId}/communityPrefs/${communityId}`);
  const docSnap = await getDoc(notificationPrefsRef);

  if (!docSnap.exists()) {
    await setDoc(notificationPrefsRef, {
      ...defaultPreferences,
      updatedAt: Timestamp.fromDate(new Date()),
    });
  }
}

// Check if notification preferences exist for a user and community
export async function hasNotificationPreferences(userId: string, communityId: string): Promise<boolean> {
  if (!userId || !communityId) {
    throw new Error("userId and communityId are required.");
  }

  const notificationPrefsRef = doc(db, `users/${userId}/communityPrefs/${communityId}`);
  const docSnap = await getDoc(notificationPrefsRef);
  return docSnap.exists();
}

// Get notification preferences for a user and community
export async function getNotificationPreferences(userId: string, communityId: string): Promise<NotificationPreferences> {
  if (!userId || !communityId) {
    throw new Error("userId and communityId are required.");
  }

  const notificationPrefsRef = doc(db, `users/${userId}/communityPrefs/${communityId}`);
  const docSnap = await getDoc(notificationPrefsRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      emergencyAlerts: data.emergencyAlerts ?? defaultPreferences.emergencyAlerts,
      generalDiscussion: data.generalDiscussion ?? defaultPreferences.generalDiscussion,
      safetyCrime: data.safetyCrime ?? defaultPreferences.safetyCrime,
      governance: data.governance ?? defaultPreferences.governance,
      disasterFire: data.disasterFire ?? defaultPreferences.disasterFire,
      businesses: data.businesses ?? defaultPreferences.businesses,
      resourcesRecovery: data.resourcesRecovery ?? defaultPreferences.resourcesRecovery,
      communityEvents: data.communityEvents ?? defaultPreferences.communityEvents,
      pushNotifications: data.pushNotifications ?? defaultPreferences.pushNotifications,
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

  const notificationPrefsRef = doc(db, `users/${userId}/communityPrefs/${communityId}`);
  await setDoc(
    notificationPrefsRef,
    {
      ...preferences,
      updatedAt: Timestamp.fromDate(new Date()),
    },
    { merge: true }
  );
}