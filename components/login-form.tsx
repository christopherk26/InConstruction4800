// components/login-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FcGoogle } from "react-icons/fc";
import { Loader2 } from "lucide-react";
import { signInWithEmail, signInWithGoogle, resetPassword } from "@/app/services/authService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme/theme-toggle";

interface LoginFormProps {
  heading?: string;
  subheading?: string;
  logo: {
    url: string;
    src: string;
    alt: string;
  };
  loginText?: string;
  googleText?: string;
  signupText?: string;
  signupUrl?: string;
}

export function LoginForm({
  heading = "Welcome Back",
  subheading = "Log in to your account.",
  logo = {
    url: "/",
    src: "/mainlogo.png",
    alt: "logo",
  },
  googleText = "Sign in with Google",
  loginText = "Sign in",
  signupText = "Don't have an account?",
  signupUrl = "/auth/signup",
}: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResetSent(false);

    try {
      await signInWithEmail(email, password);
      router.push("/dashboard");
    } catch (error: any) {
      setError(error.message || "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setIsLoading(true);
    setError(null);
    setResetSent(false);

    try {
      await signInWithGoogle();
      router.push("/dashboard");
    } catch (error: any) {
      setError(error.message || "Failed to sign in with Google");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      setError("Please enter your email first.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setResetSent(false);

    try {
      await resetPassword(email);
      setResetSent(true);
    } catch (error: any) {
      setError(error.message || "Failed to send password reset email");
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
          <form onSubmit={handleLogin}>
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
              {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
              {resetSent && (
                <p className="text-sm text-[var(--foreground)]">
                  Password reset email sent! Check your inbox.
                </p>
              )}
              <Button
                type="submit"
                className="mt-2 w-full bg-[var(--background)] text-[var(--foreground)] border-[var(--border)] hover:bg-[oklch(0.9_0_0)] dark:hover:bg-[oklch(0.3_0_0)]"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {loginText}
              </Button>
              <Button
                variant="outline"
                className="w-full border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--secondary)]"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                type="button"
              >
                <FcGoogle className="mr-2 size-5" />
                {googleText}
              </Button>
            </div>
          </form>
          <div className="mt-4 flex justify-start text-sm text-[var(--muted-foreground)]">
            <button
              onClick={handleForgotPassword}
              className="hover:underline text-[var(--foreground)]"
              disabled={isLoading}
            >
              Forgot Password?
            </button>
          </div>
          <div className="mt-4 flex justify-center gap-1 text-sm text-[var(--muted-foreground)]">
            <p>{signupText}</p>
            <a href={signupUrl} className="font-medium text-[var(--foreground)] hover:underline">
              Sign up
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}