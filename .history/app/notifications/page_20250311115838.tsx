// ./app/notifications/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Bell, CheckCircle } from "lucide-react";
import { MainNavbar } from "@/components/ui/main-navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/app/services/authService";
import { getUserNotifications, markNotificationAsRead, markAllAsRead, getUnreadNotificationCount } from "@/app/services/notificationService";
import { UserModel } from "@/app/models/UserModel";
import { Notification } from "@/app/types/database";
import Link from "next/link";

export default function NotificationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserModel | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = state<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
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

        const userNotifications = await getUserNotifications(currentUser.id!);
        setNotifications(userNotifications);

        const count = await getUnreadNotificationCount(currentUser.id!);
        setUnreadCount(count);
      } catch (err) {
        console.error("Error fetching notifications:", err);
        setError("Failed to load notifications.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [router]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, status: { ...notification.status, read: true } }
            : notification
        )
      );
      setUnreadCount(prev => prev - 1);
    } catch (err) {
      console.error("Error marking notification as read:", err);
      setError("Failed to mark notification as read.");
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    try {
      await markAllAsRead(user.id!);
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, status: { ...notification.status, read: true } }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
      setError("Failed to mark all notifications as read.");
    }
  };

  const formatDateTime = (timestamp: { seconds: number; nanoseconds: number }) => {
    const date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
    return format(date, "MMM d, yyyy, h:mm a"); // e.g., "Feb 24, 2025, 8:39 PM"
  };

  if (loading) {
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
      <div className="flex-1 ml-64 flex flex-col min-h-screen bg-[var(--background)]">
        <main className="flex-grow p-6">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-[var(--card)] border-[var(--border)]">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-2xl font-bold text-[var(--foreground)] flex items-center">
                    <Bell className="h-6 w-6 mr-2" />
                    Notifications
                  </CardTitle>
                  {unreadCount > 0 && (
                    <Button onClick={handleMarkAllAsRead} variant="outline">
                      Mark All as Read
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {error && <p className="text-[var(--destructive)] mb-4">{error}</p>}
                {notifications.length === 0 ? (
                  <p className="text-[var(--muted-foreground)]">No notifications yet.</p>
                ) : (
                  <div className="space-y-4">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 rounded-md border ${
                          notification.status.read
                            ? "bg-[var(--muted)]"
                            : notification.emergency
                            ? "bg-red-100 border-red-500"
                            : "bg-[var(--secondary)] border-[var(--primary)]"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-[var(--foreground)]">
                              {notification.content.title || "No Title"}
                            </h3>
                            <p className="text-[var(--muted-foreground)]">
                              {notification.content.body || "No Message"}
                            </p>
                            <p className="text-xs text-[var(--muted-foreground)] mt-1">
                              {formatDateTime(notification.createdAt)}
                            </p>
                            {(notification.content.sourceId || notification.postId) &&
                              notification.communityId && (
                                <Link
                                  href={`/communities/${notification.communityId}/posts/${
                                    notification.content.sourceId || notification.postId
                                  }`}
                                  className="text-[var(--primary)] hover:underline text-sm mt-1 inline-block"
                                >
                                  View Details
                                </Link>
                              )}
                          </div>
                          {!notification.status.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="text-[var(--foreground)] hover:bg-[var(--accent)]"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Mark as Read
                            </Button>
                          )}
                        </div>
                        {notification.emergency && (
                          <p className="text-xs text-red-600 mt-2">
                            Emergency Alert - Priority: {notification.priority}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
        <footer className="p-2 text-center text-[var(--muted-foreground)] border-t border-[var(--border)]">
          © 2025 In Construction, Inc. All rights reserved.
        </footer>
      </div>
    </div>
  );
}