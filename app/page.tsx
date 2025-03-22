"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { UnauthenticatedHeader } from "@/components/ui/unauthenticated-header";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/app/services/authService";
import { Footer } from "@/components/ui/footer";
import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [textComplete, setTextComplete] = useState(false);
  const [currentText, setCurrentText] = useState("");
  const fullText = "Town Hall is a secure, verified platform connecting local communities with their governments. Share resources, discuss civic issues, and receive emergency alerts directly from verified officials.";

  useEffect(() => {
    async function checkAuth() {
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          router.push("/dashboard");
        }
      } catch (error) {
        console.error("Error checking auth:", error);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  // Text animation effect
  useEffect(() => {
    if (loading) return;

    let index = 0;
    const intervalId = setInterval(() => {
      setCurrentText(fullText.slice(0, index));
      index++;
      
      if (index > fullText.length) {
        clearInterval(intervalId);
        setTextComplete(true);
      }
    }, 30); // Speed of typing

    return () => clearInterval(intervalId);
  }, [loading, fullText]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent"></div>
          <p className="mt-4 text-[var(--foreground)]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Header - with header-container class for CSS fix */}
      <div className="relative z-10 header-container">
        <UnauthenticatedHeader />
      </div>
      
      {/* Main content */}
      <main className="flex-grow flex flex-col items-center justify-center px-4 py-6 relative z-0">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center"
        >
          <Image 
            src="/mainlogo.png" 
            alt="Town Hall Logo" 
            width={100} 
            height={100} 
            className="mb-4"
          />
          
          <h1 className="text-4xl font-bold text-[var(--foreground)] mb-4 text-center">
            Welcome to Town Hall
          </h1>

          <div className="max-w-2xl mb-6">
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              {currentText}
            </p>
          </div>

          {textComplete && (
            <motion.div 
              className="flex flex-row gap-4 mt-6 w-full max-w-md justify-center" 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Button asChild className="w-[150px]">
                <Link href="/auth/login">
                  Log In
                </Link>
              </Button>
              
              <Button asChild className="w-[150px]">
                <Link href="/auth/signup">
                  Sign Up
                </Link>
              </Button>
            </motion.div>
          )}
          
          {textComplete && (
            <motion.div 
              className="mt-8 max-w-3xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="bg-[var(--card)] border-[var(--border)]">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-center">
                    Why join Town Hall?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="flex flex-col items-center text-center">
                      <div className="w-12 h-12 bg-[#1DA1F2]/20 rounded-full flex items-center justify-center mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#1DA1F2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        </svg>
                      </div>
                      <h3 className="font-semibold mb-1 text-sm">Verified Identity</h3>
                      <p className="text-xs text-[var(--muted-foreground)]">Ensure real-name participation for trust and accountability</p>
                    </div>
                    
                    <div className="flex flex-col items-center text-center">
                      <div className="w-12 h-12 bg-[#1DA1F2]/20 rounded-full flex items-center justify-center mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#1DA1F2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                          <path d="M2 12h20"></path>
                        </svg>
                      </div>
                      <h3 className="font-semibold mb-1 text-sm">Geographic Focus</h3>
                      <p className="text-xs text-[var(--muted-foreground)]">Location-specific communities with residency validation</p>
                    </div>
                    
                    <div className="flex flex-col items-center text-center">
                      <div className="w-12 h-12 bg-[#1DA1F2]/20 rounded-full flex items-center justify-center mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#1DA1F2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                          <line x1="12" y1="9" x2="12" y2="13"></line>
                          <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                      </div>
                      <h3 className="font-semibold mb-1 text-sm">Emergency Alerts</h3>
                      <p className="text-xs text-[var(--muted-foreground)]">Receive critical updates from verified officials</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </main>
      
      {/* Footer with z-10 */}
      <div className="relative z-10 w-full">
        <Footer />
      </div>
    </div>
  );
}