"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, Check, X, ExternalLink, MoreVertical, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Notification } from "@/app/types/database";
import { NotificationActionDropdown } from "./notification-action-dropdown";

interface NotificationCardProps {
  notification: Notification;
  onMarkAsRead: (notificationId: string, currentReadState: boolean) => Promise<void>;
  onDelete: (notificationId: string) => Promise<void>;
}

export function NotificationCard({ 
  notification, 
  onMarkAsRead,
  onDelete
}: NotificationCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  // Format notification timestamp
  const formatTimeAgo = (timestamp: { seconds: number, nanoseconds: number }) => {
    const date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    // Convert difference to appropriate units
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    // Return formatted string
    if (diffYears > 0) {
      return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
    } else if (diffMonths > 0) {
      return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
    } else if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMins > 0) {
      return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  // Handle direct mark as read/unread
  const handleReadStatus = async () => {
    setIsLoading(true);
    try {
      await onMarkAsRead(notification.id, notification.status.read);
    } catch (error) {
      console.error("Error updating notification read status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await onDelete(notification.id);
    } catch (error) {
      console.error("Error deleting notification:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Create the link URL for post details
  const postDetailUrl = `/communities/${notification.communityId}/posts/${notification.content.sourceId}`;

  // Determine card styles based on read status
  const cardClass = notification.status.read
    ? "bg-[var(--background)] border-[var(--border)]"
    : "bg-[var(--background)] border-2 border-[#1DA1F2]";

  // Determine category style (similar to post card)
  const getCategoryStyle = (category: string) => {
    switch (category) {
      case 'officialEmergencyAlerts':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
      default:
        return 'bg-[var(--muted)] text-[var(--muted-foreground)]';
    }
  };

  return (
    <Card className={`relative overflow-hidden ${cardClass}`}>
      <CardContent className="pt-4 pb-2">
        <div className="flex justify-between items-start">
          <div className="flex-1 pr-10">
            {/* Notification Title */}
            <Link 
              href={postDetailUrl} 
              className="text-[var(--foreground)] font-semibold text-base hover:underline"
            >
              {notification.content.title}
            </Link>
            
            {/* Notification Body */}
            <p className="text-[var(--muted-foreground)] mt-1">
              {notification.content.body}
            </p>
            
            {/* Notification Metadata */}
            <div className="flex items-center mt-2 text-xs text-[var(--muted-foreground)]">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full ${getCategoryStyle(notification.content.sourceCategoryTag)}`}>
                  {notification.content.sourceCategoryTag}
                </span>
                <span className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatTimeAgo(notification.createdAt)}
                </span>
              </div>
            </div>
            
            {/* Action Buttons - Moved to bottom left */}
            <div className="flex items-center gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReadStatus}
                disabled={isLoading}
                className="h-7 px-2 text-xs"
              >
                {notification.status.read ? (
                  <>
                    <X className="h-3 w-3 mr-1" />
                    Mark as Unread
                  </>
                ) : (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Mark as Read
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                asChild
                className="h-7 px-2 text-xs"
              >
                <Link href={postDetailUrl}>
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View Post
                </Link>
              </Button>
            </div>
          </div>
          
          {/* Action Dropdown */}
          <div className="absolute top-3 right-3">
            <NotificationActionDropdown
              notification={notification}
              onMarkAsRead={onMarkAsRead}
              onDelete={onDelete}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 