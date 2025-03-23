// ./app/services/notificationService.ts
// app/services/notificationService.ts
import { db } from "@/lib/firebase-client";
import { collection, query, where, orderBy, getDocs, doc, updateDoc, writeBatch } from "firebase/firestore";
import { Notification } from "@/app/types/database";

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

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const notificationRef = doc(db, "notifications", notificationId);
  await updateDoc(notificationRef, { "status.read": true });
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

interface NotificationData {
  communityId: string;
  postId: string;
  title: string;
  body: string;
  categoryTag: string;
  userIds: string[];
}

export async function createNotificationsForCommunity(data: NotificationData): Promise<void> {
  const { communityId, postId, title, body, categoryTag, userIds } = data;
  const batch = writeBatch(db);
  const timestamp = { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 };

  userIds.forEach(userId => {
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
      createdAt: timestamp,
      priority: 1, // Adjust as needed
      status: {
        delivered: true,
        deliveredAt: timestamp,
        read: false
      },
      type: "post_created"
    };
    batch.set(notificationRef, notification);
  });

  await batch.commit();
}