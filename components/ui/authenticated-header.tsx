// components/ui/authenticated-header.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signOut } from "@/app/services/authService";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function AuthenticatedHeader() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut();
      router.push("/auth/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <header className="flex justify-between items-center p-4 bg-[var(--card)] shadow-md">
      <Link href="/" className="flex items-center space-x-2">
        <Image src="/mainlogo.png" alt="Town Hall" width={40} height={40} />
        <span className="text-xl font-bold text-[var(--foreground)]">Town Hall</span>
      </Link>
      <div className="flex items-center space-x-4">
        <ThemeToggle />
        <Button variant="outline" onClick={handleLogout}>
          Log Out
        </Button>
      </div>
    </header>
  );
}