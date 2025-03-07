// components/signup-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FcGoogle } from "react-icons/fc";
import { Loader2 } from "lucide-react";
import { signUpWithEmail, signInWithGoogle } from "@/app/services/authService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme/theme-toggle";

interface SignupFormProps {
  heading?: string;
  subheading?: string;
  logo: {
    url: string;
    src: string;
    alt: string;
  };
  signupText?: string;
  googleText?: string;
  loginText?: string;
  loginUrl?: string;
}

export function SignupForm({
  heading = "Create an Account",
  subheading = "Sign up to get started.",
  logo = {
    url: "/",
    src: "/mainlogo.png",
    alt: "logo",
  },
  googleText = "Sign up with Google",
  signupText = "Create account",
  loginText = "Already have an account?",
  loginUrl = "/auth/login",
}: SignupFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      await signUpWithEmail(email, password, {
        firstName: "",
        lastName: "",
        phoneNumber: "",
        birthDate: new Date(),
      });
      setSuccess(true);
    } catch (error: any) {
      setError(error.message || "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSignup() {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await signInWithGoogle();
      router.push("/dashboard");
    } catch (error: any) {
      setError(error.message || "Failed to sign up with Google");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="min-h-screen flex items-center justify-center py-32 w-full">
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md px-4">
        <div className="rounded-lg p-6 shadow-lg bg-[var(--card)] text-[var(--card-foreground)]">
          <div className="mb-6 flex flex-col items-center">
            <a href={logo.url}>
              <img src={logo.src} alt={logo.alt} className="mb-7 h-10 w-auto" />
            </a>
            <h1 className="mb-2 text-2xl font-bold">{heading}</h1>
            <p className="text-[var(--muted-foreground)]">{subheading}</p>
          </div>
          <form onSubmit={handleSignup}>
            <div className="grid gap-4">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
                className="bg-[var(--card)] border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
              />
              <Input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                className="bg-[var(--card)] border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
              />
              <Input
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                required
                className="bg-[var(--card)] border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
              />
              {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
              {success && (
                <p className="text-sm text-[var(--foreground)]">
                  Account created! Please check your email to verify it, then log in{" "}
                  <a href={loginUrl} className="underline">
                    here
                  </a>.
                </p>
              )}
              <Button
                type="submit"
                className="mt-2 w-full bg-[var(--background)] text-[var(--foreground)] border-[var(--border)] hover:bg-[oklch(0.9_0_0)] dark:hover:bg-[oklch(0.3_0_0)]"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {signupText}
              </Button>
              <Button
                variant="outline"
                className="w-full border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--secondary)]"
                onClick={handleGoogleSignup}
                disabled={isLoading}
                type="button"
              >
                <FcGoogle className="mr-2 size-5" />
                {googleText}
              </Button>
            </div>
          </form>
          <div className="mt-8 flex justify-center gap-1 text-sm text-[var(--muted-foreground)]">
            <p>{loginText}</p>
            <a href={loginUrl} className="font-medium text-[var(--foreground)] hover:underline">
              Log in
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}