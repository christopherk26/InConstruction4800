// app/auth/authenticate-person/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/app/services/authService";
import { UserModel } from "@/app/models/UserModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { httpsCallable } from "firebase/functions";
import { functions, storage } from "@/lib/firebase-client";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { AuthenticatedHeader } from "@/components/ui/authenticated-header";

export default function AuthenticatePerson() {
  const router = useRouter();
  const [user, setUser] = useState<UserModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [document, setDocument] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchUser() {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          router.push("/auth/login");
        } else {
          setUser(currentUser);
          if (currentUser.isVerified()) {
            router.push("/");
          }
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setDocument(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !document || !firstName || !lastName) {
      setError("Please provide all required information.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const storageRef = ref(storage, `verification/${user.id}/${document.name}`);
      await uploadBytes(storageRef, document);
      const documentUrl = await getDownloadURL(storageRef);

      const verifyUser = httpsCallable(functions, "verifyUser");
      const result = await verifyUser({
        userId: user.id,
        firstName,
        lastName,
        documentUrl,
      });

      const verificationSuccess = result.data as boolean;

      if (verificationSuccess) {
        await user.updateVerificationStatus("verified", "internal");
        router.push("/");
      } else {
        setError("Verification failed. Please try again or contact support.");
      }
    } catch (error) {
      console.error("Error during verification:", error);
      setError("An error occurred during verification.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p>Loading...</p>;
  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <AuthenticatedHeader />
      <div className="flex-grow flex items-center justify-center">
        <div className="text-center max-w-md p-6 shadow-lg rounded-lg bg-[var(--card)]">
          <h1 className="text-2xl font-bold mb-4">Complete Your Verification</h1>
          <p className="mb-4">Hello, {user.email}</p>
          <p className="mb-6 text-[var(--muted-foreground)]">
            To use Town Hall, please verify your identity by providing your name and a government-issued ID.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={submitting}
              required
            />
            <Input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={submitting}
              required
            />
            <Input
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              disabled={submitting}
              required
            />
            {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Submitting..." : "Submit Verification"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}