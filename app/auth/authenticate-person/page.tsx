"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/app/services/authService";
import { UserModel } from "@/app/models/UserModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { httpsCallable } from "firebase/functions";
import { functions, storage } from "@/lib/firebase-client";
import { ref, uploadBytes } from "firebase/storage";
import { AuthenticatedHeader } from "@/components/ui/authenticated-header";
import { getAuth, onAuthStateChanged } from "firebase/auth";

export default function AuthenticatePerson() {
  const router = useRouter();
  const [user, setUser] = useState<UserModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [document, setDocument] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          router.push("/auth/login");
          return;
        }
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          router.push("/auth/login");
          return;
        }
        setUser(currentUser);
        const isVerified = await currentUser.isVerified();
        if (isVerified) {
          router.push("/homepage");
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        router.push("/auth/login");
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setDocument(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !document || !firstName || !lastName || !birthDate) {
      setError("Please provide all required information.");
      return;
    }

    const auth = getAuth();
    if (!auth.currentUser) {
      setError("You are not signed in. Please log in again.");
      router.push("/auth/login");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Create a unique file name with timestamp
      const fileName = document.name.replaceAll(" ", "_");
      const storagePath = `verification/${user.id}/${fileName}`; // Storage path to send to server
      const storageRef = ref(storage, storagePath);
      console.log("Uploading file:", fileName);
      await uploadBytes(storageRef, document);
      console.log("Storage Path:", storagePath);

      const payload = { firstName, lastName, birthDate, imageUrl: storagePath }; // Send storage path
      console.log("Sending to verifyUserWithOCR (FUNCTION-ONLY ACCESS):", payload);

      const verifyUser = httpsCallable(functions, "verifyUserWithOCR");
      const result = await verifyUser(payload);
      const { success, message } = result.data as { message: string; success: boolean };

      if (success) {
        await user.updateVerificationStatus("verified", "internal");
        router.push("/dashboard");
      } else {
        setError(`Verification failed: ${message}`);
      }
    } catch (error: any) {
      console.error("Verification error:", {
        code: error.code,
        message: error.message,
        details: error.details,
      });
      setError(`Verification failed: ${error.details || error.message || "Unknown error"}`);
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
            To use Town Hall, please verify your identity by providing your name, birth date, and a government-issued ID.
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
              type="date"
              placeholder="Birth Date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
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