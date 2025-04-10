// app/services/notificationService.ts
import { db } from "@/lib/firebase-client";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  doc, 
  updateDoc, 
  writeBatch, 
  Timestamp, 
  limit,
  deleteDoc
} from "firebase/firestore";
import { 
  Notification, 
  FirestoreTimestamp,
  User
} from "@/app/types/database";
import { 
  getNotificationPreferences, 
  NotificationPreferences 
} from "@/app/services/notificationSettingsService";
import { getCommunityUsers } from "@/app/services/userService";

// Get user's notifications
export async function getUserNotifications(userId: string): Promise<Notification[]> {
  const notificationsRef = collection(db, "notifications");
  const q = query(
    notificationsRef,
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as Notification));
}

// Mark a single notification as read/unread
export async function markNotificationAsRead(notificationId: string, read: boolean): Promise<void> {
  const notificationRef = doc(db, "notifications", notificationId);
  await updateDoc(notificationRef, { "status.read": read });
}

// Mark all notifications for a user as read/unread
export async function markAllNotificationsAsRead(userId: string, read: boolean): Promise<void> {
  const notificationsRef = collection(db, "notifications");
  const q = query(
    notificationsRef,
    where("userId", "==", userId),
    where("status.read", "==", !read) // Only update notifications that are in the opposite state
  );
  const snapshot = await getDocs(q);

  const batch = writeBatch(db);
  snapshot.docs.forEach(doc => {
    batch.update(doc.ref, { "status.read": read });
  });

  await batch.commit();
}

// Get count of unread notifications for a user
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const notificationsRef = collection(db, "notifications");
  const q = query(
    notificationsRef,
    where("userId", "==", userId),
    where("status.read", "==", false)
  );
  const snapshot = await getDocs(q);
  return snapshot.size;
}

// Helper to map category tags to preference keys for proper type checking
function mapCategoryTagToPreferenceKey(categoryTag: string): keyof NotificationPreferences {
  const mapping: Record<string, keyof NotificationPreferences> = {
    'generalDiscussion': 'generalDiscussion',
    'safetyAndCrime': 'safetyAndCrime',
    'governance': 'governance',
    'disasterAndFire': 'disasterAndFire',
    'businesses': 'businesses',
    'resourcesAndRecovery': 'resourcesAndRecovery',
    'communityEvents': 'communityEvents',
    'officialEmergencyAlerts': 'emergencyAlerts'
  };
  
  return mapping[categoryTag] || 'generalDiscussion';
}

// Interface for notification creation data
interface NotificationData {
  communityId: string;
  postId: string;
  title: string;
  body: string;
  categoryTag: string;
  userIds: string[];  // Make this required instead of optional
}

// Create notifications for users in a community with fan-out approach
export async function createNotificationsForCommunity(data: NotificationData): Promise<void> {
  const { communityId, postId, title, body, categoryTag, userIds } = data;
  
  try {
    // If userIds is empty, get all community members
    let recipientIds: string[] = [];
    
    if (userIds.length === 0) {
      // getCommunityUsers returns User[] with id properties
      const communityUsers = await getCommunityUsers(communityId);
      
      // Extract just the id values from the returned User objects
      recipientIds = communityUsers
        .map(user => user.id || '')
        .filter(id => id !== '');
    } else {
      recipientIds = userIds;
    }
    
    // Create batches (Firestore limits batches to 500 operations)
    const batchSize = 450; // Keep under Firestore's 500 limit for safety
    const batches = [];
    let currentBatch = writeBatch(db);
    let operationCount = 0;
    
    const timestamp = Timestamp.fromDate(new Date());
    const firestoreTimestamp: FirestoreTimestamp = {
      seconds: timestamp.seconds,
      nanoseconds: timestamp.nanoseconds
    };
    
    // Process each user
    for (const userId of recipientIds) {
      try {
        // Skip empty user IDs
        if (!userId) continue;
        
        // Get user's notification preferences for this community
        let preferences: NotificationPreferences;
        try {
          preferences = await getNotificationPreferences(userId, communityId);
        } catch (prefError) {
          // If we can't get preferences (maybe user doesn't have membership), skip this user
          console.warn(`Could not get notification preferences for user ${userId} in community ${communityId}:`, prefError);
          continue;
        }
        
        // Skip users who have turned off notifications for this category
        const preferenceKey = mapCategoryTagToPreferenceKey(categoryTag);
        const shouldNotify = categoryTag === 'officialEmergencyAlerts' ? 
          true : // Always send emergency alerts
          (preferences[preferenceKey] === true);
        
        if (!shouldNotify) continue;
        
        // Create notification document
        const notificationRef = doc(collection(db, "notifications"));
        const notification: Notification = {
          id: notificationRef.id,
          userId,
          communityId,
          content: {
            title,
            body,
            sourceId: postId,
            sourceCategoryTag: categoryTag
          },
          createdAt: firestoreTimestamp,
          priority: categoryTag === 'officialEmergencyAlerts' ? 3 : 1, // Higher priority for emergencies
          status: {
            delivered: true,
            deliveredAt: firestoreTimestamp,
            read: false
          },
          type: "post_created"
        };
        
        // Add to current batch
        currentBatch.set(notificationRef, notification);
        operationCount++;
        
        // If batch is full, add it to batches array and create a new batch
        if (operationCount >= batchSize) {
          batches.push(currentBatch);
          currentBatch = writeBatch(db);
          operationCount = 0;
        }
      } catch (error) {
        console.error(`Error creating notification for user ${userId}:`, error);
        // Continue with other users even if one fails
      }
    }
    
    // Add the last batch if it has operations
    if (operationCount > 0) {
      batches.push(currentBatch);
    }
    
    // Commit all batches sequentially
    for (const batch of batches) {
      await batch.commit();
    }
    
    console.log(`Successfully created notifications for ${recipientIds.length} users in ${batches.length} batches`);
    
  } catch (error) {
    console.error("Error in createNotificationsForCommunity:", error);
    throw error;
  }
}

// Delete a single notification
export async function deleteNotification(notificationId: string): Promise<boolean> {
  try {
    const notificationRef = doc(db, "notifications", notificationId);
    await deleteDoc(notificationRef);
    return true;
  } catch (error) {
    console.error("Error deleting notification:", error);
    return false;
  }
}

// Delete all notifications for a user
export async function deleteAllNotificationsForUser(userId: string): Promise<boolean> {
  try {
    const notificationsRef = collection(db, "notifications");
    const q = query(
      notificationsRef,
      where("userId", "==", userId)
    );
    const snapshot = await getDocs(q);

    // Use batch operations for better performance
    const batchSize = 450; // Keep under Firestore's 500 limit for safety
    const batches = [];
    let currentBatch = writeBatch(db);
    let operationCount = 0;

    snapshot.docs.forEach(doc => {
      currentBatch.delete(doc.ref);
      operationCount++;

      // If batch is full, add it to batches array and create a new batch
      if (operationCount >= batchSize) {
        batches.push(currentBatch);
        currentBatch = writeBatch(db);
        operationCount = 0;
      }
    });

    // Add the last batch if it has operations
    if (operationCount > 0) {
      batches.push(currentBatch);
    }

    // Commit all batches sequentially
    for (const batch of batches) {
      await batch.commit();
    }

    console.log(`Successfully deleted ${snapshot.size} notifications for user ${userId}`);
    return true;
  } catch (error) {
    console.error("Error deleting all notifications for user:", error);
    return false;
  }
}