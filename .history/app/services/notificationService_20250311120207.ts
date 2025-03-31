// ./app/services/notificationService.ts
import { db } from "@/lib/firebase-client";
import { collection, query, where, orderBy, getDocs, doc, updateDoc } from "firebase/firestore";
import { Notification } from "@/app/types/database";

// ./app/services/notificationService.ts
export async function getUserNotifications(userId: string): Promise<Notification[]> {
  const notificationsRef = collection(db, "notifications");
  const q = query(
    notificationsRef,
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  console.log("Querying for userId:", userId);
  const snapshot = await getDocs(q);
  const notifications = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId,
      content: {
        title: data.content?.title || "No Title",
        body: data.content?.body || "No Message",
        sourceId: data.content?.sourceId,
      },
      createdAt: data.createdAt,
      status: data.status,
      priority: data.priority || 0,
      emergency: data.emergency || false,
      communityId: data.communityId,
      postId: data.postId,
    } as Notification;
  });
  console.log("Fetched Notifications:", JSON.stringify(notifications, null, 2)); // Debug
  return notifications;
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const notificationRef = doc(db, "notifications", notificationId);
  await updateDoc(notificationRef, { "status.read": true });
}

export async function markAllAsRead(userId: string): Promise<void> {
  const notificationsRef = collection(db, "notifications");
  const q = query(
    notificationsRef,
    where("userId", "==", userId),
    where("status.read", "==", false)
  );
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  snapshot.docs.forEach(doc => {
    batch.update(doc.ref, { "status.read": true });
  });
  await batch.commit();
}

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