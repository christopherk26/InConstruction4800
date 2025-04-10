"use client";

import { useState } from 'react';
import { 
  MoreVertical, 
  Check, 
  X, 
  Trash2, 
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Notification } from '@/app/types/database';
import Link from 'next/link';

interface NotificationActionDropdownProps {
  notification: Notification;
  onMarkAsRead: (notificationId: string, currentReadState: boolean) => Promise<void>;
  onDelete: (notificationId: string) => Promise<void>;
}

export function NotificationActionDropdown({ 
  notification, 
  onMarkAsRead,
  onDelete
}: NotificationActionDropdownProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Handler for all notification actions
  const handleAction = async (
    action: 'read' | 'unread' | 'delete'
  ) => {
    if (!notification?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      switch (action) {
        case 'read':
          await onMarkAsRead(notification.id, true);
          break;
        case 'unread':
          await onMarkAsRead(notification.id, false);
          break;
        case 'delete':
          await onDelete(notification.id);
          break;
      }
    } catch (error: any) {
      console.error(`Error performing ${action} action:`, error);
      setError(error.message || 'Action failed');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Create the link URL for post details
  const postDetailUrl = `/communities/${notification.communityId}/posts/${notification.content.sourceId}`;
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="h-8 w-8 p-0"
          disabled={isLoading}
        >
          <span className="sr-only">Open menu</span>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end"
        className="bg-[var(--card)] text-[var(--card-foreground)] border-[var(--border)] shadow-lg"
      >
        <DropdownMenuLabel>Notification Actions</DropdownMenuLabel>
        
        {/* Show error if any */}
        {error && (
          <DropdownMenuItem 
            className="text-red-500 cursor-default"
            disabled
          >
            <AlertCircle className="h-4 w-4 mr-2" />
            {error}
          </DropdownMenuItem>
        )}
        
        {/* Read/Unread action */}
        <DropdownMenuItem
          onClick={() => handleAction(notification.status.read ? 'read' : 'unread')}
          disabled={isLoading}
        >
          {notification.status.read ? (
            <>
              <X className="h-4 w-4 mr-2" />
              Mark as Unread
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Mark as Read
            </>
          )}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* View post action */}
        <DropdownMenuItem
          asChild
        >
          <Link href={postDetailUrl}>
            <ExternalLink className="h-4 w-4 mr-2" />
            View Post
          </Link>
        </DropdownMenuItem>
        
        {/* Delete action */}
        <DropdownMenuItem
          onClick={() => handleAction('delete')}
          disabled={isLoading}
          className="text-red-500"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Notification
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 