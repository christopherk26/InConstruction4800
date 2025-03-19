"use client";

import { useEffect, useState } from "react"; // Added useState for loading
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { UnauthenticatedHeader } from "@/components/ui/unauthenticated-header";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/app/services/authService";

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true); // Added loading state

  useEffect(() => {
    async function checkAuth() {
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          // Change this line from homepage to dashboard
          router.push("/dashboard");
        }
      } catch (error) {
        console.error("Error checking auth:", error);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen flex flex-col">
      <UnauthenticatedHeader />
      <main className="flex-grow flex flex-col items-center justify-center px-4 py-12">
        <Image src="/mainlogo.png" alt="Town Hall Logo" width={120} height={120} className="mb-8" />
        <h1 className="text-4xl font-bold text-[var(--foreground)] mb-4">Welcome to Town Hall</h1>
        <p className="text-lg text-[var(--muted-foreground)] max-w-2xl text-center mb-8">
          Town Hall is a secure, verified platform connecting local communities with their governments.
          Share resources, discuss civic issues, and receive emergency alerts directly from verified officials.
          Join your community today and be part of a trusted digital town square.
        </p>
        <div className="flex space-x-4">
          <Button variant="outline" asChild>
            <Link href="/auth/login">Log In</Link>
          </Button>
          <Button variant="outline" asChild>
            
            <Link href="/auth/signup">Sign Up</Link>
          </Button>
        </div>
      </main>
      <footer className="p-4 text-center text-[var(--muted-foreground)]">
        © 2025 In Construction, Inc. All rights reserved.
      </footer>
    </div>
  );
}