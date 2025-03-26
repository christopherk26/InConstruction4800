import { useState, useEffect } from "react";
import { db } from "@/lib/firebase-client";
import { useAuth } from "@/app/context/AuthContext"; 
import { collection, query, where, onSnapshot, getDocs, updateDoc, doc } from "firebase/firestore";

const useUnreadNotifications = () => {
  const [hasUnread, setHasUnread] = useState(false);
  const [notifications, setNotifications] = useState([]); // ✅ Store notifications locally
  const { currentUser } = useAuth(); 

  useEffect(() => {
    if (!currentUser) return;

    const notificationsRef = collection(db, "users", currentUser.uid, "notifications");
    const q = query(notificationsRef, where("read", "==", false));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const unreadNotifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotifications(unreadNotifications);
      setHasUnread(unreadNotifications.length > 0);
    });

    return () => unsubscribe();
  }, [currentUser]);

  /**
   * Marks a single notification as read & updates UI instantly
   */
  const markNotificationAsRead = async (id) => {
    if (!currentUser) return;

    const notificationRef = doc(db, "users", currentUser.uid, "notifications", id);
    await updateDoc(notificationRef, { read: true });

    // ✅ Update UI instantly without needing a page refresh
    setNotifications(prev => prev.filter(notification => notification.id !== id));
    setHasUnread(notifications.length - 1 > 0);
  };

  /**
   * Marks all notifications as read & updates UI instantly
   */
  const markAllNotificationsAsRead = async () => {
    if (!currentUser) return;

    const notificationsRef = collection(db, "users", currentUser.uid, "notifications");
    const q = query(notificationsRef, where("read", "==", false));

    const snapshot = await getDocs(q);
    snapshot.forEach(async (docSnap) => {
      const notificationRef = doc(db, "users", currentUser.uid, "notifications", docSnap.id);
      await updateDoc(notificationRef, { read: true });
    });

    // ✅ Clear all notifications from state immediately
    setNotifications([]);
    setHasUnread(false);
  };

  return { hasUnread, notifications, markNotificationAsRead, markAllNotificationsAsRead };
};

export default useUnreadNotifications;
