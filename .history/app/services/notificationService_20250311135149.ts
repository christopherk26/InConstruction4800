// ./app/services/notificationService.ts
import { db } from "@/lib/firebase-client";
import { collection, query, where, orderBy, getDocs, doc, updateDoc } from "firebase/firestore";
import { Notification } from "@/app/types/database";

export async function getUserNotifications(userId: string): Promise<Notification[]> {
  const notificationsRef = collection(db, "notifications");
  const q = query(
    notificationsRef,
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  console.log("Querying for userId:", userId); // Added debug line
  const snapshot = await getDocs(q);
  const notifications = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as Notification));
  console.log("Fetched Notifications:", notifications); // Debug
  return notifications;
}

export async function markAllNotificationsAsUnread(userId: string) {
  const notificationsRef = collection(db, "notifications");
  const q = query(notificationsRef, where("userId", "==", userId), where("isRead", "==", true));
  const snapshot = await getDocs(q);

  const updates = snapshot.docs.map((doc) =>
    updateDoc(doc.ref, { isRead: false })
  );
  await Promise.all(updates);
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