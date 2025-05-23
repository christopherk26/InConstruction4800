"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/app/services/authService";
import {
  getCommunityById,
  checkCommunityMembership,
  getCommunityPosts,
  getCommunityCategories,
  formatCategoryName
} from "@/app/services/communityService";
import { getUserVotesForPosts } from "@/app/services/postService";
import { DocumentSnapshot } from "firebase/firestore";
import { MainNavbar } from "@/components/ui/main-navbar";
import { UserModel } from "@/app/models/UserModel";
import { MessageCircle, ThumbsUp, ThumbsDown, Filter } from "lucide-react";
import { Post } from "@/app/types/database";
import { Footer } from "@/components/ui/footer";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PostCard } from "@/components/community/post-card";

export default function CommunityPage() {
  const router = useRouter();
  const params = useParams();
  const communityId = params?.id as string;

  const [user, setUser] = useState<UserModel | null>(null);
  const [community, setCommunity] = useState<any | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [lastVisible, setLastVisible] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<'recent' | 'upvoted' | 'trending'>("recent");
  const [userVotes, setUserVotes] = useState<Record<string, 'upvote' | 'downvote'>>({});

  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingCommunity, setLoadingCommunity] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [hasAccessError, setHasAccessError] = useState(false);

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
        setHasAccessError(true);
      }
    }

    if (communityId) {
      checkAccess();
    }
  }, [communityId, router]);

  // Fetch posts when access is confirmed and filters change
  useEffect(() => {
    if (!communityId || hasAccessError || loadingCommunity || !community) return;

    async function fetchPosts() {
      setLoadingPosts(true);
      setPosts([]);
      setLastVisible(null);
      setHasMore(true);

      try {
        const result = await getCommunityPosts(communityId, {
          categoryTag: activeCategory === "all" ? undefined : activeCategory,
          sortBy,
          limit: 10
        });

        setPosts(result.posts as Post[]);
        setLastVisible(result.lastVisible);
        setHasMore(result.posts.length === 10);

        // Fetch user votes for these posts if user is logged in
        if (user && user.id && result.posts.length > 0) {
          const postIds = result.posts.map(post => post.id || '').filter(id => id);
          if (postIds.length > 0) {
            const votes = await getUserVotesForPosts(user.id, postIds);
            setUserVotes(votes);
          }
        }

        setLoadingPosts(false);
      } catch (error) {
        console.error("Error fetching posts:", error);
        setLoadingPosts(false);
      }
    }

    fetchPosts();
  }, [communityId, community, hasAccessError, loadingCommunity, activeCategory, sortBy, user]);

  // Load more posts for pagination
  const loadMorePosts = async () => {
    if (!communityId || !lastVisible || !hasMore) return;

    setLoadingPosts(true);

    try {
      const result = await getCommunityPosts(communityId, {
        categoryTag: activeCategory === "all" ? undefined : activeCategory,
        sortBy,
        limit: 10,
        lastVisible
      });

      const newPosts = result.posts as Post[];
      setPosts(prev => [...prev, ...newPosts]);
      setLastVisible(result.lastVisible);
      setHasMore(result.posts.length === 10);

      // Fetch user votes for the new posts
      if (user && user.id && newPosts.length > 0) {
        const postIds = newPosts.map(post => post.id || '').filter(id => id);
        if (postIds.length > 0) {
          const votes = await getUserVotesForPosts(user.id, postIds);
          setUserVotes(prev => ({ ...prev, ...votes }));
        }
      }

      setLoadingPosts(false);
    } catch (error) {
      console.error("Error loading more posts:", error);
      setLoadingPosts(false);
    }
  };

  // Refresh posts after voting
  const refreshPosts = async () => {
    if (!communityId || hasAccessError || loadingCommunity || !community) return;

    setLoadingPosts(true);

    try {
      const result = await getCommunityPosts(communityId, {
        categoryTag: activeCategory === "all" ? undefined : activeCategory,
        sortBy,
        limit: posts.length || 10
      });

      setPosts(result.posts as Post[]);
      setLastVisible(result.lastVisible);

      // Refresh user votes
      if (user && user.id && result.posts.length > 0) {
        const postIds = result.posts.map(post => post.id || '').filter(id => id);
        if (postIds.length > 0) {
          const votes = await getUserVotesForPosts(user.id, postIds);
          setUserVotes(votes);
        }
      }
    } catch (error) {
      console.error("Error refreshing posts:", error);
    } finally {
      setLoadingPosts(false);
    }
  };

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

  // Access denied state
  if (hasAccessError) {
    return (
      <div className="min-h-screen flex bg-[var(--background)]">
        {user && <MainNavbar user={user} />}

        <main className="flex-1 ml-0 p-6 bg-[var(--background)]">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-[var(--card)] border-[var(--border)]">
              <CardHeader>
                <CardTitle className="text-xl text-[var(--foreground)]">
                  Access Denied
                </CardTitle>
                <CardDescription className="text-[var(--muted-foreground)]">
                  You don't have access to this community.
                </CardDescription>
              </CardHeader>
              <CardFooter className="flex gap-4">
                <Button asChild >
                  <Link href="/communities">View Your Communities</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/communities/apply">Apply to Join</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  if (!user || !community) return null;

  // Calculate available sort options
  const availableSortOptions = [
    { value: "recent", label: "Recent" },
    ...(activeCategory === "all" ? [
      { value: "upvoted", label: "Most Upvoted" },
      { value: "trending", label: "Trending" },
    ] : []),
  ];


  return (
    <div className="min-h-screen flex bg-[var(--background)]">
      <MainNavbar user={user} />

      <div className="flex-1 flex flex-col min-h-screen bg-[var(--background)]">
        <main className="flex-1 ml-0 p-6 bg-[var(--background)]">
          <div className="max-w-4xl mx-auto">
            {/* Community Header and Filters Card */}
            <Card className="mb-6 bg-[var(--card)] border-[var(--border)]">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-[var(--foreground)]">
                  {community.name}
                </CardTitle>
                <CardDescription className="text-[var(--muted-foreground)]">
                  {community.bio || "No description available"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Community stats */}
                <div className="grid grid-cols-3 gap-4 text-sm mb-6">
                  <div>
                    <p className="text-[var(--muted-foreground)]">Members</p>
                    <p className="font-medium text-[var(--foreground)]">{community.stats?.memberCount || 0}</p>
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
            {loadingPosts && posts.length === 0 ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-40 w-full bg-[var(--muted)]" />
                ))}
              </div>
            ) : posts.length === 0 ? (
              <Card className="bg-[var(--card)] border-[var(--border)] p-8 text-center">
                <CardContent>
                  <p className="text-[var(--muted-foreground)]">
                    No posts found for the selected category.
                  </p>
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
                    userVote={post.id ? userVotes[post.id] : undefined}
                    refreshPosts={refreshPosts}
                  />
                ))}

                {/* Load more button for pagination */}
                {hasMore && (
                  <Button
                    onClick={loadMorePosts}
                    disabled={loadingPosts}
                    className="w-full mt-4 bg-[var(--secondary)] text-[var(--foreground)] hover:bg-[var(--accent)]"
                  >
                    {loadingPosts ? (
                      <>
                        <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                        Loading...
                      </>
                    ) : (
                      "Load More"
                    )}
                  </Button>
                )}

              </div>

            )}

          </div>


        </main>
        {/* Replace the default footer with the new Footer component */}
        <Footer />
      </div>
    </div>
  );
}