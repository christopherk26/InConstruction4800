//ap/components/community/comment-action-dropdown.tsx
"use client";

import { useState } from 'react';
import { 
  MoreVertical, 
  Trash2, 
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Comment } from '@/app/types/database';
import { UserModel } from '@/app/models/UserModel';
import { deleteComment } from '@/app/services/postService';

interface CommentActionDropdownProps {
  comment: Comment;
  currentUser: UserModel;
  communityId: string;
  onActionComplete?: () => void;
}

export function CommentActionDropdown({ 
  comment, 
  currentUser, 
  communityId,
  onActionComplete 
}: CommentActionDropdownProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Check if user is the author
  const isAuthor = comment.authorId === currentUser.id;
  
  // Handler for delete action
  const handleDelete = async () => {
    if (!currentUser?.id || !comment?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const success = await deleteComment(comment.id, currentUser.id, communityId);
      
      if (success) {
        // After successful action, notify parent for refresh
        if (onActionComplete) {
          onActionComplete();
        }
      } else {
        setError('Failed to delete comment. Please try again.');
      }
    } catch (error: any) {
      console.error('Error deleting comment:', error);
      setError(error.message || 'Failed to delete comment');
    } finally {
      setIsLoading(false);
    }
  };
  
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
        <DropdownMenuLabel>Comment Actions</DropdownMenuLabel>
        
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
        
        {/* Delete action - available to author */}
        {isAuthor && (
          <DropdownMenuItem
            onClick={handleDelete}
            disabled={isLoading}
            className="text-red-500"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Comment
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 