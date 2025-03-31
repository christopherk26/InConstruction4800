"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/app/services/authService";
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead } from "@/app/services/notificationService"; // Added markAllNotificationsAsRead
import { UserModel } from "@/app/models/UserModel";
import { MainNavbar } from "@/components/ui/main-navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Notification {
  id: string;
  title: string;
  message: string;
  createdAt: { seconds: number; nanoseconds: number };
  isRead: boolean;
  isEmergency?: boolean; // Added for emergency alerts
  priority?: number; // Added for priority display
}

export default function NotificationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserModel | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user and notifications
  useEffect(() => {
    async function fetchData() {
      try {
        setLoadingUser(true);
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          router.push("/auth/login");
          return;
        }

        const isVerified = await currentUser.isVerified();
        if (!isVerified) {
          router.push("/auth/authenticate-person");
          return;
        }

        setUser(currentUser);
        setLoadingUser(false);

        // Fetch notifications
        setLoadingNotifications(true);
        const userNotifications = await getUserNotifications(currentUser.id || "");
        setNotifications(userNotifications as Notification[]);
        setLoadingNotifications(false);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load notifications.");
      }
    }

    fetchData();
  }, [router]);

  // Mark a single notification as read
  const handleMarkAsRead = async (notificationId: string) => {
    if (!user) return;
    try {
      await markNotificationAsRead(user.id || "", notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    if (!user) return;
    try {
      await markAllNotificationsAsRead(user.id || "");
      setNotifications((prev) =>
        prev.map((n) => (n.isRead ? n : { ...n, isRead: true }))
      );
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
    }
  };

  // Format timestamp
  const formatDateTime = (timestamp: { seconds: number; nanoseconds: number }) => {
    const date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Loading state
  if (loadingUser || loadingNotifications) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent"></div>
          <p className="text-[var(--foreground)]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex bg-[var(--background)]">
      <MainNavbar user={user} />

      <main className="flex-1 ml-64 p-6 bg-[var(--background)]">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-[var(--card)] border-[var(--border)]">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-2xl font-bold text-[var(--foreground)]">
                  Notifications
                </CardTitle>
                {notifications.some((n) => !n.isRead) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    className="text-[var(--foreground)] border-[var(--border)] hover:bg-[var(--secondary)]"
                  >
                    Mark All as Read
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {error && (
                <p className="text-[var(--destructive)] mb-4">{error}</p>
              )}
              {notifications.length === 0 ? (
                <p className="text-[var(--muted-foreground)] text-center">
                  No notifications yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <Card
                      key={notification.id}
                      className={`bg-[var(--card)] border-[var(--border)] ${
                        notification.isRead ? "opacity-50" : ""
                      }`}
                    >
                      <CardContent className="p-4 flex justify-between items-start">
                        <div>
                          <p
                            className={`font-medium ${
                              notification.isEmergency
                                ? "text-red-500 dark:text-red-400"
                                : "text-[var(--foreground)]"
                            }`}
                          >
                            {notification.title}
                          </p>
                          <p className="text-[var(--foreground)]">
                            {notification.message}
                          </p>
                          <p className="text-sm text-[var(--muted-foreground)] mt-1">
                            {formatDateTime(notification.createdAt)}
                          </p>
                          {notification.isEmergency && notification.priority && (
                            <p
                              className={`text-sm ${
                                notification.isEmergency
                                  ? "text-red-500 dark:text-red-400"
                                  : "text-[var(--muted-foreground)]"
                              } mt-1`}
                            >
                              Emergency Alert - Priority: {notification.priority}
                            </p>
                          )}
                        </div>
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="text-[var(--foreground)] hover:bg-[var(--secondary)]"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}