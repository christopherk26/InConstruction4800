"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/app/services/authService";
import { getUserCommunities } from "@/app/services/communityService";
import { UserModel } from "@/app/models/UserModel";
import { MainNavbar } from "@/components/ui/main-navbar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  // Initialize router for navigation
  const router = useRouter();
  
  // State management for user data, communities, and loading status
  const [user, setUser] = useState<UserModel | null>(null);
  const [communities, setCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Effect to fetch user data and communities on component mount
  useEffect(() => {
    async function fetchData() {
      try {
        // Check if user is authenticated
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
        
        // Set user in state
        setUser(currentUser);
        
        // Fetch user's communities
        const userCommunities = await getUserCommunities(currentUser.id || '');
        setCommunities(userCommunities);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [router]);

  // Show loading spinner while data is being fetched
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent"></div>
          <p className="text-[var(--foreground)]">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Return null if no user is found
  if (!user) return null;

  return (
    <div className="min-h-screen flex bg-[var(--background)]">
      {/* Main navigation sidebar */}
      <MainNavbar user={user} />
      
      {/* Main content wrapper - this div is important for the footer layout
          - flex-col allows stacking main content and footer
          - min-h-screen ensures the container is at least full height
          - flex-1 and ml-04 make it take up the remaining space next to sidebar */}
      <div className="flex-1 ml-0 flex flex-col min-h-screen bg-[var(--background)]">
        {/* Main content area 
            - flex-grow pushes the footer to the bottom by expanding to fill available space */}
        <main className="flex-grow p-6">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-[var(--foreground)]">Dashboard</h1>
            
            {/* Welcome and Quick Actions cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Welcome card */}
              <Card className="bg-[var(--card)] border-[var(--border)]">
                <CardHeader>
                  <CardTitle className="text-xl text-[var(--foreground)]">
                    Welcome, {user.firstName || user.email}
                  </CardTitle>
                  <CardDescription className="text-[var(--muted-foreground)]">
                    Your community dashboard
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-[var(--foreground)]">
                    You are a member of {communities.length} {communities.length === 1 ? 'community' : 'communities'}.
                  </p>
                </CardContent>
                <CardFooter>
                  {/* Using variant="outline" for consistent styling */}
                  <Button variant="outline" asChild>
                    <Link href="/communities">View All Communities</Link>
                  </Button>
                </CardFooter>
              </Card>
              
              {/* Quick Actions card */}
              <Card className="bg-[var(--card)] border-[var(--border)]">
                <CardHeader>
                  <CardTitle className="text-xl text-[var(--foreground)]">
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* All buttons use variant="outline" for consistency */}
                  <Button variant="outline" asChild className="w-full justify-start">
                    <Link href="/create-post">
                      Create a New Post
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="w-full justify-start">
                    <Link href="/communities/apply">
                      Join a Community
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="w-full justify-start">
                    <Link href="/notifications">
                      View Notifications
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
            
            <h2 className="text-2xl font-bold mb-4 text-[var(--foreground)]">Your Communities</h2>
            
            {/* Communities list or empty state */}
            {communities.length === 0 ? (
              <Card className="bg-[var(--card)] border-[var(--border)]">
                <CardHeader>
                  <CardTitle className="text-xl text-[var(--foreground)]">
                    You haven't joined any communities yet
                  </CardTitle>
                  <CardDescription className="text-[var(--muted-foreground)]">
                    Join a community to start participating and seeing posts.
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button variant="outline" asChild>
                    <Link href="/communities/apply">Join a Community</Link>
                  </Button>
                </CardFooter>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {/* Display up to 6 community cards */}
                {communities.slice(0, 6).map((community) => (
                  <Card key={community.id} className="bg-[var(--card)] border-[var(--border)]">
                    <CardHeader>
                      <CardTitle className="text-lg text-[var(--foreground)]">
                        {community.name}
                      </CardTitle>
                    </CardHeader>
                    <CardFooter>
                      <Button variant="outline" size="sm" asChild className="w-full">
                        <Link href={`/communities/${community.id}`}>Visit</Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
                
                {/* Show "View all" card if more than 6 communities */}
                {communities.length > 6 && (
                  <Card className="bg-[var(--card)] border-[var(--border)] flex items-center justify-center">
                    <CardContent className="p-6">
                      <Link href="/communities" className="text-[var(--foreground)] hover:underline">
                        View all {communities.length} communities...
                      </Link>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </main>
        
        {/* Footer
            - positioned at the bottom because of the flex-col and flex-grow above
            - border-t adds a subtle separator line 
            - p-2 keeps it compact
            - text-center centers the copyright text */}
        <footer className="p-2 text-center text-[var(--muted-foreground)] border-t border-[var(--border)]">
          © 2025 In Construction, Inc. All rights reserved.
        </footer>
      </div>
    </div>
  );
}