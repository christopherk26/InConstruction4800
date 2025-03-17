// app/settings/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/app/services/authService";
import { getUserCommunities } from "@/app/services/communityService";
import { UserModel } from "@/app/models/UserModel";
import { MainNavbar } from "@/components/ui/main-navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserModel | null>(null);
  const [communities, setCommunities] = useState<{ id: string; name: string }[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<string>("");
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingCommunities, setLoadingCommunities] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user and communities on mount
  useEffect(() => {
    async function initializeData() {
      try {
        // Authenticate user
        setLoadingUser(true);
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
        setLoadingUser(false);

        // Fetch user's communities
        setLoadingCommunities(true);
        const userCommunities = await getUserCommunities(currentUser.id || "");
        const formattedCommunities = userCommunities.map((community: any) => ({
          id: community.id,
          name: community.name,
        }));
        setCommunities(formattedCommunities);
        if (formattedCommunities.length > 0) {
          setSelectedCommunity(formattedCommunities[0].id); // Default to first community
        }
        setLoadingCommunities(false);
      } catch (err) {
        console.error("Error initializing settings:", err);
        setError("Failed to load settings. Please try again.");
        setLoadingUser(false);
        setLoadingCommunities(false);
      }
    }

    initializeData();
  }, [router]);

  // Handle community selection change
  const handleCommunityChange = (value: string) => {
    setSelectedCommunity(value);
    // Here you could add logic to load community-specific settings if needed
  };

  // Loading state
  if (loadingUser) {
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

      <main className="flex-1 ml-6 p-6 bg-[var(--background)]">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-[var(--card)] border-[var(--border)]">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-[var(--foreground)]">
                Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Error Display */}
              {error && (
                <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100 p-4 rounded-md">
                  {error}
                </div>
              )}

              {/* User Info */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-[var(--foreground)]">Account</h3>
                <p className="text-[var(--muted-foreground)]">
                  Email: {user.email}
                </p>
                <p className="text-[var(--muted-foreground)]">
                  Name: {user.firstName} {user.lastName}
                </p>
              </div>

              {/* Community Selection */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-[var(--foreground)]">Community Settings</h3>
                {loadingCommunities ? (
                  <Skeleton className="h-9 w-1/2 bg-[var(--muted)]" />
                ) : communities.length > 0 ? (
                  <Select
                    value={selectedCommunity}
                    onValueChange={handleCommunityChange}
                  >
                    <SelectTrigger className="w-1/2 bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]">
                      <SelectValue placeholder="Select a community" />
                    </SelectTrigger>
                    <SelectContent className="bg-[var(--card)] border-[var(--border)]">
                      {communities.map((community) => (
                        <SelectItem
                          key={community.id}
                          value={community.id}
                          className="text-[var(--foreground)] hover:bg-[var(--secondary)]"
                        >
                          {community.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-[var(--muted-foreground)]">
                    You are not a member of any communities yet.{" "}
                    <a href="/communities/browse" className="text-[var(--foreground)] underline">
                      Browse communities
                    </a>
                  </p>
                )}
              </div>

              {/* Placeholder for Additional Settings */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-[var(--foreground)]">Preferences</h3>
                <p className="text-[var(--muted-foreground)]">
                  Additional settings can be added here (e.g., notifications, theme).
                </p>
                {/* Example Button - Replace with actual settings */}
                <Button variant="outline">Save Preferences</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}