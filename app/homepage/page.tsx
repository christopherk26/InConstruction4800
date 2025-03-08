"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/app/services/authService";
import {
  getUserCommunities,
  getCommunityPosts,
  getCommunityCategories,
  formatCategoryName,
  saveUserCommunitySelection,
  getUserCommunitySelection
} from "@/app/services/communityService";
import { UserModel } from "@/app/models/UserModel";
import { Moon, Sun, LogOut, MessageCircle, ThumbsUp, ThumbsDown, Filter, Home, Search, PlusCircle, Bell, User, Settings, Building } from "lucide-react";
import { signOut } from "@/app/services/authService";
import { DocumentSnapshot } from "firebase/firestore";

// Import types from database.ts instead of redefining
import { Community as DBCommunity, Post as DBPost } from '@/app/types/database';

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

// Types that extend database types with UI-specific needs
interface Community extends Omit<DBCommunity, 'id'> {
  id: string; // Make id required for UI
}

interface Post extends Omit<DBPost, 'id'> {
  id: string; // Make id required for UI
}

type SortOption = 'recent' | 'upvoted' | 'trending';

type FetchState = 'idle' | 'loading' | 'success' | 'error';

export default function Homepage() {
  // Initialize router for navigation
  const router = useRouter();

  // State management for user, communities, and posts
  const [user, setUser] = useState<UserModel | null>(null);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string>("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [lastVisible, setLastVisible] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Track loading/success/error states for different data fetching operations
  const [userFetchState, setUserFetchState] = useState<FetchState>('idle');
  const [communityFetchState, setCommunityFetchState] = useState<FetchState>('idle');
  const [postsFetchState, setPostsFetchState] = useState<FetchState>('idle');

  // Handle user authentication and fetch profile
  useEffect(() => {
    async function fetchUserData() {
      setUserFetchState('loading');
      try {
        // Get currently logged in user
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          // Redirect to login if no user found
          router.push("/auth/login");
          return;
        }

        // Check if user is verified
        const isVerified = await currentUser.isVerified();
        if (!isVerified) {
          // Redirect to verification page if not verified
          router.push("/auth/authenticate-person");
          return;
        }

        // Set user in state
        setUser(currentUser);
        setUserFetchState('success');
      } catch (error) {
        console.error("Error fetching user:", error);
        setUserFetchState('error');
        router.push("/auth/login");
      }
    }

    fetchUserData();

    // Initialize theme state based on document class
    const isDark = document.documentElement.classList.contains("dark");
    setIsDarkMode(isDark);
  }, [router]);

  // Fetch communities when user is loaded
  useEffect(() => {
    // Exit early if no user or user ID
    if (!user || !user.id) return;

    async function fetchCommunities() {
      setCommunityFetchState('loading');
      try {
        if (!user) return;

        // Get communities the user is a member of
        const userCommunities = await getUserCommunities(user.id || '');

        // Format community data with defaults for missing fields
        const formattedCommunities = userCommunities.map((community: any) => ({
          id: community.id,
          name: community.name,
          bio: community.bio || "",
          location: community.location || { city: "", state: "", zipCodes: [] },
          stats: community.stats || { memberCount: 0, verifiedCount: 0, ghostCount: 0, lastUpdated: { seconds: 0, nanoseconds: 0 } },
          contractInfo: community.contractInfo || { startDate: { seconds: 0, nanoseconds: 0 }, renewalDate: { seconds: 0, nanoseconds: 0 }, status: 'active' },
          status: community.status || 'active',
          createdAt: community.createdAt || { seconds: 0, nanoseconds: 0 }
        }));

        setCommunities(formattedCommunities);

        // Restore previous community selection or use first available
        if (!user) return;

        const savedCommunityId = getUserCommunitySelection(user.id || '');
        if (savedCommunityId && formattedCommunities.some(c => c.id === savedCommunityId)) {
          setSelectedCommunityId(savedCommunityId);
        } else if (formattedCommunities.length > 0) {
          setSelectedCommunityId(formattedCommunities[0].id);
        }

        setCommunityFetchState('success');
      } catch (error) {
        console.error("Error fetching communities:", error);
        setCommunityFetchState('error');
      }
    }

    fetchCommunities();
  }, [user]);

  // Fetch posts when community selection or filters change
  useEffect(() => {
    // Exit early if no community selected
    if (!selectedCommunityId) return;

    async function fetchPosts() {
      // Set loading state and reset posts
      setPostsFetchState('loading');
      setPosts([]);
      setLastVisible(null);
      setHasMore(true);

      try {
        // Get posts with filters
        const result = await getCommunityPosts(selectedCommunityId, {
          categoryTag: activeCategory === "all" ? undefined : activeCategory,
          sortBy,
          limit: 10
        });

        // Update posts state
        setPosts(result.posts as Post[]);
        setLastVisible(result.lastVisible);
        setHasMore(result.posts.length === 10);

        // Save selected community to local storage
        if (user && user.id) {
          saveUserCommunitySelection(user.id, selectedCommunityId);
        }

        setPostsFetchState('success');
      } catch (error) {
        console.error("Error fetching posts:", error);
        setPostsFetchState('error');
      }
    }

    fetchPosts();
  }, [selectedCommunityId, activeCategory, sortBy, user?.id]);

  // Reset sort option when category changes to non-"all"
  useEffect(() => {
    if (activeCategory !== "all" && sortBy !== "recent") {
      setSortBy("recent");
    }
  }, [activeCategory]);

  // Function to load more posts for pagination
  const loadMorePosts = async () => {
    if (!selectedCommunityId || !lastVisible || !hasMore) return;

    setPostsFetchState('loading');

    try {
      // Get next batch of posts starting after last visible
      const result = await getCommunityPosts(selectedCommunityId, {
        categoryTag: activeCategory === "all" ? undefined : activeCategory,
        sortBy,
        limit: 10,
        lastVisible
      });

      // Append new posts to existing ones
      setPosts(prev => [...prev, ...(result.posts as Post[])]);
      setLastVisible(result.lastVisible);
      setHasMore(result.posts.length === 10);
      setPostsFetchState('success');
    } catch (error) {
      console.error("Error loading more posts:", error);
      setPostsFetchState('error');
    }
  };

  // Toggle between light and dark theme
  const toggleTheme = () => {
    const htmlElement = document.documentElement;
    if (isDarkMode) {
      htmlElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      htmlElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
    setIsDarkMode(!isDarkMode);
  };

  // Handle user logout
  const handleLogout = async () => {
    try {
      await signOut();
      router.push("/auth/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  // Handle community selection change
  const handleCommunityChange = (value: string) => {
    setSelectedCommunityId(value);
  };

  // Calculate available sort options based on active category
  const availableSortOptions: { value: SortOption; label: string }[] = [
    { value: "recent", label: "Recent" },
    ...(activeCategory === "all" ? [
      { value: "upvoted" as SortOption, label: "Most Upvoted" },
      { value: "trending" as SortOption, label: "Trending" },
    ] : []),
  ];

  // Format date and time from timestamp
  const formatDateTime = (timestamp: { seconds: number, nanoseconds: number }) => {
    const date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Loading state
  if (userFetchState === 'loading' || communityFetchState === 'loading' && communities.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent"></div>
          <p className="text-[var(--foreground)]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Get selected community data
  const selectedCommunity = communities.find(c => c.id === selectedCommunityId);

  return (
    <div className="min-h-screen flex bg-[var(--background)]">
      {/* Fixed Sidebar */}
      <aside className="fixed top-0 left-0 h-screen w-64 bg-[var(--card)] shadow-md p-4 flex flex-col space-y-4">
        {/* Logo and user info */}
        <div>
          <Link href="/homepage" className="flex items-center space-x-2 mb-4">
            <img src="/mainlogo.png" alt="Town Hall" className="w-12 h-12" />
            <span className="text-xl font-bold text-[var(--foreground)]">Town Hall</span>
          </Link>
          <p className="text-sm text-[var(--muted-foreground)] mb-4">
            Hello, {user.email}
          </p>
        </div>

        {/* Navigation menu */}
        <nav className="space-y-2">
          {/* Home link */}
          <Button variant="ghost" asChild className="w-full justify-between text-[var(--foreground)] hover:bg-[var(--secondary)]">
            <Link href="/homepage">
              <span>Home</span>
              <Home className="h-4 w-4" />
            </Link>
          </Button>

          {/* Search link */}
          <Button variant="ghost" asChild className="w-full justify-between text-[var(--foreground)] hover:bg-[var(--secondary)]">
            <Link href="/search">
              <span>Search</span>
              <Search className="h-4 w-4" />
            </Link>
          </Button>

          {/* Create Post link */}
          <Button variant="ghost" asChild className="w-full justify-between text-[var(--foreground)] hover:bg-[var(--secondary)]">
            <Link href="/create-post">
              <span>Create Post</span>
              <PlusCircle className="h-4 w-4" />
            </Link>
          </Button>

          {/* Notifications link */}
          <Button variant="ghost" asChild className="w-full justify-between text-[var(--foreground)] hover:bg-[var(--secondary)]">
            <Link href="/notifications">
              <span>Notifications</span>
              <Bell className="h-4 w-4" />
            </Link>
          </Button>

          {/* Profile link */}
          <Button variant="ghost" asChild className="w-full justify-between text-[var(--foreground)] hover:bg-[var(--secondary)]">
            <Link href={`/user/${user.id}`}>
              <span>Profile</span>
              <User className="h-4 w-4" />
            </Link>
          </Button>

          {/* Settings link */}
          <Button variant="ghost" asChild className="w-full justify-between text-[var(--foreground)] hover:bg-[var(--secondary)]">
            <Link href="/settings">
              <span>Settings</span>
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </nav>

        {/* Communities section */}
        <div className="space-y-2 pt-4 border-t border-[var(--border)]">

          {/* Communities header */}
          <div className="flex items-center justify-center">
            <span className="text-sm font-medium text-[var(--foreground)]">
              Communities
            </span>
          </div>

          {/* Add Community button - styled to match dropdown width */}
          <Button
            variant="outline"
            size="sm"
            asChild
            className="w-full justify-between text-[var(--foreground)] border-[var(--border)]"
          >
            <Link href="/communities/apply">
              <span>Add Community</span>
              <PlusCircle className="h-4 w-4" />
            </Link>
          </Button>

          {/* Community dropdown */}
          {communities.length > 0 ? (
            <Select onValueChange={handleCommunityChange} value={selectedCommunityId === "" ? undefined : selectedCommunityId}>
              <SelectTrigger className="w-full bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]">
                <SelectValue placeholder="Select a community" />
              </SelectTrigger>
              <SelectContent className="bg-[var(--card)] border-[var(--border)]">
                <SelectGroup>
                  <SelectLabel className="text-[var(--foreground)]">Your Communities</SelectLabel>
                  {communities.map((community) => (
                    <SelectItem key={community.id} value={community.id} className="text-[var(--foreground)] hover:bg-[var(--secondary)]">
                      {community.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)]">No communities yet</p>
          )}
        </div>

        {/* Theme toggle and logout */}
        <div className="space-y-2 mt-auto">
          {/* Theme toggle button */}
          <Button variant="ghost" onClick={toggleTheme} className="w-full justify-between text-[var(--foreground)] hover:bg-[var(--secondary)]">
            <span>{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* Logout button */}
          <Button variant="ghost" onClick={handleLogout} className="w-full justify-between text-[var(--foreground)] hover:bg-[var(--secondary)]">
            <span>Logout</span>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-6 bg-[var(--background)]">
        <div className="max-w-4xl mx-auto">
          {/* Community Header and Filters Card */}
          {selectedCommunity && (
            <Card className="mb-6 bg-[var(--card)] border-[var(--border)]">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-[var(--foreground)]">
                  {selectedCommunity.name}
                </CardTitle>
                <CardDescription className="text-[var(--muted-foreground)]">
                  {selectedCommunity.bio || "No description available"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Community stats */}
                <div className="grid grid-cols-3 gap-4 text-sm mb-6">
                  <div>
                    <p className="text-[var(--muted-foreground)]">Members</p>
                    <p className="font-medium text-[var(--foreground)]">{selectedCommunity.stats?.memberCount || 0}</p>
                  </div>
                  <div>
                    <p className="text-[var(--muted-foreground)]">Verified Users</p>
                    <p className="font-medium text-[var(--foreground)]">{selectedCommunity.stats?.verifiedCount || 0}</p>
                  </div>
                  <div>
                    <p className="text-[var(--muted-foreground)]">Location</p>
                    <p className="font-medium text-[var(--foreground)]">
                      {selectedCommunity.location?.city && selectedCommunity.location?.state
                        ? `${selectedCommunity.location.city}, ${selectedCommunity.location.state}`
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
                    {/* Category filter */}
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

                    {/* Sort options */}
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-2 text-[var(--muted-foreground)]">Sort by</p>
                      <Select onValueChange={(value) => setSortBy(value as SortOption)} value={sortBy}>
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
          )}

          {/* Prompt to select a community if none selected */}
          {!selectedCommunity && communities.length > 0 && (
            <Card className="mb-6 bg-[var(--card)] border-[var(--border)]">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-[var(--foreground)]">
                  Select a Community
                </CardTitle>
                <CardDescription className="text-[var(--muted-foreground)]">
                  Choose a community from the sidebar to view posts
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {/* No communities message */}
          {communities.length === 0 && communityFetchState === 'success' && (
            <Card className="mb-6 bg-[var(--card)] border-[var(--border)]">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-[var(--foreground)]">
                  No Communities Found
                </CardTitle>
                <CardDescription className="text-[var(--muted-foreground)]">
                  You haven't joined any communities yet
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button asChild>
                  <Link href="/communities/apply">Join a Community</Link>
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Posts List */}
          {selectedCommunity && (
            <>
              {/* Loading skeletons when initially loading posts */}
              {postsFetchState === 'loading' && posts.length === 0 ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-40 w-full bg-[var(--muted)]" />
                  ))}
                </div>
              ) : posts.length === 0 ? (
                <Card className="bg-[var(--card)] border-[var(--border)] p-8 text-center">
                  <CardContent>
                    <p className="text-[var(--muted-foreground)]">
                      {postsFetchState === 'error' ?
                        "Error loading posts. Please try again." :
                        "No posts found for the selected category."}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {/* Post cards */}
                  {posts.map((post) => (
                    <Card key={post.id} className="bg-[var(--card)] border-[var(--border)]">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            {/* Emergency posts have red titles */}
                            <CardTitle className={post.isEmergency ? 'text-red-500 dark:text-red-400' : 'text-[var(--foreground)]'}>
                              <Link href={`/post/${post.id}`} className="hover:underline">
                                {post.isEmergency ? '🚨 ' : ''}{post.title}
                              </Link>
                            </CardTitle>
                            <CardDescription className="text-[var(--muted-foreground)]">
                              {/* Show author name and role */}
                              Posted by {post.author?.name || "Unknown"}
                              {post.author?.role && <span className="italic ml-1">({post.author.role})</span>} • {" "}
                              {/* Format date with time */}
                              {formatDateTime(post.createdAt)}
                            </CardDescription>
                          </div>
                          <span className="text-xs px-2 py-1 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">
                            {formatCategoryName(post.categoryTag)}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-[var(--foreground)]">{post.content}</p>
                        {/* Media preview grid */}
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
                      <CardFooter className="flex justify-between items-center">
                        {/* Post action buttons */}
                        <div className="flex space-x-4">
                          <Button variant="ghost" size="sm" className="text-[var(--foreground)] hover:bg-[var(--secondary)]">
                            <ThumbsUp className="h-4 w-4 mr-1" />
                            <span>{post.stats?.upvotes || 0}</span>
                          </Button>
                          <Button variant="ghost" size="sm" className="text-[var(--foreground)] hover:bg-[var(--secondary)]">
                            <ThumbsDown className="h-4 w-4 mr-1" />
                            <span>{post.stats?.downvotes || 0}</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[var(--foreground)] hover:bg-[var(--secondary)]"
                            asChild
                          >
                            <Link href={`/post/${post.id}`}>
                              <MessageCircle className="h-4 w-4 mr-1" />
                              <span>{post.stats?.commentCount || 0}</span>
                            </Link>
                          </Button>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          asChild
                        >
                          <Link href={`/post/${post.id}`}>
                            View Details
                          </Link>
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                  {/* Load more button for pagination */}
                  {hasMore && (
                    <Button
                      onClick={loadMorePosts}
                      disabled={postsFetchState === 'loading'}
                      className="w-full mt-4 bg-[var(--secondary)] text-[var(--foreground)] hover:bg-[var(--accent)]"
                    >
                      {postsFetchState === 'loading' ? (
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
            </>
          )}
        </div>
      </main>
    </div>
  );
}