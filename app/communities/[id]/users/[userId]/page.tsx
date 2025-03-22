"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Calendar, MessageSquare, User } from "lucide-react";
import { getCurrentUser } from "@/app/services/authService";
import { getCommunityById, checkCommunityMembership } from "@/app/services/communityService";
import { getUserProfile, getUserCommunityRole, getUserCommunityPosts } from "@/app/services/userService";
import { UserModel } from "@/app/models/UserModel";
import { MainNavbar } from "@/components/ui/main-navbar";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Post, User as UserType, FirestoreData } from "@/app/types/database";
import { Footer } from "@/components/ui/footer";

export default function UserProfilePage() {
  const router = useRouter();
  const params = useParams();
  const communityId = params?.id as string;
  const userId = params?.userId as string;
  
  // State for user and community data
  const [currentUser, setCurrentUser] = useState<UserModel | null>(null);
  const [community, setCommunity] = useState<any | null>(null);
  const [profileUser, setProfileUser] = useState<UserType | null>(null);
  const [userRole, setUserRole] = useState<any | null>(null);
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
        
        // Redirect if viewing self
        if (loggedInUser.id === userId) {
          router.push("/myprofile");
          return;
        }
        
        // Fetch community details
        const communityData = await getCommunityById(communityId);
        setCommunity(communityData);
        
        // Load user profile
        setLoadingProfile(true);
        const [profile, role, posts] = await Promise.all([
          getUserProfile(userId),
          getUserCommunityRole(userId, communityId),
          getUserCommunityPosts(userId, communityId, 3)
        ]);
        
        setProfileUser(profile);
        setUserRole(role);
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
          
          <footer className="p-2 text-center text-[var(--muted-foreground)] border-t border-[var(--border)]">
            © 2025 In Construction, Inc. All rights reserved.
          </footer>
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
                  <h1 className="text-2xl font-bold text-[var(--foreground)]">
                    {profileUser.firstName || ''} {profileUser.lastName || ''}
                  </h1>
                  
                  {userRole && userRole.roleDetails && (
                    <div className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--muted)] text-[var(--muted-foreground)]">
                      {userRole.roleDetails.title}
                    </div>
                  )}
                  
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
                      <div key={post.id} className="border-b border-[var(--border)] pb-4 last:border-0 last:pb-0">
                        <Link 
                          href={`/communities/${communityId}/posts/${post.id}`}
                          className="block hover:underline"
                        >
                          <h3 className="font-medium text-[var(--foreground)]">{post.title}</h3>
                        </Link>
                        <p className="text-sm text-[var(--muted-foreground)] mt-1">
                          {formatDate(post.createdAt)}
                        </p>
                        <p className="text-sm text-[var(--foreground)] mt-2 line-clamp-2">
                          {post.content}
                        </p>
                      </div>
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
            {userRole && userRole.roleDetails && (
              <Card className="mb-6 bg-[var(--card)] border-[var(--border)]">
                <CardHeader>
                  <CardTitle className="text-xl text-[var(--foreground)]">
                    Community Role
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center mb-4">
                    {userRole.roleDetails.badge && userRole.roleDetails.badge.iconUrl ? (
                      <img 
                        src={userRole.roleDetails.badge.iconUrl} 
                        alt={userRole.roleDetails.title} 
                        className="w-8 h-8 mr-3"
                      />
                    ) : (
                      <div 
                        className="w-8 h-8 mr-3 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: userRole.roleDetails.badge?.color || '#666' }}
                      >
                        <span className="text-white text-xs font-bold">
                          {userRole.roleDetails.title.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div>
                      <h3 className="font-medium text-[var(--foreground)]">
                        {userRole.roleDetails.title}
                      </h3>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {userRole.roleDetails.displayName || userRole.roleDetails.title}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-[var(--foreground)]">
                    This member has special responsibilities in the community.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
        
        {/* Replace the default footer with the new Footer component */}
        <Footer />
      </div>
    </div>
  );
}