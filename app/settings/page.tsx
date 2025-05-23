// app/settings/page.tsx (updated version)
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCurrentUser, signOut } from "@/app/services/authService";
import { getUserCommunities, checkCommunityMembership } from "@/app/services/communityService";
import { getNotificationPreferences, updateNotificationPreferences, NotificationPreferences } from "@/app/services/notificationSettingsService";
import { UserModel } from "@/app/models/UserModel";
import { MainNavbar } from "@/components/ui/main-navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { LogOut } from "lucide-react";
import { Footer } from "@/components/ui/footer"; // Import the new Footer component

interface CommunityWithPreferences {
  id: string;
  name: string;
  notifications: NotificationPreferences;
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserModel | null>(null);
  const [communities, setCommunities] = useState<CommunityWithPreferences[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<string>("");
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingCommunities, setLoadingCommunities] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user and initialize communities
  useEffect(() => {
    async function initializeData() {
      try {
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

        // Fetch communities and their notification preferences
        setLoadingCommunities(true);
        const userCommunities = await getUserCommunities(currentUser.id || "");
        const formattedCommunities: CommunityWithPreferences[] = [];

        for (const community of userCommunities) {
          try {
            const notifications = await getNotificationPreferences(currentUser.id || "", community.id);
            formattedCommunities.push({
              id: community.id,
              name: community.name,
              notifications,
            });
          } catch (err) {
            console.error(`Error loading notification preferences for community ${community.id}:`, err);
            // Add community with default preferences if we couldn't load them
            formattedCommunities.push({
              id: community.id,
              name: community.name,
              notifications: {
                emergencyAlerts: true,
                generalDiscussion: true,
                safetyAndCrime: true,
                governance: true,
                disasterAndFire: true,
                businesses: true,
                resourcesAndRecovery: true,
                communityEvents: true,
                pushNotifications: true,
              } as NotificationPreferences
            });
          }
        }

        setCommunities(formattedCommunities);
        if (formattedCommunities.length > 0) {
          setSelectedCommunity(formattedCommunities[0].id);
          setNotificationPrefs(formattedCommunities[0].notifications);
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

  // Handle user logout
  const handleLogout = async () => {
    try {
      await signOut();
      router.push("/auth/login");
    } catch (error) {
      console.error("Error logging out:", error);
      setError("Failed to log out. Please try again.");
    }
  };

  // Handle community selection change
  const handleCommunityChange = (value: string) => {
    setSelectedCommunity(value);
    const selected = communities.find((c) => c.id === value);
    setNotificationPrefs(selected?.notifications || null);
    setSaveSuccess(false);
  };

  // Handle notification preference toggle
  const handleNotificationToggle = (key: keyof NotificationPreferences, checked: boolean) => {
    if (!notificationPrefs) return;
    const updatedPrefs = { ...notificationPrefs, [key]: checked };
    setNotificationPrefs(updatedPrefs);

    // Update the communities state
    setCommunities((prev) =>
      prev.map((c) =>
        c.id === selectedCommunity ? { ...c, notifications: updatedPrefs } : c
      )
    );
    setSaveSuccess(false);
  };

  // Handle saving preferences to Firestore
  const handleSavePreferences = async () => {
    if (!user || !selectedCommunity || !notificationPrefs) {
      setError("Missing user, community, or preferences data.");
      return;
    }

    // Verify community membership before saving
    const hasAccess = await checkCommunityMembership(user.id || "", selectedCommunity);
    if (!hasAccess) {
      setError("You are not a member of this community.");
      return;
    }

    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      await updateNotificationPreferences(user.id || "", selectedCommunity, notificationPrefs);
      setSaveSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to save preferences.");
    } finally {
      setSaving(false);
    }
  };

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

      <div className="flex-1 ml-0 flex flex-col min-h-screen bg-[var(--background)]">
        <main className="flex-1 p-6 bg-[var(--background)]">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-[var(--card)] border-[var(--border)]">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-[var(--foreground)]">
                  Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {error && (
                  <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100 p-4 rounded-md">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-[var(--foreground)]">
                    Account
                  </h3>
                  <p className="text-[var(--muted-foreground)]">
                    Email: {user.email}
                  </p>
                  <p className="text-[var(--muted-foreground)]">
                    Name: {user.firstName} {user.lastName}
                  </p>

                  <Button
                    variant="outline"
                    onClick={handleLogout}
                    className="w-full mt-4"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[var(--foreground)]">
                    Community Settings
                  </h3>
                  {loadingCommunities ? (
                    <Skeleton className="h-9 w-1/2 bg-[var(--muted)]" />
                  ) : communities.length > 0 ? (
                    <>
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

                      {/* Notification Preferences */}
                      {notificationPrefs && (
                        <div className="space-y-4 border-t border-[var(--border)] pt-4">
                          <h4 className="text-md font-semibold text-[var(--foreground)]">
                            Notification Preferences
                          </h4>
                          <p className="text-sm text-[var(--muted-foreground)]">
                            Choose which types of community updates you'd like to receive
                          </p>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <Label
                                htmlFor="emergencyAlerts"
                                className="text-[var(--foreground)]"
                              >
                                Emergency Alerts
                              </Label>
                              <Switch
                                id="emergencyAlerts"
                                checked={notificationPrefs.emergencyAlerts}
                                onCheckedChange={(checked) =>
                                  handleNotificationToggle("emergencyAlerts", checked)
                                }
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label
                                htmlFor="generalDiscussion"
                                className="text-[var(--foreground)]"
                              >
                                General Discussion
                              </Label>
                              <Switch
                                id="generalDiscussion"
                                checked={notificationPrefs.generalDiscussion}
                                onCheckedChange={(checked) =>
                                  handleNotificationToggle("generalDiscussion", checked)
                                }
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label
                                htmlFor="safetyAndCrime"
                                className="text-[var(--foreground)]"
                              >
                                Safety & Crime
                              </Label>
                              <Switch
                                id="safetyAndCrime"
                                checked={notificationPrefs.safetyAndCrime}
                                onCheckedChange={(checked) =>
                                  handleNotificationToggle("safetyAndCrime", checked)
                                }
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label
                                htmlFor="governance"
                                className="text-[var(--foreground)]"
                              >
                                Governance
                              </Label>
                              <Switch
                                id="governance"
                                checked={notificationPrefs.governance}
                                onCheckedChange={(checked) =>
                                  handleNotificationToggle("governance", checked)
                                }
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label
                                htmlFor="disasterAndFire"
                                className="text-[var(--foreground)]"
                              >
                                Disaster & Fire
                              </Label>
                              <Switch
                                id="disasterAndFire"
                                checked={notificationPrefs.disasterAndFire}
                                onCheckedChange={(checked) =>
                                  handleNotificationToggle("disasterAndFire", checked)
                                }
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label
                                htmlFor="businesses"
                                className="text-[var(--foreground)]"
                              >
                                Businesses
                              </Label>
                              <Switch
                                id="businesses"
                                checked={notificationPrefs.businesses}
                                onCheckedChange={(checked) =>
                                  handleNotificationToggle("businesses", checked)
                                }
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label
                                htmlFor="resourcesAndRecovery"
                                className="text-[var(--foreground)]"
                              >
                                Resources & Recovery
                              </Label>
                              <Switch
                                id="resourcesAndRecovery"
                                checked={notificationPrefs.resourcesAndRecovery}
                                onCheckedChange={(checked) =>
                                  handleNotificationToggle("resourcesAndRecovery", checked)
                                }
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label
                                htmlFor="communityEvents"
                                className="text-[var(--foreground)]"
                              >
                                Community Events
                              </Label>
                              <Switch
                                id="communityEvents"
                                checked={notificationPrefs.communityEvents}
                                onCheckedChange={(checked) =>
                                  handleNotificationToggle("communityEvents", checked)
                                }
                              />
                            </div>
                          </div>
                          <div className="border-t border-[var(--border)] pt-4">
                            <h4 className="text-md font-semibold text-[var(--foreground)]">
                              Push Notifications
                            </h4>
                            <p className="text-sm text-[var(--muted-foreground)] mt-1">
                              Receive notifications on your device when important updates occur
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <Switch
                                id="pushNotifications"
                                checked={notificationPrefs.pushNotifications}
                                onCheckedChange={(checked) =>
                                  handleNotificationToggle("pushNotifications", checked)
                                }
                              />
                            </div>
                          </div>
                          {saveSuccess && (
                            <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 p-4 rounded-md">
                              Preferences saved successfully!
                            </div>
                          )}
                          <Button
                            variant="outline"
                            onClick={handleSavePreferences}
                            disabled={saving}
                            className="w-full mt-4"
                          >
                            {saving ? "Saving..." : "Save Preferences"}
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-[var(--muted-foreground)]">
                      You are not a member of any communities yet.{" "}
                      <a
                        href="/communities/browse"
                        className="text-[var(--foreground)] underline"
                      >
                        Browse communities
                      </a>
                    </p>
                  )}
                </div>

                {/* Legal Links Section */}
                <div className="space-y-2 pt-4 border-t border-[var(--border)]">
                  <h3 className="text-lg font-semibold text-[var(--foreground)]">
                    Legal Information
                  </h3>
                  <div className="space-y-2">
                    <Button 
                      variant="link" 
                      asChild 
                      className="text-[var(--foreground)] p-0 h-auto font-normal hover:underline"
                    >
                      <Link href="/legal?tab=terms" target="_blank">
                        Terms & Conditions
                      </Link>
                    </Button>
                    <Button 
                      variant="link" 
                      asChild 
                      className="text-[var(--foreground)] p-0 h-auto font-normal hover:underline block"
                    >
                      <Link href="/legal?tab=privacy" target="_blank">
                        Privacy Policy
                      </Link>
                    </Button>
                    <Button 
                      variant="link" 
                      asChild 
                      className="text-[var(--foreground)] p-0 h-auto font-normal hover:underline block"
                    >
                      <Link href="/legal?tab=cookies" target="_blank">
                        Cookie Policy
                      </Link>
                    </Button>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] mt-2">
                    By using our service, you agree to our Terms & Conditions, Privacy Policy, and Cookie Policy.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        
        {/* Replace the default footer with the new Footer component */}
        <Footer />
      </div>
    </div>
  );
}