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
  const router = useRouter();
  const [user, setUser] = useState<UserModel | null>(null);
  const [communities, setCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
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
  
  if (!user) return null;

  return (
    <div className="min-h-screen flex bg-[var(--background)]">
      <MainNavbar user={user} />
      
      <main className="flex-1 ml-64 p-6 bg-[var(--background)]">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-[var(--foreground)]">Dashboard</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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
                <Button asChild>
                  <Link href="/communities">View All Communities</Link>
                </Button>
              </CardFooter>
            </Card>
            
            <Card className="bg-[var(--card)] border-[var(--border)]">
              <CardHeader>
                <CardTitle className="text-xl text-[var(--foreground)]">
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button asChild className="w-full justify-start">
                  <Link href="/create-post">
                    Create a New Post
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/communities/apply">
                    Join a Community
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/notifications">
                    View Notifications
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
          
          <h2 className="text-2xl font-bold mb-4 text-[var(--foreground)]">Your Communities</h2>
          
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
                <Button asChild>
                  <Link href="/communities/apply">Join a Community</Link>
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {communities.slice(0, 6).map((community) => (
                <Card key={community.id} className="bg-[var(--card)] border-[var(--border)]">
                  <CardHeader>
                    <CardTitle className="text-lg text-[var(--foreground)]">
                      {community.name}
                    </CardTitle>
                  </CardHeader>
                  <CardFooter>
                    <Button size="sm" asChild className="w-full">
                      <Link href={`/communities/${community.id}`}>Visit</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
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
    </div>
  );
}