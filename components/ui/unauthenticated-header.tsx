// components/ui/unauthenticated-header.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function UnauthenticatedHeader() {
  return (
    <header className="flex justify-between items-center p-4 bg-[var(--card)] border-b">
      <Link href="/" className="flex items-center space-x-2">
        <Image src="/mainlogo.png" alt="Town Hall" width={40} height={40} />
        <span className="text-xl font-bold text-[var(--foreground)]">Town Hall</span>
      </Link>
      <div className="flex items-center space-x-4">
        <ThemeToggle />
      </div>
    </header>
  );
}