// ./app/services/notificationService.ts
import { db } from "@/lib/firebase-client";
import { collection, query, where, orderBy, getDocs, onSnapshot, doc, updateDoc } from "firebase/firestore";
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

export function listenToUserNotifications(
  userId: string,
  callback: (notifications: Notification[]) => void
) {
  const notificationsRef = collection(db, "notifications");
  const q = query(
    notificationsRef,
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Notification));
    callback(notifications);
  });
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const notificationRef = doc(db, "notifications", notificationId);
  await updateDoc(notificationRef, { "status.read": true }); // Update nested field
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