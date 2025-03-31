// ./app/hooks/useUnreadNotifications.ts
"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase-client";
import { collection, query, where, onSnapshot } from "firebase/firestore";

interface Notification {
  id: string;
  userId: string;
  status: {
    read: boolean;
  };
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
    console.log("Marking notifications as read for user:", userId);
    setHasUnread(false); // Simulate marking as read
  };

  return { hasUnread, markNotificationsAsRead };
}
