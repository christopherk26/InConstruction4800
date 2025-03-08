// app/auth/signup/page.tsx
"use client";

import { SignupForm } from "@/components/signup-form";
import { UnauthenticatedHeader } from "@/components/ui/unauthenticated-header";

export default function SignupPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <UnauthenticatedHeader />
      <div className="flex-grow flex items-center justify-center">
        <SignupForm
          heading="Town Hall"
          subheading="Join your local community today."
          logo={{
            url: "/",
            src: "/mainlogo.png",
            alt: "Town Hall",
          }}
          loginUrl="/auth/login"
        />
      </div>
      <footer className="p-4 text-center text-[var(--muted-foreground)]">
        © 2025 In Construction, Inc. All rights reserved.
      </footer>
    </div>
  );
}