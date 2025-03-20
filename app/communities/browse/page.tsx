// app/communities/browse/page.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search, Filter, MapPin } from "lucide-react";
import { getCurrentUser } from "@/app/services/authService";
import { UserModel } from "@/app/models/UserModel";
import { getAllCommunities } from "@/app/services/communityService";
import { checkCommunityMembership } from "@/app/services/communityService";

import { MainNavbar } from "@/components/ui/main-navbar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Define Community interface (simplified version of what you have in your types)
interface Community {
    id: string;
    name: string;
    bio?: string; // Make bio optional since it might be undefined
    location: {
        city: string;
        state: string;
        zipCodes: string[];
    };
    stats: {
        memberCount: number;
    };
}

function BrowseCommunitiesContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialQuery = searchParams.get('q') || '';
    const initialZip = searchParams.get('zip') || '';

    const [user, setUser] = useState<UserModel | null>(null);
    const [communities, setCommunities] = useState<Community[]>([]);
    const [filteredCommunities, setFilteredCommunities] = useState<Community[]>([]);
    const [userMemberships, setUserMemberships] = useState<Record<string, boolean>>({});

    const [searchQuery, setSearchQuery] = useState(initialQuery);
    const [zipCode, setZipCode] = useState(initialZip);
    const [sortBy, setSortBy] = useState<'name' | 'size' | 'location'>('name');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch current user and communities
    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);

                // Get currently logged in user
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

                // Fetch all available communities
                const allCommunities = await getAllCommunities();
                setCommunities(allCommunities);

                // Apply initial filtering if search params exist
                applyFilters(allCommunities, initialQuery, initialZip);
            } catch (error) {
                console.error("Error fetching data:", error);
                setError("Failed to load communities. Please try again.");
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [router, initialQuery, initialZip]);

    useEffect(() => {
        async function fetchUserMemberships() {
            if (!user || !user.id) return;

            try {
                // Create an object to track which communities the user is already a member of
                const memberships: Record<string, boolean> = {};

                // Check membership for each community
                for (const community of filteredCommunities) {
                    const isMember = await checkCommunityMembership(user.id, community.id);
                    memberships[community.id] = isMember;
                }

                setUserMemberships(memberships);
            } catch (error) {
                console.error("Error checking community memberships:", error);
            }
        }

        if (filteredCommunities.length > 0) {
            fetchUserMemberships();
        }
    }, [user, filteredCommunities]);

    // Filter communities based on search query and zip code
    const applyFilters = (communityList: Community[], query: string, zip: string) => {
        let filtered = [...communityList];

        // Filter by name or bio
        if (query) {
            const lowercaseQuery = query.toLowerCase();
            filtered = filtered.filter(community =>
                community.name.toLowerCase().includes(lowercaseQuery) ||
                (community.bio ? community.bio.toLowerCase().includes(lowercaseQuery) : false)
            );
        }

        // Filter by zip code
        if (zip) {
            filtered = filtered.filter(community =>
                community.location?.zipCodes?.includes(zip)
            );
        }

        // Apply sorting
        if (sortBy === 'name') {
            filtered.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortBy === 'size') {
            filtered.sort((a, b) => (b.stats?.memberCount || 0) - (a.stats?.memberCount || 0));
        } else if (sortBy === 'location') {
            filtered.sort((a, b) => {
                const locationA = `${a.location?.city || ''}, ${a.location?.state || ''}`;
                const locationB = `${b.location?.city || ''}, ${b.location?.state || ''}`;
                return locationA.localeCompare(locationB);
            });
        }

        setFilteredCommunities(filtered);
    };

    // Handle search form submission
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault(); // Prevent default form submission

        // Trim input values to remove leading/trailing whitespace
        const trimmedQuery = searchQuery.trim();
        const trimmedZip = zipCode.trim();

        // Update the URL with search params
        const params = new URLSearchParams();
        if (trimmedQuery) params.set('q', trimmedQuery);
        if (trimmedZip) params.set('zip', trimmedZip);

        const searchUrl = `/communities/browse?${params.toString()}`;
        window.history.pushState({ path: searchUrl }, '', searchUrl);

        // Apply filters with trimmed values
        applyFilters(communities, trimmedQuery, trimmedZip);
    };

    // Handle sort change
    const handleSortChange = (value: string) => {
        const sortValue = value as 'name' | 'size' | 'location';
        setSortBy(sortValue);
        applyFilters(communities, searchQuery, zipCode);
    };

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent"></div>
                    <p className="text-[var(--foreground)]">Loading communities...</p>
                </div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen flex bg-[var(--background)]">
            <MainNavbar user={user} />

            <div className="flex-1 ml-0 flex flex-col min-h-screen bg-[var(--background)]">
                <main className="flex-grow p-6">
                    <div className="max-w-4xl mx-auto">
                        

                        {/* 
                        Back button 
                        */}

                        {/* 
                        <div className="mb-6">
                            <Button variant="outline" onClick={() => router.back()} className="mb-2">
                                <ArrowLeft className="h-4 w-4 mr-2" /> Back
                            </Button>
                        </div>
                        */}

    
                        <h1 className="text-3xl font-bold mb-6 text-[var(--foreground)]">Browse Communities</h1>

                        {/* Search and filter form */}
                        <Card className="bg-[var(--card)] border-[var(--border)] mb-6">
                            <CardHeader>
                                <CardTitle className="text-xl text-[var(--foreground)]">
                                    Find Your Community
                                </CardTitle>
                                <CardDescription className="text-[var(--muted-foreground)]">
                                    Search by name, description, or location to find available communities
                                </CardDescription>
                            </CardHeader>

                            <form onSubmit={handleSearch} className="space-y-4">
                                <CardContent className="space-y-4">
                                    {/* Search input */}
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-3 h-4 w-4 text-[var(--muted-foreground)]" />
                                            <Input
                                                type="text"
                                                placeholder="Search by name or description"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="pl-10 bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]"
                                            />
                                        </div>

                                        {/* Zip code input */}
                                        <div className="relative w-full sm:w-32">
                                            <MapPin className="absolute left-3 top-3 h-4 w-4 text-[var(--muted-foreground)]" />
                                            <Input
                                                type="text"
                                                placeholder="Zip code"
                                                value={zipCode}
                                                onChange={(e) => setZipCode(e.target.value)}
                                                className="pl-10 bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]"
                                            />
                                        </div>
                                    </div>

                                    {/* Sort options */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <Filter className="h-4 w-4 text-[var(--muted-foreground)]" />
                                            <span className="text-sm text-[var(--muted-foreground)]">Sort by:</span>
                                        </div>

                                        <Select value={sortBy} onValueChange={handleSortChange}>
                                            <SelectTrigger className="w-[180px] bg-[var(--card)] border-[var(--border)]">
                                                <SelectValue placeholder="Sort by" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-[var(--card)] border-[var(--border)]">
                                                <SelectItem value="name" className="text-[var(--foreground)]">Name (A-Z)</SelectItem>
                                                <SelectItem value="size" className="text-[var(--foreground)]">Size (Largest first)</SelectItem>
                                                <SelectItem value="location" className="text-[var(--foreground)]">Location</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Search button */}
                                    <Button type="submit" className="w-full">
                                        Search Communities
                                    </Button>

                                    {/* Error message */}
                                    {error && (
                                        <div className="p-3 text-sm bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-md">
                                            {error}
                                        </div>
                                    )}
                                </CardContent>
                            </form>
                        </Card>

                        {/* Results */}
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold mb-4 text-[var(--foreground)]">
                                {filteredCommunities.length === 0
                                    ? "No communities found"
                                    : `Found ${filteredCommunities.length} ${filteredCommunities.length === 1 ? 'community' : 'communities'}`}
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredCommunities.map((community) => (
                                    <Card key={community.id} className="bg-[var(--card)] border-[var(--border)] hover:shadow-md transition-shadow">
                                        <CardHeader>
                                            <CardTitle className="text-lg text-[var(--foreground)]">{community.name}</CardTitle>
                                            <CardDescription className="text-[var(--muted-foreground)]">
                                                {community.location?.city || ''}, {community.location?.state || ''}
                                            </CardDescription>
                                        </CardHeader>

                                        <CardContent>
                                            <p className="text-sm text-[var(--foreground)] mb-2">
                                                {community.bio && community.bio.length > 120
                                                    ? `${community.bio.substring(0, 120)}...`
                                                    : community.bio || 'No description available'}
                                            </p>

                                            <div className="text-xs text-[var(--muted-foreground)]">
                                                <span className="inline-block mr-4">
                                                    {community.stats?.memberCount || 0} {(community.stats?.memberCount || 0) === 1 ? 'member' : 'members'}
                                                </span>

                                                <span className="inline-block">
                                                    Zip codes: {community.location?.zipCodes?.join(", ") || 'None specified'}
                                                </span>
                                            </div>
                                        </CardContent>

                                        <CardFooter>
                                            {userMemberships[community.id] ? (
                                                <Button disabled className="w-full bg-green-500 hover:bg-green-500 dark:bg-green-700 dark:hover:bg-green-700">
                                                    Already a Member
                                                </Button>
                                            ) : (
                                                <Button variant="outline" asChild className="w-full">
                                                <Link href={`/communities/apply/${community.id}`}>
                                                    Apply to Join
                                                </Link>
                                            </Button>
                                            )}
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>

                            {filteredCommunities.length === 0 && (
                                <Card className="bg-[var(--card)] border-[var(--border)] text-center p-8">
                                    <CardContent>
                                        <p className="text-[var(--muted-foreground)] mb-4">
                                            No communities match your search criteria. Try adjusting your filters or browse all available communities.
                                        </p>

                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setSearchQuery('');
                                                setZipCode('');
                                                applyFilters(communities, '', '');

                                                // Update URL to remove search params
                                                window.history.pushState({ path: '/communities/browse' }, '', '/communities/browse');
                                            }}
                                        >
                                            View All Communities
                                        </Button>
                                    </CardContent>
                                </Card>
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

export default function BrowseCommunitiesPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent"></div>
                    <p className="text-[var(--foreground)]">Loading...</p>
                </div>
            </div>
        }>
            <BrowseCommunitiesContent />
        </Suspense>
    );
}