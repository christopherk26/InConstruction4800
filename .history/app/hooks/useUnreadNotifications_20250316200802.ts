// ./app/hooks/useUnreadNotifications.ts
"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase-client";
import { collection, query, where, onSnapshot, getDocs, updateDoc, doc } from "firebase/firestore";

interface Notification {
  id: string;
  userId: string;
  status: { read: boolean };
  message: string; // Added for display purposes
  communityId: string;
  postId: string;
  timestamp: Date;
}

export function useUnreadNotifications(userId: string | undefined) {
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!userId) {
      setHasUnread(false);
      return;
    }

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      where("status.read", "==", false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const unreadCount = snapshot.docs.length;
      setHasUnread(unreadCount > 0);
    }, (error) => {
      console.error("Error fetching unread notifications:", error);
      setHasUnread(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const markNotificationsAsRead = async () => {
    if (!userId) return;
    try {
      const q = query(
        collection(db, "notifications"),
        where("userId", "==", userId),
        where("status.read", "==", false)
      );
      const snapshot = await getDocs(q);
      const updates = snapshot.docs.map((docSnapshot) =>
        updateDoc(doc(db, "notifications", docSnapshot.id), { "status.read": true })
      );
      await Promise.all(updates);
      setHasUnread(false);
    } catch (error) {
      console.error("Error marking notifications as read:", error);
    }
  };

  return { hasUnread, markNotificationsAsRead };
}