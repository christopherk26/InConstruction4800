// components/community/post-card.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { ThumbsUp, ThumbsDown, MessageCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Post } from "@/app/types/database";

interface PostCardProps {
  post: Post;
  communityId: string;
  onVote?: (postId: string, voteType: 'upvote' | 'downvote') => void;
}

export function PostCard({ post, communityId, onVote }: PostCardProps) {
  const [isVoting, setIsVoting] = useState(false);

  // Custom time formatter function that doesn't rely on date-fns
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

  // Handle voting
  const handleVote = async (voteType: 'upvote' | 'downvote') => {
    if (!onVote || isVoting) return;
    
    setIsVoting(true);
    try {
      await onVote(post.id || '', voteType);
    } catch (error) {
      console.error("Error voting on post:", error);
    } finally {
      setIsVoting(false);
    }
  };
  
  // Create the link URL for post details
  const postDetailUrl = `/communities/${communityId}/posts/${post.id}`;

  return (
    <Card className="bg-[var(--card)] border-[var(--border)] hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            {/* Title with link to full post */}
            <CardTitle className={post.isEmergency ? 'text-red-500 dark:text-red-400' : 'text-[var(--foreground)]'}>
              <Link href={postDetailUrl} className="hover:underline">
                {post.isEmergency ? '🚨 ' : ''}{post.title}
              </Link>
            </CardTitle>
            
            {/* Post metadata */}
            <CardDescription className="text-[var(--muted-foreground)]">
              Posted by {post.author?.name || "Unknown"}
              {post.author?.role && <span className="italic ml-1">({post.author.role})</span>} • {" "}
              {formatTimeAgo(post.createdAt)}
            </CardDescription>
          </div>
          
          {/* Category tag */}
          <span className="text-xs px-2 py-1 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">
            {post.categoryTag}
          </span>
        </div>
      </CardHeader>
      
      {/* Post content */}
      <CardContent>
        {/* Show truncated content with "Read more" */}
        <p className="text-[var(--foreground)]">
          {post.content.length > 200 
            ? `${post.content.substring(0, 200)}...` 
            : post.content}
          {post.content.length > 200 && (
            <Link 
              href={postDetailUrl} 
              className="text-blue-500 dark:text-blue-400 ml-1 hover:underline"
            >
              Read more
            </Link>
          )}
        </p>
        
        {/* Media preview grid (if any) */}
        {post.mediaUrls && post.mediaUrls.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {post.mediaUrls.slice(0, 2).map((url, index) => (
              <img 
                key={index} 
                src={url} 
                alt={`Media for ${post.title}`} 
                className="rounded-md w-full h-32 object-cover"
              />
            ))}
            {post.mediaUrls.length > 2 && (
              <div className="relative rounded-md overflow-hidden">
                <img 
                  src={post.mediaUrls[2]} 
                  alt={`Media for ${post.title}`} 
                  className="w-full h-32 object-cover opacity-70"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white font-bold">
                  +{post.mediaUrls.length - 2} more
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
      
      {/* Post actions */}
      <CardFooter className="flex justify-between items-center">
        <div className="flex space-x-2">
          {/* Vote buttons */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-[var(--foreground)] hover:bg-[var(--secondary)]"
            onClick={() => handleVote('upvote')}
            disabled={isVoting}
          >
            <ThumbsUp className="h-4 w-4 mr-1" /> 
            <span>{post.stats?.upvotes || 0}</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-[var(--foreground)] hover:bg-[var(--secondary)]"
            onClick={() => handleVote('downvote')}
            disabled={isVoting}
          >
            <ThumbsDown className="h-4 w-4 mr-1" /> 
            <span>{post.stats?.downvotes || 0}</span>
          </Button>
          
          {/* Comments link */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-[var(--foreground)] hover:bg-[var(--secondary)]"
            asChild
          >
            <Link href={postDetailUrl}>
              <MessageCircle className="h-4 w-4 mr-1" /> 
              <span>{post.stats?.commentCount || 0}</span>
            </Link>
          </Button>
        </div>
        
        {/* View details button */}
        <Button 
          variant="outline"
          size="sm"
          className="text-xs"
          asChild
        >
          <Link href={postDetailUrl}>
            View Details
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}