// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, signOut } from "@/app/services/authService";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        const user = await getCurrentUser();
        if (!user) {
          router.push("/auth/login");
        } else {
          setUsername(user.getFullName());
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        router.push("/auth/login");
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [router]);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push("/auth/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">You are logged in!</h1>
        <p className="my-4">Welcome, {username || "User"}</p>
        <div className="space-x-4">
          <Button onClick={handleLogout}>Log Out</Button>
          <Button
            variant="outline"
            onClick={() => router.push("/user/verify-identity")}
          >
            Verify Identity
          </Button>
        </div>
      </div>
    </div>
  );
}