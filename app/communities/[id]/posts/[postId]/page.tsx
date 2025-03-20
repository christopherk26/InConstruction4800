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
import { Post, Comment } from "@/app/types/database";
import { getUserVotesForPosts } from "@/app/services/postService";

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
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userVote, setUserVote] = useState<'upvote' | 'downvote' | null>(null);



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
        setComments(commentsData as Comment[]);
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

  // Helper to format timestamps
  const formatDateTime = (timestamp: { seconds: number, nanoseconds: number }) => {
    const date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
    return format(date, "PPpp"); // Detailed format with date and time
  };

  // Handle comment submission
  const handleSubmitComment = async () => {
    if (!user || !post || !newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const commentData = {
        postId: postId,
        authorId: user.id || '',
        content: newComment.trim(),
        author: {
          name: `${user.firstName} ${user.lastName}`.trim() || user.email,
          role: "", // You can set this if user roles are available
          badgeUrl: user.profilePhotoUrl || ""
        }
      };

      const newCommentData = await createComment(commentData);

      // Add the new comment to the list
      setComments(prev => [newCommentData as Comment, ...prev]);
      setNewComment(""); // Clear the input
    } catch (error) {
      console.error("Error posting comment:", error);
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
                <div className="flex items-center justify-between mb-2">
                  {/* Post category */}
                  <span className="text-xs px-2 py-1 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">
                    {post.categoryTag}
                  </span>

                  {/* Post date */}
                  <span className="text-sm text-[var(--muted-foreground)]">
                    {formatDateTime(post.createdAt)}
                  </span>
                </div>

                {/* Post title */}
                <h1 className={`text-2xl font-bold ${post.isEmergency ? 'text-red-500 dark:text-red-400' : 'text-[var(--foreground)]'}`}>
                  {post.isEmergency ? '🚨 ' : ''}{post.title}
                </h1>

                {/* Author info */}
                <div className="flex items-center mt-2">
                  {post.author?.badgeUrl && (
                    <img
                      src={post.author.badgeUrl}
                      alt={`${post.author.name}'s profile`}
                      className="w-8 h-8 rounded-full mr-2"
                    />
                  )}
                  <div>
                    <p className="text-[var(--foreground)]">{post.author?.name || "Unknown"}</p>
                    {post.author?.role && (
                      <p className="text-xs text-[var(--muted-foreground)]">{post.author.role}</p>
                    )}
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
                <Textarea
                  placeholder="Write your comment here..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={4}
                  className="bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]"
                />
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || isSubmitting}
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
                  {comments.map((comment) => (
                    <Card key={comment.id} className="bg-[var(--card)] border-[var(--border)]">
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
                        <Button variant="ghost" size="sm" className="text-xs">
                          Reply
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>

        <footer className="p-2 text-center text-[var(--muted-foreground)] border-t border-[var(--border)]">
          © 2025 In Construction, Inc. All rights reserved.
        </footer>
      </div>
    </div>
  );
}