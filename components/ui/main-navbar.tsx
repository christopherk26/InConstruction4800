"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Search, PlusCircle, Bell, User, Settings, Moon, Sun, LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/services/authService";
import { getUserCommunities } from "@/app/services/communityService";
import { UserModel } from "@/app/models/UserModel";
import { useUnreadNotifications } from "@/app/hooks/useUnreadNotifications"; // ✅ Import real-time hook

interface MainNavbarProps {
  user: UserModel;
}

export function MainNavbar({ user }: MainNavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [communities, setCommunities] = useState<{ id: string, name: string }[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoadingCommunities, setIsLoadingCommunities] = useState(true);
  
  // ✅ Use real-time notifications hook
  const { hasUnread, markNotificationsAsRead } = useUnreadNotifications(user?.id);

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
        {/* ✅ Notifications tab with a  badge */}
        <Button
          variant="ghost"
          asChild
          className={`w-full justify-between ${
            pathname === "/notifications" ? "bg-gray-200 dark:bg-gray-700" : ""
          } hover:bg-gray-300 dark:hover:bg-gray-600`}
          onClick={markNotificationsAsRead} // ✅ Marks notifications as read
        >
          <Link href="/notifications">
            <div className="flex items-center justify-between w-full">
              <span className="text-[var(--foreground)]">Notifications</span>
              <div className="relative">
                {hasUnread && (
                  <span className="">
                    1
                  </span>
                )}
                <Bell className="h-5 w-5 text-[var(--foreground)]" />
              </div>
            </div>
          </Link>
        </Button>
      </nav>

      {/* Theme toggle and logout */}
      <div className="space-y-2 mt-auto">
        <Button variant="ghost" onClick={toggleTheme} className="w-full justify-between hover:bg-gray-300 dark:hover:bg-gray-600">
          <span>{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
          {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" onClick={handleLogout} className="w-full justify-between hover:bg-gray-300 dark:hover:bg-gray-600">
          <span>Logout</span>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </aside>
  );
}
