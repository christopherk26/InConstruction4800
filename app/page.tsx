// app/page.tsx
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-4">Welcome to Our Social Platform</h1>
      <p className="text-lg mb-8">Connect with your community like never before.</p>
      <div className="space-x-4">
        <Link href="/auth/signup">
          <button className="bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 rounded">
            Sign Up
          </button>
        </Link>
        <Link href="/auth/login">
          <button className="border-[var(--border)] text-[var(--foreground)] px-4 py-2 rounded">
            Log In
          </button>
        </Link>
      </div>
    </div>
  );
}