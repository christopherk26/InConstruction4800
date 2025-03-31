// app/communities/[communityId]/posts/[postId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, ThumbsUp, ThumbsDown, Flag, MessageCircle, Share2 } from "lucide-react";
import { MainNavbar } from "@/components/ui/main-navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { getCurrentUser } from "@/app/services/authService";
import { getCommunityById, checkCommunityMembership } from "@/app/services/communityService";
import { getPostById, getPostComments, createComment, voteOnPost } from "@/app/services/postService";
import { UserModel } from "@/app/models/UserModel";
import { Post, Comment, NestedComment } from "@/app/types/database";
import { getUserVotesForPosts } from "@/app/services/postService";
import { Input } from "@/components/ui/input";
import { Footer } from "@/components/ui/footer";
import { formatCategoryName } from "@/app/services/communityService";
import { MapPin } from "lucide-react";
import { PostActionDropdown } from "@/components/community/post-action-dropdown";
import { User } from "lucide-react";




export default function PostDetailPage() {
  // Get route parameters
  const router = useRouter();
  const params = useParams();
  const communityId = params?.id as string;  // This is the key change
  const postId = params?.postId as string;

  // State for user data, post data, and comments
  const [user, setUser] = useState<UserModel | null>(null);
  const [community, setCommunity] = useState<any | null>(null);
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<NestedComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userVote, setUserVote] = useState<'upvote' | 'downvote' | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");




  // Loading states
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingPost, setLoadingPost] = useState(true);
  const [loadingComments, setLoadingComments] = useState(true);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Load user, community, post and comments data
  useEffect(() => {
    async function fetchData() {
      try {
        // Check if user is authenticated
        setLoadingUser(true);
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          router.push("/auth/login");
          return;
        }

        // Check if user is verified
        const isVerified = await currentUser.isVerified();
        if (!isVerified) {
          router.push("/auth/authenticate-person");
          return;
        }

        setUser(currentUser);
        setLoadingUser(false);

        // Check community access
        const hasAccess = await checkCommunityMembership(currentUser.id || '', communityId);
        if (!hasAccess) {
          router.push(`/communities/access-denied?community=${communityId}`);
          return;
        }

        // Load community data
        const communityData = await getCommunityById(communityId);
        if (!communityData) {
          setError("Community not found");
          return;
        }
        setCommunity(communityData);

        // Load post data
        setLoadingPost(true);
        const postData = await getPostById(communityId, postId);
        if (!postData) {
          setError("Post not found");
          setLoadingPost(false);
          return;
        }
        setPost(postData as Post);
        setLoadingPost(false);

        // Load user votes
        // and set the user's vote if available
        if (currentUser && currentUser.id && postId) {
          try {
            const userVotes = await getUserVotesForPosts(currentUser.id, [postId]);
            if (userVotes && userVotes[postId]) {
              setUserVote(userVotes[postId]);
            }
          } catch (error) {
            console.error("Error fetching user votes:", error);
          }
        }

        // Load comments
        setLoadingComments(true);
        const commentsData = await getPostComments(postId);
        setComments(commentsData as NestedComment[]);
        setLoadingComments(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("An error occurred while loading the post.");
      }
    }

    if (communityId && postId) {
      fetchData();
    }
  }, [communityId, postId, router]);

  function CommentWithReplies({ comment }: { comment: Comment & { replies?: Comment[] } }) {
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState("");
  
    const handleReply = async () => {
      if (!replyContent.trim() || !user || !post) return;
  
      if (!postId || !comment.id) {
        console.error("postId or comment.id is undefined");
        return;
      }
      
      const replyData = {
        postId: postId, // Now guaranteed to be string
        authorId: user.id || '',
        content: replyContent.trim(),
        parentCommentId: comment.id, // Now guaranteed to be string
        author: {
          name: `${user.firstName} ${user.lastName}`.trim() || user.email,
          role: "",
          badgeUrl: user.profilePhotoUrl || ""
        }
      };
      
      const newReply = await createComment(replyData);
      
      // Add reply to the correct parent comment
      setComments(prev =>
        prev.map(c => {
          if (c.id === comment.id) {
            const safeReplies = (c as NestedComment).replies || [];
            return {
              ...c,
              replies: [...safeReplies, newReply as NestedComment]
            };
          }
      
          return {
            ...c,
            replies: (c as NestedComment).replies || []
          };
        })
      );
      
      

      setReplyingTo(null);
      setReplyContent("");
    };
  
    return (
      <div className="mb-2">
        <Card className="bg-[var(--card)] border-[var(--border)]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {comment.author?.badgeUrl && (
                  <img
                    src={comment.author.badgeUrl}
                    alt={`${comment.author.name}'s profile`}
                    className="w-6 h-6 rounded-full mr-2"
                  />
                )}
                <span className="font-medium text-[var(--foreground)]">
                  {comment.author?.name || "Unknown"}
                </span>
                {comment.author?.role && (
                  <span className="text-xs italic ml-2 text-[var(--muted-foreground)]">
                    {comment.author.role}
                  </span>
                )}
              </div>
              <span className="text-xs text-[var(--muted-foreground)]">
                {formatDateTime(comment.createdAt)}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-[var(--foreground)]">{comment.content}</p>
          </CardContent>
          <CardFooter className="pt-0 flex justify-between">
            <div className="flex space-x-2">
              <Button variant="ghost" size="sm" className="text-xs">
                <ThumbsUp className="h-3 w-3 mr-1" />
                <span>{comment.stats?.upvotes || 0}</span>
              </Button>
              <Button variant="ghost" size="sm" className="text-xs">
                <ThumbsDown className="h-3 w-3 mr-1" />
                <span>{comment.stats?.downvotes || 0}</span>
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => comment.id && setReplyingTo(comment.id)}
            >
              Reply
            </Button>
          </CardFooter>
  
          {replyingTo === comment.id && (
            <div className="px-4 pb-4">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                rows={2}
                className="text-sm"
              />
              <div className="mt-2 flex justify-end">
                <Button
                  size="sm"
                  onClick={handleReply}
                  disabled={isSubmitting || !replyContent.trim()}
                >
                  {isSubmitting ? "Posting..." : "Post Reply"}
                </Button>
              </div>
            </div>
          )}
        </Card>
  
        {/* Render replies recursively */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="ml-6 mt-1 space-y-1">
            {comment.replies.map(reply => (
              <CommentWithReplies key={reply.id} comment={reply} />
            ))}
          </div>
        )}
      </div>
    );
  }
  

  // Helper to format timestamps
  const formatDateTime = (timestamp: { seconds: number, nanoseconds: number }) => {
    const date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
    return format(date, "PPpp"); // Detailed format with date and time
  };

  // Handle comment submission
  const handleSubmitComment = async (parentCommentId?: string) => {
    if (!user || !post || !newComment.trim() && !replyContent.trim() || isSubmitting) return;
  
    const content = parentCommentId ? replyContent.trim() : newComment.trim();
  
    if (!content) return;
  
    setIsSubmitting(true);
    try {
      const commentData = {
        postId,
        authorId: user.id || '',
        content,
        parentCommentId,
        author: {
          name: `${user.firstName} ${user.lastName}`.trim() || user.email,
          role: "",
          badgeUrl: user.profilePhotoUrl || ""
        }
      };
  
      const newCommentData = await createComment(commentData);
  
      // Update comment list locally
      setComments((prev) => {
        if (parentCommentId) {
          return prev.map((comment): NestedComment => {
            if (comment.id === parentCommentId) {
              return {
                ...comment,
                replies: [
                  ...(comment.replies || []),
                  {
                    ...(newCommentData as Comment),
                    replies: [],
                  } as NestedComment,
                ],
              };
            }
            return comment;
          });
        } else {
          return [
            {
              ...(newCommentData as Comment),
              replies: [],
            } as NestedComment,
            ...prev,
          ];
        }
      });
      
      
  
      // Clear input
      parentCommentId ? setReplyContent("") : setNewComment("");
      setReplyingTo(null);
    } catch (error) {
      console.error("Error posting comment or reply:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  
  

  // Handle post voting
  const handleVote = async (voteType: 'upvote' | 'downvote') => {
    if (!user || !post) return;

    try {
      const updatedPost = await voteOnPost(
        postId,
        user.id || '',
        communityId,
        voteType
      );

      if (updatedPost) {
        setPost(updatedPost as Post);

        // If the user clicked the same vote type they already had, it toggles off
        if (userVote === voteType) {
          setUserVote(null);
        } else {
          setUserVote(voteType);
        }
      }
    } catch (error) {
      console.error("Error voting on post:", error);
    }
  };

  // Replace your current button classes with these more prominent styles
  const upvoteButtonClass = userVote === 'upvote'
    ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 border-blue-300 dark:border-blue-700"
    : "text-[var(--foreground)] hover:bg-[var(--secondary)]";

  const downvoteButtonClass = userVote === 'downvote'
    ? "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 border-red-300 dark:border-red-700"
    : "text-[var(--foreground)] hover:bg-[var(--secondary)]";

  // Loading state
  if (loadingUser || loadingPost) {
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
  if (error || !post || !community || !user) {
    return (
      <div className="min-h-screen flex bg-[var(--background)]">
        {user && <MainNavbar user={user} />}

        <div className="flex-1 ml-0 flex flex-col min-h-screen bg-[var(--background)]">
          <main className="flex-grow p-6">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <Button variant="outline" onClick={() => router.back()} className="mb-4">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
              </div>

              <Card className="bg-[var(--card)] border-[var(--border)]">
                <CardHeader>
                  <h1 className="text-xl text-[var(--foreground)]">
                    {error || "Post not found"}
                  </h1>
                </CardHeader>
                <CardContent>
                  <p className="text-[var(--muted-foreground)]">
                    The post you're looking for could not be loaded. It may have been removed or you may not have access.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" asChild>
                    <Link href={`/communities/${communityId}`}>Return to Community</Link>
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
      <MainNavbar user={user} />

      <div className="flex-1 ml-0 flex flex-col min-h-screen bg-[var(--background)]">
        <main className="flex-grow p-6">
          <div className="max-w-4xl mx-auto">
            {/* Back button and navigation */}
            <div className="mb-6">
              <Button variant="outline" onClick={() => router.back()} className="mb-2">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <div className="text-sm text-[var(--muted-foreground)] mb-4">
                <Link href="/dashboard" className="hover:underline">Dashboard</Link>
                {" / "}
                <Link href="/communities" className="hover:underline">Communities</Link>
                {" / "}
                <Link href={`/communities/${communityId}`} className="hover:underline">{community.name}</Link>
                {" / "}
                <span>Post</span>
              </div>
            </div>

            {/* Post Content Card */}
            <Card className="bg-[var(--card)] border-[var(--border)] mb-6">
              <CardHeader>
                <div>
                  {/* Post title */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h1 className={`text-2xl font-bold ${post.isEmergency ? 'text-red-500 dark:text-red-400' : 'text-[var(--foreground)]'}`}>
                        {post.isEmergency ? '🚨 ' : ''}{post.title}
                      </h1>

                      {/* Status badges */}
                      {post.status === 'pinned' && (
                        <span className="inline-block mt-2 text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                          Pinned
                        </span>
                      )}
                      {post.status === 'archived' && (
                        <span className="inline-block mt-2 text-xs px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                          Archived
                        </span>
                      )}

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
                      </div>
                    </div>

                    {/* Action dropdown menu */}
                    <PostActionDropdown
                      post={post}
                      currentUser={user}
                      communityId={communityId}
                      onActionComplete={() => {
                        // Refresh the page data
                        router.refresh();
                      }}
                    />
                  </div>
                  {/* Add this inside the CardHeader in your post detail page, right before or after the post title */}
                  <div className="flex items-center mt-2 mb-3">
                    {/* Author avatar */}
                    <div className="mr-3">
                      {post.author?.badgeUrl ? (
                        <img
                          src={post.author.badgeUrl}
                          alt={`${post.author.name}'s profile`}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[var(--muted)] flex items-center justify-center">
                          <User className="h-6 w-6 text-[var(--muted-foreground)]" />
                        </div>
                      )}
                    </div>

                    {/* Author details */}
                    <div className="flex flex-col">
                      <div className="flex items-center">
                        <span className="font-medium text-[var(--foreground)]">
                          {post.author?.name || "Unknown"}
                        </span>
                        {post.author?.role && (
                          <span
                            className="ml-2 px-2 py-0.5 text-xs rounded-full inline-flex items-center"
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
                      </div>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {formatDateTime(post.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {/* Post content */}
                <div className="prose prose-lg max-w-none text-[var(--foreground)]">
                  {post.content.split('\n').map((paragraph, idx) => (
                    <p key={idx}>{paragraph}</p>
                  ))}
                </div>

                {/* Media content */}
                {post.mediaUrls && post.mediaUrls.length > 0 && (
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {post.mediaUrls.map((url, index) => (
                      <img
                        key={index}
                        src={url}
                        alt={`Media for ${post.title}`}
                        className="rounded-lg w-full object-cover max-h-96"
                      />
                    ))}
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex justify-between border-t border-[var(--border)] pt-4">
                {/* Interaction buttons */}
                <div className="flex space-x-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleVote('upvote')}
                    className={upvoteButtonClass}
                  >
                    <ThumbsUp className="h-4 w-4 mr-1" />
                    <span>{post.stats?.upvotes || 0}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleVote('downvote')}
                    className={downvoteButtonClass}
                  >
                    <ThumbsDown className="h-4 w-4 mr-1" />
                    <span>{post.stats?.downvotes || 0}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[var(--foreground)] hover:bg-[var(--secondary)]"
                  >
                    <MessageCircle className="h-4 w-4 mr-1" />
                    <span>{post.stats?.commentCount || 0}</span>
                  </Button>
                </div>


              </CardFooter>
            </Card>

            {/* Add Comment Section */}
            <Card className="bg-[var(--card)] border-[var(--border)] mb-6">
              <CardHeader>
                <h2 className="text-lg font-medium text-[var(--foreground)]">Add Your Comment</h2>
              </CardHeader>
              <CardContent>
                <Input
                  placeholder="Write your comment here..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={4}
                  className="bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]"
                />
              </CardContent>
              <CardFooter className="flex justify-end">
              <Button
                size="sm"
                onClick={() => handleSubmitComment()}
                disabled={isSubmitting || !newComment.trim()}
              >
                {isSubmitting ? "Posting..." : "Post Comment"}
              </Button>
              </CardFooter>
            </Card>

            {/* Comments Section */}
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-4 text-[var(--foreground)]">
                Comments ({comments.length})
              </h2>

              {loadingComments ? (
                <div className="text-center py-4">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent mx-auto mb-2"></div>
                  <p className="text-[var(--muted-foreground)]">Loading comments...</p>
                </div>
              ) : comments.length === 0 ? (
                <Card className="bg-[var(--card)] border-[var(--border)]">
                  <CardContent className="py-6 text-center text-[var(--muted-foreground)]">
                    No comments yet. Be the first to comment!
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {/* Comments Section */}
                  <div className="mb-6">
                    <h2 className="text-xl font-bold mb-4 text-[var(--foreground)]">
                      Comments ({comments.length})
                    </h2>

                    {loadingComments ? (
                      <div className="text-center py-4">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent mx-auto mb-2"></div>
                        <p className="text-[var(--muted-foreground)]">Loading comments...</p>
                      </div>
                    ) : comments.length === 0 ? (
                      <Card className="bg-[var(--card)] border-[var(--border)]">
                        <CardContent className="py-6 text-center text-[var(--muted-foreground)]">
                          No comments yet. Be the first to comment!
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-4">
                        {comments.map((comment) => (
                          <div key={comment.id}>
                            <CommentWithReplies comment={comment} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Replace the default footer with the new Footer component */}
        <Footer />
      </div>
    </div>
  );
}