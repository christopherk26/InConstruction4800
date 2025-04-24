// components/community/post-card.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ThumbsUp, ThumbsDown, MessageCircle, Pin, Archive, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Post } from "@/app/types/database";
import { voteOnPost, getUserVotesForPosts } from "@/app/services/postService";
import { getCurrentUser } from "@/app/services/authService";
import { formatCategoryName } from "@/app/services/communityService";
import { MapPin } from "lucide-react";
import { PostActionDropdown } from "./post-action-dropdown";

interface PostCardProps {
  post: Post;
  communityId: string;
  userVote?: 'upvote' | 'downvote' | null;
  refreshPosts?: () => void;
}

export function PostCard({ post, communityId, userVote: initialUserVote, refreshPosts }: PostCardProps) {
  const [isVoting, setIsVoting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userVote, setUserVote] = useState<'upvote' | 'downvote' | null>(initialUserVote || null);
  const [postStats, setPostStats] = useState(post.stats || { upvotes: 0, downvotes: 0, commentCount: 0 });

  // Fetch the current user
  useEffect(() => {
    async function fetchUser() {
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);

        // If no initial vote was provided, fetch the user's vote for this post
        if (initialUserVote === undefined && user && post.id) {
          const userVotes = await getUserVotesForPosts(user.id || '', [post.id]);
          if (userVotes && post.id && userVotes[post.id]) {
            setUserVote(userVotes[post.id]);
          }
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    }

    fetchUser();
  }, [post.id, initialUserVote]);

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
    if (!currentUser || isVoting || !post.id) return;

    setIsVoting(true);
    try {
      const updatedPost = await voteOnPost(
        post.id,
        currentUser.id || '',
        communityId,
        voteType
      );

      if (updatedPost) {
        // If the user clicked the same vote type they already had, it toggles off
        if (userVote === voteType) {
          setUserVote(null);
        } else {
          setUserVote(voteType);
        }

        // Update local stats
        setPostStats(updatedPost.stats || { upvotes: 0, downvotes: 0, commentCount: 0 });

        // Refresh the posts list if a callback was provided
        if (refreshPosts) {
          refreshPosts();
        }
      }
    } catch (error) {
      console.error("Error voting on post:", error);
    } finally {
      setIsVoting(false);
    }
  };

  // Handle post action completion
  const handleActionComplete = () => {
    if (refreshPosts) {
      refreshPosts();
    }
  };

  // Create the link URL for post details
  const postDetailUrl = `/communities/${communityId}/posts/${post.id}`;
  
  // Create the link URL for author profile
  const authorProfileUrl = post.authorId ? `/communities/${communityId}/users/${post.authorId}` : '';

  // Determine button styles based on user's vote
  const upvoteButtonClass = userVote === 'upvote'
    ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 border-blue-300 dark:border-blue-700"
    : "text-[var(--foreground)] hover:bg-[var(--secondary)]";

  const downvoteButtonClass = userVote === 'downvote'
    ? "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 border-red-300 dark:border-red-700"
    : "text-[var(--foreground)] hover:bg-[var(--secondary)]";

  // Determine status indicators
  const isPinned = post.status === 'pinned';
  const isArchived = post.status === 'archived';
  const isEmergency = post.isEmergency;

  return (
    <Card className="bg-[var(--card)] border-[var(--border)] hover:shadow-md transition-shadow">
      <CardHeader className="relative">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {/* Title with link to full post */}
            <CardTitle className={post.isEmergency ? 'text-red-500 dark:text-red-400' : 'text-[var(--foreground)]'}>
              <Link href={postDetailUrl} className="hover:underline">
                {post.isEmergency ? '🚨 ' : ''}{post.title}
              </Link>

              {/* Status indicators */}
              <div className="inline-flex gap-1 ml-2 align-middle">
                {isPinned && (
                  <Pin className="h-4 w-4 text-blue-500 inline" />
                )}
                {isArchived && (
                  <Archive className="h-4 w-4 text-gray-500 inline" />
                )}
              </div>
            </CardTitle>

            {/* Tags section */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs px-2 py-1 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)] whitespace-nowrap overflow-hidden text-ellipsis">
                {formatCategoryName(post.categoryTag)}
              </span>

              {post.geographicTag && (
                <span className="text-xs px-2 py-1 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)] whitespace-nowrap overflow-hidden text-ellipsis">
                  <MapPin className="inline-block h-3 w-3 mr-1" />
                  {post.geographicTag}
                </span>
              )}

              {/* Post status badge */}
              {isArchived && (
                <span className="text-xs px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                  Archived
                </span>
              )}
              {isPinned && (
                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                  Pinned
                </span>
              )}
            </div>

            {/* Post metadata */}
            <CardDescription className="text-[var(--muted-foreground)] mt-2">
              <div className="flex items-center">
                {/* Author avatar */}
                <div className="mr-2">
                  {post.author?.badgeUrl ? (
                    <img
                      src={post.author.badgeUrl}
                      alt={`${post.author.name}'s profile`}
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[var(--muted)] flex items-center justify-center">
                      <span className="text-xs text-[var(--muted-foreground)]">?</span>
                    </div>
                  )}
                </div>

                {/* Author info with profile link */}
                <div className="flex flex-col">
                  <span>
                    Posted by {post.authorId ? (
                      <Link href={authorProfileUrl} className="hover:underline text-blue-500 dark:text-blue-400">
                        {post.author?.name || "Unknown"}
                      </Link>
                    ) : (
                      post.author?.name || "Unknown"
                    )}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                    {post.author?.role && (
                      <span
                        className="px-2 py-0.5 rounded-full inline-flex items-center"
                        style={{
                          backgroundColor: post.author.badge?.color ? `${post.author.badge.color}20` : 'var(--muted)',
                          color: post.author.badge?.color || 'var(--muted-foreground)'
                        }}
                      >
                        {post.author.badge?.emoji && (
                          <span className="mr-1">{post.author.badge.emoji}</span>
                        )}
                        {post.author.role}
                      </span>
                    )}
                    {post.author?.role && "  "}
                    {formatTimeAgo(post.createdAt)}
                  </div>
                </div>
              </div>
            </CardDescription>
          </div>

          {/* Action dropdown menu - only show if user is logged in */}
          {currentUser && (
            <div>
              <PostActionDropdown
                post={post}
                currentUser={currentUser}
                communityId={communityId}
                onActionComplete={handleActionComplete}
              />
            </div>
          )}
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
          {/* Upvote button with conditional styling */}
          <Button
            variant="ghost"
            size="sm"
            className={upvoteButtonClass}
            onClick={() => handleVote('upvote')}
            disabled={isVoting || !currentUser}
            title={!currentUser ? "Please log in to vote" : ""}
          >
            <ThumbsUp className="h-4 w-4 mr-1" />
            <span>{postStats.upvotes || 0}</span>
          </Button>

          {/* Downvote button with conditional styling */}
          <Button
            variant="ghost"
            size="sm"
            className={downvoteButtonClass}
            onClick={() => handleVote('downvote')}
            disabled={isVoting || !currentUser}
            title={!currentUser ? "Please log in to vote" : ""}
          >
            <ThumbsDown className="h-4 w-4 mr-1" />
            <span>{postStats.downvotes || 0}</span>
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
              <span>{postStats.commentCount || 0}</span>
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