"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/app/services/authService";
import { getCommunityById } from "@/app/services/communityService";
import { UserModel } from "@/app/models/UserModel";
import { MainNavbar } from "@/components/ui/main-navbar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Create a client component that uses the search params
function AccessDeniedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const communityId = searchParams.get('community');
  
  const [user, setUser] = useState<UserModel | null>(null);
  const [community, setCommunity] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          router.push("/auth/login");
          return;
        }
        
        setUser(currentUser);
        
        if (communityId) {
          const communityData = await getCommunityById(communityId);
          setCommunity(communityData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [communityId, router]);

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
      
      <main className="flex-1 ml-0 p-6 bg-[var(--background)]">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-[var(--card)] border-[var(--border)]">
            <CardHeader>
              <CardTitle className="text-xl text-[var(--foreground)]">
                Access Denied
              </CardTitle>
              <CardDescription className="text-[var(--muted-foreground)]">
                {community 
                  ? `You don't have access to ${community.name}.` 
                  : "You don't have access to this community."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-[var(--foreground)] mb-4">
                To access this community, you need to be a verified member. Would you like to apply for membership?
              </p>
            </CardContent>
            <CardFooter className="flex gap-4">
              <Button asChild>
                <Link href="/communities">View Your Communities</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={communityId 
                  ? `/communities/apply?community=${communityId}` 
                  : "/communities/apply"
                }>
                  Apply to Join
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
}

// Main page component that wraps the content in a Suspense boundary
export default function AccessDeniedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent"></div>
          <p className="text-[var(--foreground)]">Loading...</p>
        </div>
      </div>
    }>
      <AccessDeniedContent />
    </Suspense>
  );
}