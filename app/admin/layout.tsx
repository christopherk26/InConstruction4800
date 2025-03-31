// ./app/admin/layout.tsx
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from "@/app/services/authService";
import { AdminNavbar } from "@/components/ui/admin-navbar";
import { Footer } from "@/components/ui/footer";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAdminAccess() {
      try {
        const user = await getCurrentUser();
        
        // Redirect if no user or not an admin
        if (!user || !user.isAdmin) {
          router.push('/dashboard');
          return;
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Admin access check failed:", error);
        router.push('/dashboard');
      }
    }

    checkAdminAccess();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AdminNavbar />
      
      <div className="flex-grow container mx-auto px-4 py-8">
        {children}
      </div>
      
      <Footer />
    </div>
  );
}