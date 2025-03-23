// app/notifications/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, Check, X, AlertTriangle } from "lucide-react";
import { MainNavbar } from "@/components/ui/main-navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/app/services/authService";
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead } from "@/app/services/notificationService";
import { UserModel } from "@/app/models/UserModel";
import { Notification } from "@/app/types/database";

export default function NotificationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserModel | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user and notifications
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

        const userNotifications = await getUserNotifications(currentUser.id || "");
        setNotifications(userNotifications);
      } catch (err) {
        console.error("Error fetching notifications:", err);
        setError("Failed to load notifications. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [router]);

  // Handle marking all notifications as read/unread
  const handleMarkAllAsRead = async (read: boolean) => {
    if (!user) return;

    try {
      await markAllNotificationsAsRead(user.id || "", read);
      setNotifications(prev =>
        prev.map(notification => ({
          ...notification,
          status: { ...notification.status, read }
        }))
      );
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
      setError("Failed to update notifications. Please try again.");
    }
  };

  // Handle marking a single notification as read/unread
  const handleMarkAsRead = async (notificationId: string, currentReadState: boolean) => {
    try {
      const newReadState = !currentReadState;
      await markNotificationAsRead(notificationId, newReadState);
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, status: { ...notification.status, read: newReadState } }
            : notification
        )
      );
    } catch (err) {
      console.error("Error marking notification as read:", err);
      setError("Failed to update notification. Please try again.");
    }
  };

  // Loading state
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

  // Error state
  if (error && !user) {
    return (
      <div className="min-h-screen flex bg-[var(--background)]">
        {user && <MainNavbar user={user} />}
        <div className="flex-1 ml-64 flex flex-col min-h-screen bg-[var(--background)]">
          <main className="flex-grow p-6">
            <div className="max-w-4xl mx-auto">
              <Card className="bg-[var(--card)] border-[var(--border)]">
                <CardHeader>
                  <CardTitle className="text-xl text-[var(--foreground)]">Error</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-[var(--muted-foreground)]">{error}</p>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" onClick={() => router.back()}>
                    Go Back
                  </Button>
                </CardFooter>
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

  return (
    <div className="min-h-screen flex bg-[var(--background)]">
      {user && <MainNavbar user={user} />}
      <div className="flex-1 ml-64 flex flex-col min-h-screen bg-[var(--background)]">
        <main className="flex-grow p-6">
          <div className="max-w-4xl mx-auto">
            {/* Navigation */}
            <div className="mb-6">
              <div className="text-sm text-[var(--muted-foreground)] mb-4">
                <Link href="/dashboard" className="hover:underline">Dashboard</Link>
                {" / "}
                <span>Notifications</span>
              </div>
            </div>

            {/* Notifications Header */}
            <Card className="bg-[var(--card)] border-[var(--border)]">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-2xl font-bold text-[var(--foreground)] flex items-center">
                  <Bell className="h-6 w-6 mr-2" />
                  Notifications
                </CardTitle>
                {notifications.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => handleMarkAllAsRead(true)}
                    className="text-[var(--foreground)] border-[var(--border)]"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Mar All As Read
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="bg-gray-100 dark:bg-gray-900 text-red-800 dark:text-red-100 p-4 rounded-md flex items-center mb-4">
                    <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
                    <p>{error}</p>
                  </div>
                )}
                {notifications.length === 0 ? (
                  <p className="text-[var(--muted-foreground)] text-center">No notifications to display.</p>
                ) : (
                  <div className="space-y-4">
                    {notifications.map(notification => (
                      <div
                        key={notification.id}
                        className={`p-4 rounded-md border ${
                          notification.status.read
                            ? "bg-[var(--background)] border-[var(--border)]"
                            : "bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700"
                        } flex justify-between items-start`}
                      >
                        <div>
                          <Link
                            href={`/communities/${notification.communityId}/posts/${notification.content.sourceId}`}
                            className="text-[var(--foreground)] font-semibold hover:underline"
                          >
                            {notification.content.title}
                          </Link>
                          <p className="text-[var(--muted-foreground)] mt-1">{notification.content.body}</p>
                          <p className="text-xs text-[var(--muted-foreground)] mt-2">
                            {new Date(notification.createdAt.seconds * 1000).toLocaleString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkAsRead(notification.id, notification.status.read)}
                          className="text-[var(--foreground)]"
                        >
                          {notification.status.read ? (
                            <>
                              <X className="h-4 w-4 mr-1" />
                              Mark as Unread
                            </>
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              Mark as Read
                            </>
                          )}
                        </Button>
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
