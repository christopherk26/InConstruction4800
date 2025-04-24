//app/communities/[id]/users/[userId]/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Calendar, MessageSquare, User } from "lucide-react";
import { getCurrentUser } from "@/app/services/authService";
import { getCommunityById, checkCommunityMembership } from "@/app/services/communityService";
import { getUserProfile, getUserCommunityRole, getUserCommunityPosts } from "@/app/services/userService";
import { getCommunityUserRole } from "@/app/services/communityRoleService"; // Import the community role service
import { UserModel } from "@/app/models/UserModel";
import { MainNavbar } from "@/components/ui/main-navbar";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Post, User as UserType, FirestoreData, CommunityUserRole } from "@/app/types/database";
import { Footer } from "@/components/ui/footer";
import { PostCard } from "@/components/community/post-card";

export default function UserProfilePage() {
  const router = useRouter();
  const params = useParams();
  const communityId = params?.id as string;
  const userId = params?.userId as string;

  // State for user and community data
  const [currentUser, setCurrentUser] = useState<UserModel | null>(null);
  const [community, setCommunity] = useState<any | null>(null);
  const [profileUser, setProfileUser] = useState<UserType | null>(null);
  const [userRole, setUserRole] = useState<CommunityUserRole | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);

  // Loading states
  const [loadingCurrentUser, setLoadingCurrentUser] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check user auth and load data
  useEffect(() => {
    async function loadData() {
      try {
        setLoadingCurrentUser(true);
        // Get currently logged in user
        const loggedInUser = await getCurrentUser();

        if (!loggedInUser) {
          router.push("/auth/login");
          return;
        }

        // Check if user is verified
        const isVerified = await loggedInUser.isVerified();
        if (!isVerified) {
          router.push("/auth/authenticate-person");
          return;
        }

        setCurrentUser(loggedInUser);
        setLoadingCurrentUser(false);

        // Check if user has access to this community
        const hasAccess = await checkCommunityMembership(loggedInUser.id || '', communityId);

        if (!hasAccess) {
          router.push(`/communities/access-denied?community=${communityId}`);
          return;
        }

        // Fetch community details
        const communityData = await getCommunityById(communityId);
        setCommunity(communityData);

        // Load user profile
        setLoadingProfile(true);
        
        // Fetch user profile
        const profile = await getUserProfile(userId);
        setProfileUser(profile);
        
        // Fetch the user's community role using the communityRoleService
        const userCommunityRole = await getCommunityUserRole(communityId, userId);
        console.log("Fetched community role:", userCommunityRole);
        setUserRole(userCommunityRole);
        
        // Fetch user's posts
        const posts = await getUserCommunityPosts(userId, communityId, 3);
        setUserPosts(posts as Post[]);
        
        setLoadingProfile(false);
      } catch (error) {
        console.error("Error loading data:", error);
        setError("Error loading user profile. Please try again.");
        setLoadingCurrentUser(false);
        setLoadingProfile(false);
      }
    }

    if (communityId && userId) {
      loadData();
    }
  }, [communityId, userId, router]);

  // Format date function
  const formatDate = (timestamp: { seconds: number, nanoseconds: number } | undefined) => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
    return date.toLocaleDateString();
  };

  // Loading state
  if (loadingCurrentUser || (loadingProfile && !profileUser)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent"></div>
          <p className="text-[var(--foreground)]">Loading...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && (!community || !profileUser)) {
    return (
      <div className="min-h-screen flex bg-[var(--background)]">
        {currentUser && <MainNavbar user={currentUser} />}

        <div className="flex-1 ml-0 flex flex-col min-h-screen bg-[var(--background)]">
          <main className="flex-grow p-6">
            <div className="max-w-4xl mx-auto">
              <Card className="bg-[var(--card)] border-[var(--border)]">
                <CardHeader>
                  <CardTitle className="text-xl text-[var(--foreground)]">
                    Error
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-[var(--muted-foreground)]">{error}</p>
                </CardContent>
              </Card>
            </div>
          </main>

          <Footer />
        </div>
      </div>
    );
  }

  if (!currentUser || !profileUser || !community) return null;

  return (
    <div className="min-h-screen flex bg-[var(--background)]">
      <MainNavbar user={currentUser} />

      <div className="flex-1 ml-0 flex flex-col min-h-screen bg-[var(--background)]">
        <main className="flex-grow p-6">
          <div className="max-w-4xl mx-auto">
            {/* Back button and navigation */}
            <div className="mb-6">
              <Button variant="outline" onClick={() => router.back()} className="mb-2">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <div className="text-sm text-[var(--muted-foreground)] mb-4">
                <Link href="/dashboard" className="hover:underline">Dashboard</Link>
                {" / "}
                <Link href="/communities" className="hover:underline">Communities</Link>
                {" / "}
                <Link href={`/communities/${communityId}`} className="hover:underline">{community.name}</Link>
                {" / "}
                <Link href={`/communities/${communityId}/users`} className="hover:underline">Members</Link>
                {" / "}
                <span>{profileUser.firstName || ''} {profileUser.lastName || ''}</span>
              </div>
            </div>

            {/* User Profile Header */}
            <Card className="mb-6 bg-[var(--card)] border-[var(--border)]">
              <div className="flex flex-col md:flex-row p-6 gap-6">
                {/* User avatar */}
                <div className="flex-shrink-0">
                  <div className="w-32 h-32 rounded-full overflow-hidden bg-[var(--muted)]">
                    {profileUser.profilePhotoUrl ? (
                      <img
                        src={profileUser.profilePhotoUrl}
                        alt={`${profileUser.firstName || ''} ${profileUser.lastName || ''}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[var(--primary)]">
                        <User className="h-16 w-16 text-[var(--primary-foreground)]" />
                      </div>
                    )}
                  </div>
                </div>

                {/* User info */}
                <div className="flex-grow">
                  <div className="flex flex-col md:flex-row md:items-center gap-2">
                    <h1 className="text-2xl font-bold text-[var(--foreground)]">
                      {profileUser.firstName || ''} {profileUser.lastName || ''}
                    </h1>
                    
                    {/* User Role Badge - styled like in post-card component */}
                    {userRole && (
                      <span 
                        className="px-3 py-1 rounded-full text-sm font-medium inline-flex items-center"
                        style={{
                          backgroundColor: userRole.badge?.color ? `${userRole.badge.color}20` : 'var(--muted)',
                          color: userRole.badge?.color || 'var(--muted-foreground)'
                        }}
                      >
                        {userRole.badge?.emoji && (
                          <span className="mr-1">{userRole.badge.emoji}</span>
                        )}
                        {userRole.title}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 space-y-2">
                    <p className="flex items-center text-sm text-[var(--muted-foreground)]">
                      <Mail className="h-4 w-4 mr-2" />
                      {profileUser.email}
                    </p>
                    <p className="flex items-center text-sm text-[var(--muted-foreground)]">
                      <Calendar className="h-4 w-4 mr-2" />
                      Member since {formatDate(profileUser.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* User Bio */}
            <Card className="mb-6 bg-[var(--card)] border-[var(--border)]">
              <CardHeader>
                <CardTitle className="text-xl text-[var(--foreground)]">
                  About
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[var(--foreground)]">
                  {profileUser.bio || "No bio available"}
                </p>
              </CardContent>
            </Card>

            {/* User's Recent Posts */}
            <Card className="mb-6 bg-[var(--card)] border-[var(--border)]">
              <CardHeader>
                <CardTitle className="text-xl text-[var(--foreground)]">
                  Recent Posts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {userPosts.length === 0 ? (
                  <p className="text-[var(--muted-foreground)]">
                    {profileUser.firstName || 'This user'} hasn't posted anything in this community yet.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {userPosts.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        communityId={communityId}
                        // Since we're not tracking votes here, we'll pass undefined
                        userVote={undefined}
                        // We don't need refresh functionality on this page
                        refreshPosts={undefined}
                      />
                    ))}

                    {userPosts.length > 0 && (
                      <Button variant="outline" asChild className="mt-2">
                        <Link href={`/communities/${communityId}?author=${userId}`}>
                          View All Posts
                        </Link>
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Community Role (if any) */}
            {userRole && (
              <Card className="mb-6 bg-[var(--card)] border-[var(--border)]">
                <CardHeader>
                  <CardTitle className="text-xl text-[var(--foreground)]">
                    Community Role
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center mb-4">
                    {userRole.badge?.emoji && (
                      <div className="mr-3 flex items-center justify-center h-10 w-10 rounded-full"
                        style={{ backgroundColor: userRole.badge?.color ? `${userRole.badge.color}20` : 'var(--muted)' }}>
                        <span className="text-lg" style={{ color: userRole.badge?.color || 'var(--foreground)' }}>
                          {userRole.badge.emoji}
                        </span>
                      </div>
                    )}
                    <div>
                      <h3
                        className="font-medium text-[var(--foreground)]"
                        style={{ color: userRole.badge?.color }}
                      >
                        {userRole.title}
                      </h3>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {userRole.fullName || userRole.title}
                      </p>
                    </div>
                  </div>
                  
                  {/* Role permissions */}
                  {userRole.permissions && (
                    <div className="mt-3 p-3 bg-[var(--muted)] rounded-md">
                      <h4 className="text-sm font-medium mb-2 text-[var(--foreground)]">Permissions:</h4>
                      <ul className="grid grid-cols-2 gap-2 text-xs">
                        {userRole.permissions.canPin && (
                          <li className="flex items-center text-[var(--muted-foreground)]">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Can pin posts
                          </li>
                        )}
                        {userRole.permissions.canArchive && (
                          <li className="flex items-center text-[var(--muted-foreground)]">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Can archive posts
                          </li>
                        )}
                        {userRole.permissions.canPostEmergency && (
                          <li className="flex items-center text-[var(--muted-foreground)]">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Can post emergencies
                          </li>
                        )}
                        {userRole.permissions.canModerate && (
                          <li className="flex items-center text-[var(--muted-foreground)]">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Can moderate
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                  
                  {/* When assigned */}
                  {userRole.assignedAt && (
                    <p className="mt-4 text-xs text-[var(--muted-foreground)]">
                      Role assigned: {formatDate(userRole.assignedAt)}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}