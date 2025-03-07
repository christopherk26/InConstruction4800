// app/auth/login/page.tsx
"use client";

import { LoginForm } from "@/components/login-form";
import { UnauthenticatedHeader } from "@/components/ui/unauthenticated-header";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <UnauthenticatedHeader />
      <div className="flex-grow flex items-center justify-center">
        <LoginForm
          heading="Town Hall"
          subheading="Welcome back. Log in to your account."
          logo={{
            url: "/",
            src: "/mainlogo.png",
            alt: "Town Hall",
          }}
          signupUrl="/auth/signup"
        />
      </div>
    </div>
  );
}