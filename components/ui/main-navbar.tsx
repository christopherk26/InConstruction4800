"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Home, Search, PlusCircle, Bell, User, Settings, Building, Moon, Sun, LogOut,
  ChevronLeft, ChevronRight, Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/services/authService";
import { getUserCommunities } from "@/app/services/communityService";
import { UserModel } from "@/app/models/UserModel";

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
  const [collapsed, setCollapsed] = useState(false);

  // Check for saved collapse state on component mount
  useEffect(() => {
    const savedCollapsedState = localStorage.getItem('sidebarCollapsed');
    if (savedCollapsedState) {
      setCollapsed(savedCollapsedState === 'true');
    }
  }, []);

  // Save collapse state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', collapsed.toString());
  }, [collapsed]);

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

  // Toggle sidebar collapse state
  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  return (
    <>
      {/* Mobile menu button - only visible on small screens */}
      <div className="fixed top-2 left-2 z-50 md:hidden">
        <Button
          variant="outline"
          size="sm"
          className="rounded-full p-2 shadow-md"
          onClick={toggleCollapse}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Overlay that appears when sidebar is open on mobile */}
      {!collapsed && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={toggleCollapse}
        ></div>
      )}

      {/* Main sidebar */}
      <aside 
        className={`fixed top-0 left-0 h-screen bg-[var(--card)] shadow-md flex flex-col z-50
                   transition-all duration-300 ease-in-out 
                   ${collapsed ? 'w-16' : 'w-64'} 
                   md:translate-x-0
                   ${collapsed ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}`}
      >
        {/* Collapse toggle button */}
        <div className="absolute top-3 right-[-12px] hidden md:block">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleCollapse}
            className="rounded-full h-6 w-6 p-0 shadow-md bg-[var(--card)]"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Logo and user info */}
        <div className={`p-4 ${collapsed ? 'items-center' : ''}`}>
          <Link href="/dashboard" className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-2'} mb-4`}>
            <img 
              src="/mainlogo.png" 
              alt="Town Hall" 
              className={collapsed ? "w-8 h-8" : "w-10 h-10"} 
            />
            {!collapsed && (
              <span className="text-xl font-bold text-[var(--foreground)]">Town Hall</span>
            )}
          </Link>
          {!collapsed && (
            <p className="text-sm text-[var(--muted-foreground)] mb-4">
              Hello, {user.email}
            </p>
          )}
        </div>

        {/* Navigation menu */}
        <nav className={`space-y-2 px-2 ${collapsed ? 'mt-4' : ''}`}>
          {/* Dashboard link */}
          <Button
            variant="ghost"
            asChild
            className={`w-full ${collapsed ? 'justify-center px-2' : 'justify-between'} text-[var(--foreground)] hover:bg-[var(--secondary)] ${pathname === '/dashboard' ? 'bg-[var(--secondary)]' : ''}`}
          >
            <Link href="/dashboard">
              {collapsed ? (
                <Home className="h-5 w-5" />
              ) : (
                <>
                  <span>Dashboard</span>
                  <Home className="h-4 w-4" />
                </>
              )}
            </Link>
          </Button>

          {/* Search link */}
          <Button
            variant="ghost"
            asChild
            className={`w-full ${collapsed ? 'justify-center px-2' : 'justify-between'} text-[var(--foreground)] hover:bg-[var(--secondary)] ${pathname === '/search' ? 'bg-[var(--secondary)]' : ''}`}
          >
            <Link href="/search">
              {collapsed ? (
                <Search className="h-5 w-5" />
              ) : (
                <>
                  <span>Search</span>
                  <Search className="h-4 w-4" />
                </>
              )}
            </Link>
          </Button>

          {/* Create Post link */}
          <Button
            variant="ghost"
            asChild
            className={`w-full ${collapsed ? 'justify-center px-2' : 'justify-between'} text-[var(--foreground)] hover:bg-[var(--secondary)] ${pathname?.includes('/new-post') ? 'bg-[var(--secondary)]' : ''}`}
            disabled={communities.length === 0}
            title={communities.length === 0 ? "Join a community first" : "Create a post"}
          >
            {communities.length > 0 ? (
              <Link href={`/communities/${communities[0].id}/new-post`}>
                {collapsed ? (
                  <PlusCircle className="h-5 w-5" />
                ) : (
                  <>
                    <span>Create Post</span>
                    <PlusCircle className="h-4 w-4" />
                  </>
                )}
              </Link>
            ) : (
              <div className={`flex ${collapsed ? 'justify-center' : 'justify-between'} w-full`}>
                {collapsed ? (
                  <PlusCircle className="h-5 w-5 opacity-50" />
                ) : (
                  <>
                    <span>Create Post</span>
                    <PlusCircle className="h-4 w-4" />
                  </>
                )}
              </div>
            )}
          </Button>

          {/* Notifications link */}
          <Button
            variant="ghost"
            asChild
            className={`w-full ${collapsed ? 'justify-center px-2' : 'justify-between'} text-[var(--foreground)] hover:bg-[var(--secondary)] ${pathname === '/notifications' ? 'bg-[var(--secondary)]' : ''}`}
          >
            <Link href="/notifications">
              {collapsed ? (
                <Bell className="h-5 w-5" />
              ) : (
                <>
                  <span>Notifications</span>
                  <Bell className="h-4 w-4" />
                </>
              )}
            </Link>
          </Button>

          {/* Profile link */}
          <Button
            variant="ghost"
            asChild
            className={`w-full ${collapsed ? 'justify-center px-2' : 'justify-between'} text-[var(--foreground)] hover:bg-[var(--secondary)] ${pathname === '/myprofile' ? 'bg-[var(--secondary)]' : ''}`}
          >
            <Link href="/myprofile">
              {collapsed ? (
                <User className="h-5 w-5" />
              ) : (
                <>
                  <span>My Profile</span>
                  <User className="h-4 w-4" />
                </>
              )}
            </Link>
          </Button>

          {/* Settings link */}
          <Button
            variant="ghost"
            asChild
            className={`w-full ${collapsed ? 'justify-center px-2' : 'justify-between'} text-[var(--foreground)] hover:bg-[var(--secondary)] ${pathname === '/settings' ? 'bg-[var(--secondary)]' : ''}`}
          >
            <Link href="/settings">
              {collapsed ? (
                <Settings className="h-5 w-5" />
              ) : (
                <>
                  <span>Settings</span>
                  <Settings className="h-4 w-4" />
                </>
              )}
            </Link>
          </Button>
        </nav>

        {/* Communities section */}
        {!collapsed && (
          <div className="space-y-2 pt-4 px-4 mt-4 border-t border-[var(--border)]">
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
              <Link href="/communities/browse">
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
                    className={`w-full justify-start text-[var(--foreground)] hover:bg-[var(--secondary)] ${pathname === `/communities/${community.id}` ? 'bg-[var(--secondary)]' : ''}`}
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
              className={`w-full justify-between text-[var(--foreground)] hover:bg-[var(--secondary)] ${pathname === '/communities' ? 'bg-[var(--secondary)]' : ''}`}
            >
              <Link href="/communities">
                <span>All Communities</span>
                <Building className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}

        {/* Collapsed communities icon */}
        {collapsed && (
          <div className="flex flex-col items-center pt-4 mt-4 border-t border-[var(--border)]">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className={`w-full justify-center text-[var(--foreground)] hover:bg-[var(--secondary)] ${pathname === '/communities' ? 'bg-[var(--secondary)]' : ''}`}
            >
              <Link href="/communities">
                <Building className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        )}

        {/* Theme toggle and logout */}
        <div className={`space-y-2 mt-auto mb-4 ${collapsed ? 'px-2' : 'px-4'}`}>
          {/* Theme toggle button */}
          <Button 
            variant="ghost" 
            onClick={toggleTheme} 
            className={`w-full ${collapsed ? 'justify-center p-2' : 'justify-between'} text-[var(--foreground)] hover:bg-[var(--secondary)]`}
          >
            {collapsed ? (
              isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />
            ) : (
              <>
                <span>{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </>
            )}
          </Button>

          {/* Logout button */}
          <Button 
            variant="ghost" 
            onClick={handleLogout} 
            className={`w-full ${collapsed ? 'justify-center p-2' : 'justify-between'} text-[var(--foreground)] hover:bg-[var(--secondary)]`}
          >
            {collapsed ? (
              <LogOut className="h-5 w-5" />
            ) : (
              <>
                <span>Logout</span>
                <LogOut className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </aside>
    </>
  );
}