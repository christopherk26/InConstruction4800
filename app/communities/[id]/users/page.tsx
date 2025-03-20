"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { getCurrentUser } from "@/app/services/authService";
import { getCommunityById, checkCommunityMembership } from "@/app/services/communityService";
import { getCommunityUsers } from "@/app/services/userService";
import { UserModel } from "@/app/models/UserModel";
import { MainNavbar } from "@/components/ui/main-navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User as UserType } from "@/app/types/database";

// Import the shared UserCard component
import { UserCard } from "@/components/shared/UserCard";

export default function CommunityUsersPage() {
  const router = useRouter();
  const params = useParams();
  const communityId = params?.id as string;

  // State for user and community data
  const [user, setUser] = useState<UserModel | null>(null);
  const [community, setCommunity] = useState<any | null>(null);
  const [communityUsers, setCommunityUsers] = useState<UserType[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserType[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Loading states
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingCommunity, setLoadingCommunity] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check user auth and community access
  useEffect(() => {
    async function checkAccess() {
      try {
        setLoadingUser(true);
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
        
        // Fetch community users
        setLoadingUsers(true);
        const users = await getCommunityUsers(communityId);
        setCommunityUsers(users);
        setFilteredUsers(users);
        setLoadingUsers(false);
      } catch (error) {
        console.error("Error checking access:", error);
        setError("Error loading community data. Please try again.");
        setLoadingUser(false);
        setLoadingCommunity(false);
        setLoadingUsers(false);
      }
    }

    if (communityId) {
      checkAccess();
    }
  }, [communityId, router]);

  // Apply search
  useEffect(() => {
    let result = [...communityUsers];
    
    // Apply search query
    if (searchQuery.trim() !== "") {
      const lowercaseQuery = searchQuery.toLowerCase();
      result = result.filter(user => 
        `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase().includes(lowercaseQuery) || 
        user.email.toLowerCase().includes(lowercaseQuery) ||
        (user.bio && user.bio.toLowerCase().includes(lowercaseQuery))
      );
    }
    
    setFilteredUsers(result);
  }, [searchQuery, communityUsers]);

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

  // Error state
  if (error && (!community || !user)) {
    return (
      <div className="min-h-screen flex bg-[var(--background)]">
        {user && <MainNavbar user={user} />}
        
        <div className="flex-1 ml-0 flex flex-col min-h-screen bg-[var(--background)]">
          <main className="flex-grow p-6">
            <div className="max-w-4xl mx-auto">
              <Card className="bg-[var(--card)] border-[var(--border)]">
                <CardHeader>
                  <CardTitle className="text-xl text-[var(--foreground)]">
                    Error
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-[var(--muted-foreground)]">{error}</p>
                </CardContent>
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

  if (!user || !community) return null;

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
                <span>Members</span>
              </div>
            </div>
            
            {/* Community Users Header */}
            <Card className="mb-6 bg-[var(--card)] border-[var(--border)]">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-[var(--foreground)]">
                  Members of {community.name}
                </CardTitle>
                <div className="mt-4 space-y-4">
                  {/* Search input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-[var(--muted-foreground)]" />
                    <Input
                      placeholder="Search members by name or bio..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]"
                    />
                  </div>
                  
                  {/* Member count */}
                  <div className="flex justify-end">
                    <div className="text-sm text-[var(--muted-foreground)]">
                      {filteredUsers.length} {filteredUsers.length === 1 ? 'member' : 'members'}
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>
            
            {/* Users Grid */}
            {loadingUsers ? (
              <div className="flex justify-center py-12">
                <div className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent"></div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <Card className="bg-[var(--card)] border-[var(--border)] p-8 text-center">
                <CardContent>
                  <p className="text-[var(--muted-foreground)]">
                    {searchQuery 
                      ? "No members match your search criteria." 
                      : "No members found in this community."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUsers.map((communityUser) => (
                  <UserCard
                    key={communityUser.id}
                    user={communityUser}
                    communityId={communityId}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
        
        <footer className="p-2 text-center text-[var(--muted-foreground)] border-t border-[var(--border)]">
          © 2025 In Construction, Inc. All rights reserved.
        </footer>
      </div>
    </div>
  );
}