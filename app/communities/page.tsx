//app/communities/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Filter, Plus } from "lucide-react";
import { DocumentSnapshot } from "firebase/firestore";

import { MainNavbar } from "@/components/ui/main-navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PostCard } from "@/components/community/post-card";

import { getCurrentUser } from "@/app/services/authService";
import { getCommunityById, checkCommunityMembership, getCommunityCategories, formatCategoryName } from "@/app/services/communityService";
import { getCommunityPosts, voteOnPost, getUserVotesForPosts } from "@/app/services/postService";
import { UserModel } from "@/app/models/UserModel";
import { Post } from "@/app/types/database";

export default function CommunityPage() {
  // Get community ID from route params
  const router = useRouter();
  const params = useParams();
  const communityId = params?.id as string;
  
  // State for user and community data
  const [user, setUser] = useState<UserModel | null>(null);
  const [community, setCommunity] = useState<any | null>(null);
  
  // State for posts and filtering
  const [posts, setPosts] = useState<Post[]>([]);
  const [userVotes, setUserVotes] = useState<Record<string, 'upvote' | 'downvote'>>({});
  const [lastVisible, setLastVisible] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<'recent' | 'upvoted' | 'trending'>("recent");
  
  // Loading and error states
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingCommunity, setLoadingCommunity] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check user auth and community access
  useEffect(() => {
    async function checkAccess() {
      try {
        setLoadingUser(true);
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
        setLoadingUser(false);
        
        // Check if user has access to this community
        const hasAccess = await checkCommunityMembership(currentUser.id || '', communityId);
        
        if (!hasAccess) {
          router.push(`/communities/access-denied?community=${communityId}`);
          return;
        }
        
        // Fetch community details
        setLoadingCommunity(true);
        const communityData = await getCommunityById(communityId);
        setCommunity(communityData);
        setLoadingCommunity(false);
        
      } catch (error) {
        console.error("Error checking access:", error);
        setError("Error loading community. Please try again.");
      }
    }
    
    if (communityId) {
      checkAccess();
    }
  }, [communityId, router]);

  // Fetch posts when community data is loaded
  useEffect(() => {
    if (loadingCommunity || !community || !user) return;
    
    async function fetchPosts() {
      setLoadingPosts(true);
      setPosts([]);
      setLastVisible(null);
      setHasMore(true);
      
      try {
        // Get posts with filters
        const result = await getCommunityPosts(communityId, {
          categoryTag: activeCategory === "all" ? undefined : activeCategory,
          sortBy,
          limit: 10
        });
        
        // Get user's votes for these posts
        if (result.posts.length > 0 && user?.id) {
          const postIds = result.posts.map(post => post.id || '').filter(id => id);
          const votes = await getUserVotesForPosts(user.id, postIds);
          setUserVotes(votes);
        }
        
        // Update posts state
        setPosts(result.posts as Post[]);
        setLastVisible(result.lastVisible);
        setHasMore(result.posts.length === 10);
        setLoadingPosts(false);
      } catch (error) {
        console.error("Error fetching posts:", error);
        setLoadingPosts(false);
        setError("Error loading posts. Please try again.");
      }
    }
    
    fetchPosts();
  }, [communityId, activeCategory, sortBy, community, user]);

  // Reset sort option when category changes to non-"all"
  useEffect(() => {
    if (activeCategory !== "all" && sortBy !== "recent") {
      setSortBy("recent");
    }
  }, [activeCategory]);

  // Function to load more posts
  const loadMorePosts = async () => {
    if (!lastVisible || !hasMore || loadingPosts) return;
    
    setLoadingPosts(true);
    
    try {
      // Get next batch of posts
      const result = await getCommunityPosts(communityId, {
        categoryTag: activeCategory === "all" ? undefined : activeCategory,
        sortBy,
        limit: 10,
        lastVisible
      });
      
      // Get user's votes for these new posts
      if (result.posts.length > 0 && user?.id) {
        const postIds = result.posts.map(post => post.id || '').filter(id => id);
        const newVotes = await getUserVotesForPosts(user.id, postIds);
        setUserVotes(prev => ({ ...prev, ...newVotes }));
      }
      
      // Append to existing posts
      setPosts(prev => [...prev, ...(result.posts as Post[])]);
      setLastVisible(result.lastVisible);
      setHasMore(result.posts.length === 10);
      setLoadingPosts(false);
    } catch (error) {
      console.error("Error loading more posts:", error);
      setLoadingPosts(false);
    }
  };

  // Handle voting on posts
  const handleVote = async (postId: string, voteType: 'upvote' | 'downvote') => {
    if (!user) return;
    
    try {
      // Update vote in the database
      const updatedPost = await voteOnPost(postId, user.id || '', communityId, voteType);
      
      if (updatedPost) {
        // Update local posts state with the updated post
        setPosts(prev => prev.map(post => 
          post.id === postId ? { ...post, stats: updatedPost.stats } : post
        ));
        
        // Update user votes state
        const existingVote = userVotes[postId];
        
        // If same vote type, remove the vote
        if (existingVote === voteType) {
          setUserVotes(prev => {
            const newVotes = { ...prev };
            delete newVotes[postId];
            return newVotes;
          });
        } else {
          // Otherwise, set or update the vote
          setUserVotes(prev => ({
            ...prev,
            [postId]: voteType
          }));
        }
      }
    } catch (error) {
      console.error("Error voting on post:", error);
    }
  };

  // Calculate available sort options based on active category
  const availableSortOptions = [
    { value: "recent", label: "Recent" },
    ...(activeCategory === "all" ? [
      { value: "upvoted", label: "Most Upvoted" },
      { value: "trending", label: "Trending" },
    ] : []),
  ];

  // Loading state
  if (loadingUser || loadingCommunity) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent"></div>
          <p className="text-[var(--foreground)]">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Error state or no user/community
  if (error || !user || !community) {
    return (
      <div className="min-h-screen flex bg-[var(--background)]">
        {user && <MainNavbar user={user} />}
        
        <div className="flex-1 ml-64 flex flex-col min-h-screen bg-[var(--background)]">
          <main className="flex-grow p-6">
            <div className="max-w-4xl mx-auto">
              <Card className="bg-[var(--card)] border-[var(--border)]">
                <CardHeader>
                  <CardTitle className="text-xl text-[var(--foreground)]">
                    {error || "Community not found"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-[var(--muted-foreground)]">
                    The community you're looking for could not be loaded. It may have been removed or you may not have access.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" asChild>
                    <Link href="/communities">Return to Communities</Link>
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
      
      <div className="flex-1 ml-64 flex flex-col min-h-screen bg-[var(--background)]">
        <main className="flex-grow p-6">
          <div className="max-w-4xl mx-auto">
            {/* Community Header and Filters Card */}
            <Card className="mb-6 bg-[var(--card)] border-[var(--border)]">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl font-bold text-[var(--foreground)]">
                      {community.name}
                    </CardTitle>
                    <CardDescription className="text-[var(--muted-foreground)]">
                      {community.bio || "No description available"}
                    </CardDescription>
                  </div>
                  <Button variant="outline" asChild>
                    <Link href={`/communities/${communityId}/new-post`} className="flex items-center">
                      <Plus className="h-4 w-4 mr-2" />
                      New Post
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Community stats */}
                <div className="grid grid-cols-3 gap-4 text-sm mb-6">
                  <div>
                    <p className="text-[var(--muted-foreground)]">Members</p>
                    <p className="font-medium text-[var(--foreground)]">{community.stats?.memberCount || 0}</p>
                  </div>
                  <div>
                    <p className="text-[var(--muted-foreground)]">Verified Users</p>
                    <p className="font-medium text-[var(--foreground)]">{community.stats?.verifiedCount || 0}</p>
                  </div>
                  <div>
                    <p className="text-[var(--muted-foreground)]">Location</p>
                    <p className="font-medium text-[var(--foreground)]">
                      {community.location?.city && community.location?.state 
                        ? `${community.location.city}, ${community.location.state}`
                        : "Not specified"}
                    </p>
                  </div>
                </div>

                {/* Filtering controls */}
                <div className="pt-4 border-t border-[var(--border)]">
                  <div className="flex items-center mb-4">
                    <Filter className="mr-2 h-4 w-4 text-[var(--muted-foreground)]" />
                    <h3 className="text-lg font-medium text-[var(--foreground)]">
                      Filter Posts
                    </h3>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-2 text-[var(--muted-foreground)]">Category</p>
                      <Select onValueChange={setActiveCategory} value={activeCategory}>
                        <SelectTrigger className="w-full bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent className="bg-[var(--card)] border-[var(--border)]">
                          <SelectItem value="all" className="text-[var(--foreground)] hover:bg-[var(--secondary)]">All</SelectItem>
                          {getCommunityCategories().map((category) => (
                            <SelectItem key={category} value={category} className="text-[var(--foreground)] hover:bg-[var(--secondary)]">
                              {formatCategoryName(category)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-2 text-[var(--muted-foreground)]">Sort by</p>
                      <Select onValueChange={(value) => setSortBy(value as any)} value={sortBy}>
                        <SelectTrigger className="w-full bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]">
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent className="bg-[var(--card)] border-[var(--border)]">
                          {availableSortOptions.map((option) => (
                            <SelectItem
                              key={option.value}
                              value={option.value}
                              className="text-[var(--foreground)] hover:bg-[var(--secondary)]"
                            >
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Posts List */}
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-4 text-[var(--foreground)]">
                Posts
              </h2>
              
              {loadingPosts && posts.length === 0 ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-40 w-full bg-[var(--muted)]" />
                  ))}
                </div>
              ) : posts.length === 0 ? (
                <Card className="bg-[var(--card)] border-[var(--border)] p-8 text-center">
                  <CardContent className="pt-6">
                    <p className="text-[var(--muted-foreground)] mb-4">
                      No posts found in this community.
                    </p>
                    <Button variant="outline" asChild>
                      <Link href={`/communities/${communityId}/new-post`}>
                        Create the First Post
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {/* Post cards */}
                  {posts.map((post) => (
                    <PostCard 
                      key={post.id} 
                      post={post} 
                      communityId={communityId}
                      onVote={handleVote}
                    />
                  ))}
                  
                  {/* Load more button */}
                  {hasMore && (
                    <Button
                      onClick={loadMorePosts}
                      disabled={loadingPosts}
                      variant="outline"
                      className="w-full mt-4"
                    >
                      {loadingPosts ? (
                        <>
                          <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                          Loading More...
                        </>
                      ) : (
                        "Load More Posts"
                      )}
                    </Button>
                  )}
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