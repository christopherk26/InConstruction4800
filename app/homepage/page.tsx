"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/app/services/authService";
import { UserModel } from "@/app/models/UserModel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";

export default function Homepage() {
  const router = useRouter();
  const [user, setUser] = useState<UserModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [communityIds, setCommunityIds] = useState<string[]>([]);

  useEffect(() => {
    async function fetchUserAndCommunities() {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          router.push("/auth/login");
          return;
        }
        setUser(currentUser);

        if (!currentUser.isVerified()) {
          router.push("/auth/authenticate-person");
          return;
        }

        const communities = await currentUser.getCommunityIds();
        setCommunityIds(communities);

        if (communities.length === 0) {
          // User hasn’t joined a community yet
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching user:", error);
        router.push("/auth/login");
      }
    }
    fetchUserAndCommunities();
  }, [router]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  if (!user) return null;

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[var(--card)] shadow-md p-4 flex flex-col space-y-4">
        <Link href="/" className="flex items-center space-x-2 mb-8">
          <img src="/mainlogo.png" alt="Town Hall" className="w-12 h-12" />
          <span className="text-xl font-bold text-[var(--foreground)]">Town Hall</span>
        </Link>
        <nav className="space-y-2">
          <Button variant="ghost" asChild className="w-full justify-start">
            <Link href="/homepage">
              <span className="mr-2">🏠</span> Home
            </Link>
          </Button>
          <Button variant="ghost" asChild className="w-full justify-start">
            <Link href="/search">
              <span className="mr-2">🔍</span> Search
            </Link>
          </Button>
          <Button variant="ghost" asChild className="w-full justify-start">
            <Link href="/create-post">
              <span className="mr-2">➕</span> Create Post
            </Link>
          </Button>
          <Button variant="ghost" asChild className="w-full justify-start">
            <Link href="/notifications">
              <span className="mr-2">🔔</span> Notifications
            </Link>
          </Button>
          <Button variant="ghost" asChild className="w-full justify-start">
            <Link href={`/user/${user.id}`}>
              <span className="mr-2">👤</span> Profile
            </Link>
          </Button>
          <Button variant="ghost" asChild className="w-full justify-start">
            <Link href="/settings">
              <span className="mr-2">⚙️</span> Settings
            </Link>
          </Button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-grow p-6">
        {communityIds.length === 0 ? (
          <Card className="p-6 text-center">
            <h2 className="text-2xl font-bold mb-4">Join a Community</h2>
            <p className="text-[var(--muted-foreground)] mb-6">
              You haven’t joined any communities yet. Apply to join your local community to start participating.
            </p>
            <Button asChild>
              <Link href="/communities/apply">Apply to Join</Link>
            </Button>
          </Card>
        ) : (
          <div>
            <h1 className="text-2xl font-bold mb-6">Your Community Feed</h1>
            <p className="text-[var(--muted-foreground)]">
              (Feed implementation coming soon - posts will be fetched from Firestore here)
            </p>
          </div>
        )}
      </main>
    </div>
  );
}