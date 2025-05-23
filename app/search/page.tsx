//app/search/page.tsx
"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/app/services/authService";
import {
  getUserCommunities,
  getUserCommunitySelection,
  setUserCommunitySelection
} from "@/app/services/communityService";
import { searchUsers, searchPosts } from "@/app/services/searchService";
import { getUserVotesForPosts } from "@/app/services/postService";
import { UserModel } from "@/app/models/UserModel";
import { MainNavbar } from "@/components/ui/main-navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Footer } from "@/components/ui/footer";
import { Search as SearchIcon, Users, FileText, Filter, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User as UserType, Post } from "@/app/types/database";
import { UserCard } from "@/components/shared/UserCard";
import { PostCard } from "@/components/community/post-card";


// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return debouncedValue;
}

// Loading component
function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent"></div>
        <p className="text-[var(--foreground)]">Loading...</p>
      </div>
    </div>
  );
}

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const initialTab = searchParams.get("tab") || "all";
  const initialCommunity = searchParams.get("community") || "";

  // State
  const [user, setUser] = useState<UserModel | null>(null);
  const [communities, setCommunities] = useState<{ id: string; name: string }[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<string>(initialCommunity);
  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<"all" | "users" | "posts">(initialTab as any || "all");
  const [isSearching, setIsSearching] = useState(false);
  const [userResults, setUserResults] = useState<UserType[]>([]);
  const [postResults, setPostResults] = useState<Post[]>([]);
  const [userVotes, setUserVotes] = useState<Record<string, "upvote" | "downvote">>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Dropdown state
  const [suggestions, setSuggestions] = useState<{ users: UserType[]; posts: Post[] }>({ users: [], posts: [] });
  const [showDropdown, setShowDropdown] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  // Fetch suggestions
  const fetchSuggestions = async (query: string, communityId: string) => {
    if (!query.trim() || !communityId) return { users: [], posts: [] };
    try {
      const [users, posts] = await Promise.all([searchUsers(query, communityId), searchPosts(query, communityId)]);
      return { users, posts };
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      return { users: [], posts: [] };
    }
  };

  // Update suggestions when query changes
  useEffect(() => {
    if (debouncedQuery && selectedCommunity) {
      fetchSuggestions(debouncedQuery, selectedCommunity).then(setSuggestions);
      setShowDropdown(true);
    } else {
      setSuggestions({ users: [], posts: [] });
      setShowDropdown(false);
    }
  }, [debouncedQuery, selectedCommunity]);

  // Fetch user votes
  useEffect(() => {
    async function fetchUserVotes() {
      if (!user || !user.id || postResults.length === 0) return;
      try {
        const postIds = postResults.map((post) => post.id || "").filter((id) => id);
        if (postIds.length > 0) {
          const votes = await getUserVotesForPosts(user.id, postIds);
          setUserVotes(votes);
        }
      } catch (error) {
        console.error("Error fetching user votes:", error);
      }
    }
    fetchUserVotes();
  }, [user, postResults]);

  // Fetch user and communities
  useEffect(() => {
    async function loadUserData() {
      try {
        setLoading(true);
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
        const userCommunities = await getUserCommunities(currentUser.id || "");
        const formattedCommunities = userCommunities.map((community: any) => ({
          id: community.id,
          name: community.name,
        }));
        setCommunities(formattedCommunities);
        if (!selectedCommunity) {
          // First try to get from URL params (which you already handle with initialCommunity)
          // Then try to get from localStorage
          const savedCommunity = currentUser.id ? getUserCommunitySelection(currentUser.id) : null;

          if (savedCommunity && formattedCommunities.some(c => c.id === savedCommunity)) {
            setSelectedCommunity(savedCommunity);
          } else if (formattedCommunities.length > 0) {
            setSelectedCommunity(formattedCommunities[0].id);
          }
        }
        setLoading(false);
        if (initialQuery && selectedCommunity) {
          performSearch(initialQuery, selectedCommunity, initialTab as any || "all");
        }
      } catch (error) {
        console.error("Error loading user data:", error);
        setError("Failed to load user data. Please try again.");
        setLoading(false);
      }
    }
    loadUserData();
  }, [router, initialQuery, initialTab, initialCommunity, selectedCommunity]);

  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCommunity) {
      setError("Please select a community to search in");
      return;
    }
    const searchUrl = `/search?q=${encodeURIComponent(query)}&tab=${activeTab}&community=${selectedCommunity}`;
    window.history.pushState({ path: searchUrl }, "", searchUrl);
    performSearch(query, selectedCommunity, activeTab);
  };

  // Perform search
  const performSearch = async (searchQuery: string, communityId: string, tab: "all" | "users" | "posts") => {
    if (!searchQuery.trim() || !communityId) return;
    setIsSearching(true);
    setError(null);
    try {
      if (tab === "all" || tab === "users") {
        const users = await searchUsers(searchQuery, communityId);
        setUserResults(users);
      }
      if (tab === "all" || tab === "posts") {
        const posts = await searchPosts(searchQuery, communityId);
        setPostResults(posts);
        if (user && user.id && posts.length > 0) {
          const postIds = posts.map((post) => post.id || "").filter((id) => id);
          const votes = await getUserVotesForPosts(user.id, postIds);
          setUserVotes(votes);
        }
      }
    } catch (error) {
      console.error("Error performing search:", error);
      setError("Failed to perform search. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const refreshSearch = () => {
    if (query && selectedCommunity) {
      performSearch(query, selectedCommunity, activeTab);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!user) return null;

  if (communities.length === 0) {
    return (
      <div className="min-h-screen flex bg-[var(--background)]">
        <MainNavbar user={user} />
        <div className="flex-1 ml-0 flex flex-col min-h-screen bg-[var(--background)]">
          <main className="flex-grow p-6">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-3xl font-bold mb-6 text-[var(--foreground)]">Search</h1>
              <Card className="bg-[var(--card)] border-[var(--border)] text-center p-8">
                <CardContent>
                  <AlertCircle className="h-12 w-12 mx-auto text-[var(--muted-foreground)] mb-4" />
                  <h2 className="text-xl font-semibold mb-2 text-[var(--foreground)]">No Communities Joined</h2>
                  <p className="text-[var(--muted-foreground)] mb-4">
                    You need to join a community before you can search for people or posts.
                  </p>
                  <Button asChild>
                    <Link href="/communities/apply">Join a Community</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </main>
          <Footer />
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
            <h1 className="text-3xl font-bold mb-6 text-[var(--foreground)]">Search</h1>
            <Card className="bg-[var(--card)] border-[var(--border)] mb-6">
              <CardHeader>
                <CardTitle className="text-xl text-[var(--foreground)]">Search for People and Posts</CardTitle>
                <CardDescription className="text-[var(--muted-foreground)]">
                  Find users and posts in your community
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSearch}>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <SearchIcon className="absolute left-3 top-3 h-5 w-5 text-[var(--muted-foreground)]" />
                    <Input
                      placeholder="Search by name, bio, or content..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="pl-10 bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]"
                      onFocus={() => setShowDropdown(true)}
                      onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    />
                    {showDropdown && selectedCommunity && (suggestions.users.length > 0 || suggestions.posts.length > 0) && (
                      <Card className="absolute z-10 w-full mt-1 bg-[var(--card)] border-[var(--border)] max-h-60 overflow-y-auto">
                        <CardContent className="p-2">
                          {suggestions.users.slice(0, 3).map((user) => (
                            <Link
                              key={user.id}
                              href={`/communities/${selectedCommunity}/users/${user.id}`}
                              className="block p-2 hover:bg-[var(--secondary)] text-[var(--foreground)]"
                            >
                              {`${user.firstName} ${user.lastName}`}
                            </Link>
                          ))}
                          {suggestions.posts.slice(0, 3).map((post) => (
                            <Link
                              key={post.id}
                              href={`/communities/${selectedCommunity}/posts/${post.id}`}
                              className="block p-2 hover:bg-[var(--secondary)] text-[var(--foreground)]"
                            >
                              {post.title}
                            </Link>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <Label htmlFor="community" className="block mb-2 text-sm">
                        Select Community
                      </Label>
                      <Select
                        value={selectedCommunity}
                        onValueChange={(value) => {
                          setSelectedCommunity(value);
                          if (user && user.id) {
                            setUserCommunitySelection(user.id, value);
                          }
                        }}
                      >
                        <SelectTrigger
                          id="community"
                          className="w-full bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]"
                        >
                          <SelectValue placeholder="Select community" />
                        </SelectTrigger>
                        <SelectContent className="bg-[var(--card)] border-[var(--border)]">
                          {communities.map((community) => (
                            <SelectItem
                              key={community.id}
                              value={community.id}
                              className="text-[var(--foreground)] hover:bg-[var(--secondary)]"
                            >
                              {community.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {error && (
                    <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100 p-3 rounded-md text-sm">
                      {error}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-start px-6 py-4">
                  <Button
                    type="submit"
                    variant="outline"
                    className="px-6 py-2"
                    disabled={!query.trim() || !selectedCommunity || isSearching}
                  >
                    {isSearching ? (
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                    ) : (
                      <SearchIcon className="h-4 w-4 mr-2" />
                    )}
                    Search
                  </Button>
                </CardFooter>
              </form>
            </Card>
            {(userResults.length > 0 || postResults.length > 0) && (
              <div>
                <Tabs defaultValue={activeTab} className="mb-6" onValueChange={(value) => setActiveTab(value as any)}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="all" className="flex items-center">
                      <Filter className="h-4 w-4 mr-2" />
                      All Results
                    </TabsTrigger>
                    <TabsTrigger value="users" className="flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      People ({userResults.length})
                    </TabsTrigger>
                    <TabsTrigger value="posts" className="flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      Posts ({postResults.length})
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="all" className="space-y-6">
                    {userResults.length > 0 && (
                      <div>
                        <h2 className="text-xl font-semibold mb-4 text-[var(--foreground)]">People</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                          {userResults.slice(0, 3).map((userResult) => (
                            <UserCard key={userResult.id} user={userResult} communityId={selectedCommunity} />
                          ))}
                          {userResults.length > 3 && (
                            <Button
                              variant="outline"
                              onClick={() => setActiveTab("users")}
                              className="col-span-full mx-auto mt-2"
                            >
                              View All {userResults.length} People
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                    {postResults.length > 0 && (
                      <div>
                        <h2 className="text-xl font-semibold mb-4 text-[var(--foreground)]">Posts</h2>
                        <div className="space-y-4 mb-6">
                          {postResults.slice(0, 3).map((post) => (
                            <PostCard
                              key={post.id}
                              post={post}
                              communityId={post.communityId}
                              userVote={post.id ? userVotes[post.id] : undefined}
                              refreshPosts={refreshSearch}
                            />
                          ))}
                          {postResults.length > 3 && (
                            <Button
                              variant="outline"
                              onClick={() => setActiveTab("posts")}
                              className="mx-auto block mt-4"
                            >
                              View All {postResults.length} Posts
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="users">
                    <h2 className="text-2xl font-semibold mb-4 text-[var(--foreground)]">People</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {userResults.map((userResult) => (
                        <UserCard key={userResult.id} user={userResult} communityId={selectedCommunity} />
                      ))}
                    </div>
                    {userResults.length === 0 && (
                      <p className="text-center text-[var(--muted-foreground)] py-8">
                        No users match your search criteria.
                      </p>
                    )}
                  </TabsContent>
                  <TabsContent value="posts">
                    <h2 className="text-2xl font-semibold mb-4 text-[var(--foreground)]">Posts</h2>
                    <div className="space-y-4">
                      {postResults.map((post) => (
                        <PostCard
                          key={post.id}
                          post={post}
                          communityId={post.communityId}
                          userVote={post.id ? userVotes[post.id] : undefined}
                          refreshPosts={refreshSearch}
                        />
                      ))}
                    </div>
                    {postResults.length === 0 && (
                      <p className="text-center text-[var(--muted-foreground)] py-8">
                        No posts match your search criteria.
                      </p>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}
            {query && !isSearching && userResults.length === 0 && postResults.length === 0 && (
              <Card className="bg-[var(--card)] border-[var(--border)] text-center p-8">
                <CardContent>
                  <SearchIcon className="h-12 w-12 mx-auto text-[var(--muted-foreground)] mb-4" />
                  <h2 className="text-xl font-semibold mb-2 text-[var(--foreground)]">No results found</h2>
                  <p className="text-[var(--muted-foreground)]">
                    We couldn't find any matches for "{query}" in this community. Please try a different
                    search term.
                  </p>
                </CardContent>
              </Card>
            )}
            {!query && userResults.length === 0 && postResults.length === 0 && (
              <Card className="bg-[var(--card)] border-[var(--border)] text-center p-8">
                <CardContent>
                  <SearchIcon className="h-12 w-12 mx-auto text-[var(--muted-foreground)] mb-4" />
                  <h2 className="text-xl font-semibold mb-2 text-[var(--foreground)]">Enter a search term</h2>
                  <p className="text-[var(--muted-foreground)]">
                    Search for people and posts in your selected community.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <SearchContent />
    </Suspense>
  );
}