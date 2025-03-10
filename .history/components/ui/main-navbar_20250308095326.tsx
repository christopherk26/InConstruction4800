"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Home, Search, PlusCircle, Bell, User, Settings, Building, Moon, Sun, LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/services/authService";
import { getUserCommunities } from "@/app/services/communityService";
import { UserModel } from "@/app/models/UserModel";
import { getUnreadNotificationCount } from "@/app/services/notificationService"; // Add this import

interface MainNavbarProps {
  user: UserModel;
  activePath?: string;
}

export function MainNavbar({ user }: MainNavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [communities, setCommunities] = useState<{ id: string, name: string }[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoadingCommunities, setIsLoadingCommunities] = useState(true);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Fetch user's communities
  useEffect(() => {
    async function fetchCommunities() {
      try {
        if (!user || !user.id) return;

        setIsLoadingCommunities(true);
        const userCommunities = await getUserCommunities(user.id);

        const formattedCommunities = userCommunities.map((community: any) => ({
          id: community.id,
          name: community.name
        }));

        setCommunities(formattedCommunities);
      } catch (error) {
        console.error("Error fetching communities:", error);
      } finally {
        setIsLoadingCommunities(false);
      }
    }

    fetchCommunities();

    // Initialize theme state
    const isDark = document.documentElement.classList.contains("dark");
    setIsDarkMode(isDark);
  }, [user]);

  useEffect(() => {
    async function fetchData() {
      try {
        if (!user || !user.id) return;
  
        setIsLoadingCommunities(true);
        const userCommunities = await getUserCommunities(user.id);
        const formattedCommunities = userCommunities.map((community: any) => ({
          id: community.id,
          name: community.name,
        }));
        setCommunities(formattedCommunities);
  
        // Fetch unread notification count
        const count = await getUnreadNotificationCount(user.id);
        setUnreadCount(count);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoadingCommunities(false);
      }
    }
    fetchData();
  
    const isDark = document.documentElement.classList.contains("dark");
    setIsDarkMode(isDark);
  }, [user]);

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

  return (
    <aside className="fixed top-0 left-0 h-screen w-64 bg-[var(--card)] shadow-md p-4 flex flex-col space-y-4">
      {/* Logo and user info */}
      <div>
        <Link href="/dashboard" className="flex items-center space-x-2 mb-4">
          <img src="/mainlogo.png" alt="Town Hall" className="w-12 h-12" />
          <span className="text-xl font-bold text-[var(--foreground)]">Town Hall</span>
        </Link>
        <p className="text-sm text-[var(--muted-foreground)] mb-4">
          Hello, {user.email}
        </p>
      </div>

      {/* Navigation menu */}
      <nav className="space-y-2">
        {/* Dashboard link */}
        <Button
          variant="ghost"
          asChild
          className={`w-full justify-between text-[var(--foreground)] hover:bg-[var(--secondary)] ${
            pathname === "/notifications" ? "bg-[var(--secondary)]" : ""
            }`}
          >
          <Link href="/notifications">
            <span>Notifications</span>
            <div className="flex items-center">
              {unreadCount > 0 && (
                <span className="mr-2 text-xs bg-[var(--primary)] text-white rounded-full px-2 py-1">
              {unreadCount}
            </span>
          )}
          <Bell className="h-4 w-4" />
        </div>
        </Link>
        </Button>
        {/* Search link */}
        <Button
          variant="ghost"
          asChild
          className={`w-full justify-between text-[var(--foreground)] hover:bg-[var(--secondary)] ${pathname === '/search' ? 'bg-[var(--secondary)]' : ''
            }`}
        >
          <Link href="/search">
            <span>Search</span>
            <Search className="h-4 w-4" />
          </Link>
        </Button>

        {/* Create Post link */}
        <Button
          variant="ghost"
          asChild
          className={`w-full justify-between text-[var(--foreground)] hover:bg-[var(--secondary)] ${pathname?.includes('/new-post') ? 'bg-[var(--secondary)]' : ''
            }`}
          disabled={communities.length === 0}
          title={communities.length === 0 ? "Join a community first" : "Create a post"}
        >
          {communities.length > 0 ? (
            <Link href={`/communities/${communities[0].id}/new-post`}>
              <span>Create Post</span>
              <PlusCircle className="h-4 w-4" />
            </Link>
          ) : (
            <div className="flex justify-between w-full">
              <span>Create Post</span>
              <PlusCircle className="h-4 w-4" />
            </div>
          )}
        </Button>

        {/* Notifications link */}
        <Button
          variant="ghost"
          asChild
          className={`w-full justify-between text-[var(--foreground)] hover:bg-[var(--secondary)] ${pathname === '/notifications' ? 'bg-[var(--secondary)]' : ''
            }`}
        >
          <Link href="/notifications">
            <span>Notifications</span>
            <Bell className="h-4 w-4" />
          </Link>
        </Button>

        {/* Profile link */}
        <Button
          variant="ghost"
          asChild
          className={`w-full justify-between text-[var(--foreground)] hover:bg-[var(--secondary)] ${pathname === `/user/${user.id}` ? 'bg-[var(--secondary)]' : ''
            }`}
        >
          <Link href={`/user/${user.id}`}>
            <span>Profile</span>
            <User className="h-4 w-4" />
          </Link>
        </Button>

        {/* Settings link */}
        <Button
          variant="ghost"
          asChild
          className={`w-full justify-between text-[var(--foreground)] hover:bg-[var(--secondary)] ${pathname === '/settings' ? 'bg-[var(--secondary)]' : ''
            }`}
        >
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

        {/* Add Community button */}
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

        {/* Community links */}
        <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
          {isLoadingCommunities ? (
            <p className="text-xs text-[var(--muted-foreground)] text-center py-2">Loading...</p>
          ) : communities.length > 0 ? (
            communities.map(community => (
              <Button
                key={community.id}
                variant="ghost"
                size="sm"
                asChild
                className={`w-full justify-start text-[var(--foreground)] hover:bg-[var(--secondary)] ${pathname === `/communities/${community.id}` ? 'bg-[var(--secondary)]' : ''
                  }`}
              >
                <Link href={`/communities/${community.id}`} className="truncate">
                  {community.name}
                </Link>
              </Button>
            ))
          ) : (
            <p className="text-xs text-[var(--muted-foreground)] text-center py-2">
              No communities joined
            </p>
          )}
        </div>

        {/* View All Communities link */}
        <Button
          variant="ghost"
          size="sm"
          asChild
          className={`w-full justify-between text-[var(--foreground)] hover:bg-[var(--secondary)] ${pathname === '/communities' ? 'bg-[var(--secondary)]' : ''
            }`}
        >
          <Link href="/communities">
            <span>All Communities</span>
            <Building className="h-4 w-4" />
          </Link>
        </Button>
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
  );
}