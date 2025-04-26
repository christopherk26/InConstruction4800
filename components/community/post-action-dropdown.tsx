// components/community/post-action-dropdown.tsx

"use client";

import { useState, useEffect } from 'react';
import {
  MoreVertical,
  Pin,
  Archive,
  Trash2,
  AlertCircle,
  Eye
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
import { Post } from '@/app/types/database';
import { UserModel } from '@/app/models/UserModel';
import { checkUserPermission } from '@/app/services/userService';
import {
  pinPost,
  unpinPost,
  archivePost,
  unarchivePost,
  deletePost
} from '@/app/services/postActionsService';
import { useRouter } from 'next/navigation';

interface PostActionDropdownProps {
  post: Post;
  currentUser: UserModel;
  communityId: string;
  onActionComplete?: () => void;
}

export function PostActionDropdown({
  post,
  currentUser,
  communityId,
  onActionComplete
}: PostActionDropdownProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Permission states
  const [permissions, setPermissions] = useState({
    isAuthor: false,
    canPin: false,
    canArchive: false,
    canModerate: false
  });

  // Check user permissions when component mounts
  useEffect(() => {
    async function checkPermissions() {
      if (!currentUser?.id || !post) return;

      try {
        // Check if user is the author
        const isAuthor = post.authorId === currentUser.id;

        // Check role-based permissions
        const [canPin, canArchive, canModerate] = await Promise.all([
          checkUserPermission(currentUser.id, communityId, 'canPin'),
          checkUserPermission(currentUser.id, communityId, 'canArchive'),
          checkUserPermission(currentUser.id, communityId, 'canModerate')
        ]);

        setPermissions({
          isAuthor,
          canPin,
          canArchive,
          canModerate
        });
      } catch (error) {
        console.error('Error checking permissions:', error);
      }
    }

    checkPermissions();
  }, [currentUser, post, communityId]);

  // Handler for all post actions
  const handleAction = async (
    action: 'pin' | 'unpin' | 'archive' | 'unarchive' | 'delete'
  ) => {
    if (!currentUser?.id || !post?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      let success = false;

      switch (action) {
        case 'pin':
          success = await pinPost(currentUser.id, communityId, post.id);
          break;
        case 'unpin':
          success = await unpinPost(currentUser.id, communityId, post.id);
          break;
        case 'archive':
          success = await archivePost(currentUser.id, communityId, post.id);
          break;
        case 'unarchive':
          success = await unarchivePost(currentUser.id, communityId, post.id);
          break;
        case 'delete':
          success = await deletePost(currentUser.id, communityId, post.id);
          break;
      }

      if (success) {
        // After successful action, notify parent for refresh
        if (onActionComplete) {
          onActionComplete();
        }

        // For delete action, redirect to community page
        if (action === 'delete') {
          router.push(`/communities/${communityId}`);
        }
      } else {
        setError('Action failed. Please try again.');
      }
    } catch (error: any) {
      console.error(`Error performing ${action} action:`, error);
      setError(error.message || 'Action failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Determine available actions based on post status and permissions
  const isPinned = post.status === 'pinned';
  const isArchived = post.status === 'archived';

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
        <DropdownMenuLabel>Post Actions</DropdownMenuLabel>

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

        {/* Pin/Unpin action */}
        {permissions.canPin && (
          <DropdownMenuItem
            onClick={() => handleAction(isPinned ? 'unpin' : 'pin')}
            disabled={isLoading || isArchived}
          >
            <Pin className="h-4 w-4 mr-2" />
            {isPinned ? 'Unpin Post' : 'Pin Post'}
          </DropdownMenuItem>
        )}

        {/* Archive/Unarchive action */}
        {permissions.canArchive && (
          <DropdownMenuItem
            onClick={() => handleAction(isArchived ? 'unarchive' : 'archive')}
            disabled={isLoading}
          >
            <Archive className="h-4 w-4 mr-2" />
            {isArchived ? 'Unarchive Post' : 'Archive Post'}
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {/* Delete action - available to author or moderator */}
        {(permissions.isAuthor || permissions.canModerate) && (
          <DropdownMenuItem
            onClick={() => handleAction('delete')}
            disabled={isLoading}
            className="text-red-500"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Post
          </DropdownMenuItem>
        )}

        {/* View post details option */}
        <DropdownMenuItem
          asChild
        >
          <a href={`/communities/${communityId}/posts/${post.id}`}>
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}