// app/notifications/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, Check, X, AlertTriangle, Trash2 } from "lucide-react";
import { MainNavbar } from "@/components/ui/main-navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/app/services/authService";
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, deleteAllNotificationsForUser } from "@/app/services/notificationService";
import { UserModel } from "@/app/models/UserModel";
import { Notification } from "@/app/types/database";
import { Footer } from "@/components/ui/footer";
import { NotificationCard } from '@/components/notification/notification-card';
import { toast } from 'sonner';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";

export default function NotificationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserModel | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

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
  const handleMarkAllAsRead = async () => {
    if (!user) return;
    
    setIsActionLoading(true);
    
    try {
      await markAllNotificationsAsRead(user.id || "", true);
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => ({
          ...notification,
          status: { ...notification.status, read: true }
        }))
      );
      toast.success('All notifications marked as read');
    } catch (error: any) {
      console.error('Error marking all notifications as read:', error);
      toast.error(error.message || 'Failed to mark all notifications as read');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle marking a single notification as read/unread
  const handleMarkAsRead = async (notificationId: string, currentReadState: boolean) => {
    if (!user) return;

    setIsActionLoading(true);

    try {
      await markNotificationAsRead(notificationId, !currentReadState);
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, status: { ...notification.status, read: !currentReadState } }
            : notification
        )
      );
      toast.success(currentReadState ? 'Marked as unread' : 'Marked as read');
    } catch (err) {
      console.error("Error marking notification as read:", err);
      toast.error(err instanceof Error ? err.message : 'Failed to update notification status');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDelete = async (notificationId: string) => {
    if (!user) return;
    
    setIsActionLoading(true);
    
    try {
      await deleteNotification(notificationId);
      setNotifications(prevNotifications => 
        prevNotifications.filter(notification => notification.id !== notificationId)
      );
      toast.success('Notification deleted');
    } catch (error: any) {
      console.error('Error deleting notification:', error);
      toast.error(error.message || 'Failed to delete notification');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!user) return;
    
    setIsActionLoading(true);
    
    try {
      await deleteAllNotificationsForUser(user.id || "");
      setNotifications([]);
      toast.success('All notifications deleted');
    } catch (error: any) {
      console.error('Error deleting all notifications:', error);
      toast.error(error.message || 'Failed to delete all notifications');
    } finally {
      setIsActionLoading(false);
      setIsDeleteDialogOpen(false);
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
      <div className="flex-1 ml-0 flex flex-col min-h-screen bg-[var(--background)]"> {/* Removed ml-64 */}
        <main className="flex-grow p-6">
          <div className="max-w-4xl mx-auto"> {/* Already centered */}
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
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-[var(--foreground)] flex items-center">
                  <Bell className="h-6 w-6 mr-2" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                {notifications.length > 0 && (
                  <div className="flex gap-2 mb-4">
                    <Button
                      onClick={handleMarkAllAsRead}
                      disabled={isActionLoading || notifications.length === 0}
                      variant="outline"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Mark All as Read
                    </Button>
                    <Button
                      onClick={() => setIsDeleteDialogOpen(true)}
                      disabled={isActionLoading || notifications.length === 0}
                      variant="outline"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete All
                    </Button>
                  </div>
                )}
                
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
                    {notifications.map((notification) => (
                      <NotificationCard
                        key={notification.id}
                        notification={notification}
                        onMarkAsRead={handleMarkAsRead}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer /> {/* Replace footer with Footer component */}
      </div>

      {/* Delete All Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle>Delete All Notifications</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete all notifications? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isActionLoading}
            >
              Cancel
            </Button>
            <Button 
              variant="outline" 
              onClick={handleDeleteAll}
              disabled={isActionLoading}
            >
              {isActionLoading ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete All
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
