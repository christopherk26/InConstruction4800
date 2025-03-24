// components/ui/footer.tsx
import Link from "next/link";

export function Footer() {
  return (
    <footer className="p-2 text-center text-[var(--muted-foreground)] border-t border-[var(--border)]">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center sm:justify-between">
        <div className="mb-2 sm:mb-0">
          © 2025 In Construction Kurdos, Inc. All rights reserved.
        </div>
        <div className="flex gap-4 text-xs">
          <Link 
            href="/legal?tab=terms" 
            target="_blank" 
            className="hover:underline hover:text-[var(--foreground)]"
          >
            Terms & Conditions
          </Link>
          <Link 
            href="/legal?tab=privacy" 
            target="_blank" 
            className="hover:underline hover:text-[var(--foreground)]"
          >
            Privacy Policy
          </Link>
          <Link 
            href="/legal?tab=cookies" 
            target="_blank" 
            className="hover:underline hover:text-[var(--foreground)]"
          >
            Cookie Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}