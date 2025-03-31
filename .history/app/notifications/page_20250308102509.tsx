// ./app/notifications/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/app/services/authService";
import { listenToUserNotifications, markNotificationAsRead } from "@/app/services/notificationService";
import { UserModel } from "@/app/models/UserModel";
import { Notification } from "@/app/types/database";
import { MainNavbar } from "@/components/ui/main-navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function NotificationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserModel | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: () => void;
    async function setupListener() {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          router.push("/auth/login");
          return;
        }
        setUser(currentUser);

        unsubscribe = listenToUserNotifications(currentUser.id || "", (notifications) => {
          setNotifications(notifications);
          setLoading(false);
        });
      } catch (err) {
        console.error("Error setting up notifications:", err);
        setError("Failed to load notifications.");
        setLoading(false);
      }
    }
    setupListener();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [router]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, status: { ...notif.status, read: true } } : notif
        )
      );
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const formatDateTime = (timestamp: { seconds: number; nanoseconds: number }) => {
    const date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
      <main className="flex-1 ml-64 p-6 bg-[var(--background)]">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-[var(--card)] border-[var(--border)]">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-[var(--foreground)] flex items-center">
                <Bell className="h-6 w-6 mr-2" /> Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              {error && <p className="text-[var(--destructive)]">{error}</p>}
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
                          : notification.type === "emergency"
                          ? "bg-gray-100 border-gray-500"
                          : "bg-[var(--secondary)] border-[var(--primary)]"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-[var(--foreground)]">
                            {notification.content.title}
                          </h3>
                          <p className="text-[var(--muted-foreground)]">
                            {notification.content.body}
                          </p>
                          <p className="text-xs text-[var(--muted-foreground)] mt-1">
                            {formatDateTime(notification.createdAt)}
                          </p>
                          {notification.content.sourceId && (
                            <Link
                              href={`/communities/${notification.communityId}/posts/${notification.content.sourceId}`}
                              className="text-[var(--primary)] hover:underline text-sm"
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
                      {notification.type === "emergency" && (
                        <p className="text-xs text-red-600 mt-2">Emergency Alert - Priority: {notification.priority}</p>
                      )}
                    </div>
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