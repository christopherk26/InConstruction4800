"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, signOut } from "@/app/services/authService";
import { UserModel } from "@/app/models/UserModel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { Moon, Sun, LogOut } from "lucide-react";

export default function Homepage() {
  const router = useRouter();
  const [user, setUser] = useState<UserModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [communityIds, setCommunityIds] = useState<string[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    async function fetchUserAndCommunities() {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          console.log("No user found, redirecting to login");
          router.push("/auth/login");
          return;
        }
        setUser(currentUser);

        const isVerified = await currentUser.isVerified();
        if (!isVerified) {
          console.log("User not verified, redirecting to authenticate");
          router.push("/auth/authenticate-person");
          return;
        }

        const communities = await currentUser.getCommunityIds();
        setCommunityIds(communities);

        setLoading(false);
      } catch (error) {
        console.error("Error fetching user:", error);
        router.push("/auth/login");
      }
    }
    fetchUserAndCommunities();

    const isDark = document.documentElement.classList.contains("dark");
    setIsDarkMode(isDark);
  }, [router]);

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

  const handleLogout = async () => {
    try {
      await signOut();
      router.push("/auth/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[var(--card)] shadow-md p-4 flex flex-col space-y-4">
        {/* Changed href from "/" to "/homepage" */}
        <Link href="/homepage" className="flex items-center space-x-2 mb-8">
          <img src="/mainlogo.png" alt="Town Hall" className="w-12 h-12" />
          <span className="text-xl font-bold text-[var(--foreground)]">Town Hall</span>
        </Link>
        <nav className="space-y-2 flex-grow">
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

        {/* Theme Toggle and Logout Buttons */}
        <div className="space-y-2">
          <Button variant="ghost" className="w-full justify-start" onClick={toggleTheme}>
            {isDarkMode ? <Sun className="mr-2 h-5 w-5" /> : <Moon className="mr-2 h-5 w-5" />}
            {isDarkMode ? "Light Mode" : "Dark Mode"}
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-red-600 hover:text-red-600"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-5 w-5 text-red-600" />
            Logout
          </Button>
        </div>
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