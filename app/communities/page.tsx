// app/communities/page.tsx
// this is the page where the user can see the communities they are a part of
// it fetches the user's communities and displays them in a grid
// if the user is not logged in, they are redirected to the login page
// if the user is not verified, they are redirected to the authentication page
// if the user has not joined any communities, they are shown a message to join a community
// if the user has joined communities, they are shown in a grid with the community name, bio, member count, and location
// each community card has a button to view the community
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
import { Users, Eye } from "lucide-react";

export default function CommunitiesPage() {
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
          <h1 className="text-3xl font-bold mb-6 text-[var(--foreground)]">My Communities</h1>
          
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {communities.map((community) => (
                <Card key={community.id} className="bg-[var(--card)] border-[var(--border)]">
                  <CardHeader>
                    <CardTitle className="text-xl text-[var(--foreground)]">
                      {community.name}
                    </CardTitle>
                    <CardDescription className="text-[var(--muted-foreground)]">
                      {community.bio || "No description available"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {community.stats?.memberCount || 0} members
                    </p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {community.location?.city && community.location?.state 
                        ? `${community.location.city}, ${community.location.state}`
                        : "Location not specified"}
                    </p>
                  </CardContent>
                  <CardFooter className="flex gap-2 flex-wrap">
                    <Button asChild>
                      <Link href={`/communities/${community.id}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Community
                      </Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href={`/communities/${community.id}/users`}>
                        <Users className="h-4 w-4 mr-2" />
                        View Members
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}