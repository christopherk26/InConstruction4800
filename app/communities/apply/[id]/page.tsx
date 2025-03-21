// app/communities/apply/[id]/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Home, Upload, CheckCircle, AlertCircle } from "lucide-react";
import { getCurrentUser } from "@/app/services/authService";
import { getCommunityById } from "@/app/services/communityService";
import { UserModel } from "@/app/models/UserModel";
import { MainNavbar } from "@/components/ui/main-navbar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
// for on off switches
import { storage } from "@/lib/firebase-client";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase-client";

export default function CommunityApplicationPage() {
  const router = useRouter();
  const params = useParams();
  const communityId = params?.id as string;
  
  // References
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State for user and community data
  const [user, setUser] = useState<UserModel | null>(null);
  const [community, setCommunity] = useState<any | null>(null);
  
  // Form state
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [reason, setReason] = useState("");
  const [residenceProof, setResidenceProof] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [notifications, setNotifications] = useState({
    emergencyAlerts: true,
    generalDiscussion: true,
    safetyAndCrime: true,
    governance: true,
    disasterAndFire: true,
    businesses: true,
    resourcesAndRecovery: true,
    communityEvents: true,
    pushNotifications: true,
  });
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch user and community data
  useEffect(() => {
    async function fetchData() {
      try {
        // Get currently logged in user
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          router.push("/auth/login");
          return;
        }
        
        // Check if user is verified
        const isVerified = await currentUser.isVerified();
        if (!isVerified) {
          router.push("/auth/authenticate-person");
          return;
        }
        
        setUser(currentUser);
        
        // Fetch community details
        if (communityId) {
          const communityData = await getCommunityById(communityId);
          if (!communityData) {
            setError("Community not found");
            return;
          }
          
          setCommunity(communityData);
          
          // Pre-fill city, state based on community
          if (communityData.location) {
            setCity(communityData.location.city || "");
            setState(communityData.location.state || "");
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load data. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [communityId, router]);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("File size must be less than 5MB");
        return;
      }
      
      setResidenceProof(file);
      
      // Create file preview
      const reader = new FileReader();
      reader.onload = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !community) {
      setError("Missing user or community data");
      return;
    }
    
    // Validate form
    if (!street || !city || !state || !zipCode) {
      setError("Please fill in all address fields");
      return;
    }
    
    if (!residenceProof) {
      setError("Please upload proof of residence");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Upload residence proof document
      const storageRef = ref(storage, `residence_proofs/${user.id}/${Date.now()}_${residenceProof.name}`);
      await uploadBytes(storageRef, residenceProof);
      const documentUrl = await getDownloadURL(storageRef);
      
      // Create membership application
      const membershipData = {
        userId: user.id,
        communityId: communityId,
        type: 'resident',
        address: {
          street,
          city,
          state,
          zipCode,
          verificationDocumentUrls: [documentUrl],
        },
        notificationPreferences: notifications,
        applicationReason: reason,
        joinDate: new Date(), // Firebase will convert this to Timestamp
        status: 'pending',
        verificationStatus: 'pending',
      };
      
      // Add document to Firestore
      await addDoc(collection(db, 'community_memberships'), membershipData);
      
      // Show success message
      setSuccess(true);
      
      // Reset form
      setStreet("");
      setCity("");
      setState("");
      setZipCode("");
      setReason("");
      setResidenceProof(null);
      setFilePreview(null);
      
      // Redirect after a delay
      setTimeout(() => {
        router.push("/communities");
      }, 3000);
    } catch (error) {
      console.error("Error submitting application:", error);
      setError("Failed to submit application. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent"></div>
          <p className="text-[var(--foreground)]">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!user || !community) {
    return (
      <div className="min-h-screen flex bg-[var(--background)]">
        <div className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-[var(--card)] border-[var(--border)]">
              <CardHeader>
                <CardTitle className="text-xl text-[var(--foreground)]">
                  {error || "Community not found"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[var(--muted-foreground)]">
                  We couldn't find the community you're looking for.
                </p>
              </CardContent>
              <CardFooter>
                <Button asChild>
                  <Link href="/communities/browse">Browse Communities</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[var(--background)]">
      <MainNavbar user={user} />
      
      <div className="flex-1 ml-0 flex flex-col min-h-screen bg-[var(--background)]">
        <main className="flex-grow p-6">
          <div className="max-w-4xl mx-auto">
            {/* Back button */}
            <div className="mb-6">
              <Button variant="outline" onClick={() => router.back()} className="mb-2">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <div className="text-sm text-[var(--muted-foreground)] mb-4">
                <Link href="/dashboard" className="hover:underline">Dashboard</Link>
                {" / "}
                <Link href="/communities/browse" className="hover:underline">Browse Communities</Link>
                {" / "}
                <span>{community.name} Application</span>
              </div>
            </div>
            
            <h1 className="text-3xl font-bold mb-6 text-[var(--foreground)]">
              Apply to Join {community.name}
            </h1>
            
            {/* Community Info Card */}
            <Card className="bg-[var(--card)] border-[var(--border)] mb-6">
              <CardHeader>
                <CardTitle className="text-xl text-[var(--foreground)]">
                  About {community.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[var(--foreground)] mb-4">
                  {community.bio}
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[var(--muted-foreground)]">Location</p>
                    <p className="font-medium text-[var(--foreground)]">
                      {community.location?.city}, {community.location?.state}
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--muted-foreground)]">Members</p>
                    <p className="font-medium text-[var(--foreground)]">
                      {community.stats?.memberCount || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Success message */}
            {success && (
              <Card className="bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-700 mb-6">
                <CardHeader>
                  <CardTitle className="text-xl text-green-800 dark:text-green-200 flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Application Submitted Successfully
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-green-700 dark:text-green-300">
                    Your application to join {community.name} has been submitted. We'll review your application and notify you when it's approved.
                  </p>
                </CardContent>
                <CardFooter>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Redirecting to your communities...
                  </p>
                </CardFooter>
              </Card>
            )}
            
            {/* Application Form */}
            {!success && (
              <form onSubmit={handleSubmit}>
                <Card className="bg-[var(--card)] border-[var(--border)] mb-6">
                  <CardHeader>
                    <CardTitle className="text-xl text-[var(--foreground)]">
                      Address Information
                    </CardTitle>
                    <CardDescription className="text-[var(--muted-foreground)]">
                      Please provide your residential address to verify your eligibility for this community
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Street address */}
                    <div className="space-y-2">
                      <Label htmlFor="street">Street Address</Label>
                      <div className="flex relative">
                        <Home className="h-4 w-4 absolute left-3 top-3 text-[var(--muted-foreground)]" />
                        <Input
                          id="street"
                          placeholder="123 Main St"
                          value={street}
                          onChange={(e) => setStreet(e.target.value)}
                          className="pl-10 bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]"
                          required
                        />
                      </div>
                    </div>
                    
                    {/* City, state, zip */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          placeholder="City"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]"
                          required
                          // Disabled if provided by community info
                          disabled={!!community.location?.city}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">State</Label>
                        <Input
                          id="state"
                          placeholder="State"
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          className="bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]"
                          required
                          // Disabled if provided by community info
                          disabled={!!community.location?.state}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="zipCode">Zip Code</Label>
                        <div className="flex relative">
                          <MapPin className="h-4 w-4 absolute left-3 top-3 text-[var(--muted-foreground)]" />
                          <Input
                            id="zipCode"
                            placeholder="00000"
                            value={zipCode}
                            onChange={(e) => setZipCode(e.target.value)}
                            className="pl-10 bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]"
                            required
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Zip code validation message */}
                    {zipCode && community.location?.zipCodes && !community.location.zipCodes.includes(zipCode) && (
                      <div className="p-3 text-sm bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-md flex items-center">
                        <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                        <p>
                          This zip code is not within the community's service area. Common zip codes for this community are: {community.location.zipCodes.join(", ")}
                        </p>
                      </div>
                    )}
                    
                    {/* Residence Proof */}
                    <div className="space-y-2">
                      <Label htmlFor="residenceProof">Proof of Residence</Label>
                      <div className="flex flex-col">
                        <div 
                          className="border-2 border-dashed rounded-md p-4 text-center cursor-pointer hover:bg-[var(--secondary)] transition-colors"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {filePreview ? (
                            <div className="relative">
                              <img 
                                src={filePreview} 
                                alt="Document preview" 
                                className="max-h-40 mx-auto"
                              />
                              <div className="mt-2 text-sm text-[var(--foreground)]">
                                Click to change document
                              </div>
                            </div>
                          ) : (
                            <div className="py-4">
                              <Upload className="h-10 w-10 mx-auto mb-2 text-[var(--muted-foreground)]" />
                              <p className="text-[var(--foreground)]">
                                Upload proof of residence
                              </p>
                              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                                Utility bill, lease agreement, or other document showing your address
                              </p>
                            </div>
                          )}
                        </div>
                        <input
                          id="residenceProof"
                          ref={fileInputRef}
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={handleFileSelect}
                          className="hidden"
                          required
                        />
                        <p className="text-xs text-[var(--muted-foreground)] mt-1">
                          Supported formats: JPG, PNG, PDF | Max size: 5MB
                        </p>
                      </div>
                    </div>
                    
                    {/* Application Reason */}
                    <div className="space-y-2">
                      <Label htmlFor="reason">Why do you want to join this community?</Label>
                      <Input
                        id="reason"
                        placeholder="Share your reasons for joining this community..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]"
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>
                
                {/* Notification Preferences */}
                <Card className="bg-[var(--card)] border-[var(--border)] mb-6">
                  <CardHeader>
                    <CardTitle className="text-xl text-[var(--foreground)]">
                      Notification Preferences
                    </CardTitle>
                    <CardDescription className="text-[var(--muted-foreground)]">
                      Choose which types of community updates you'd like to receive
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      {/* Using simple styled preference toggles */}
                      {[
                        { key: 'emergencyAlerts', label: 'Emergency Alerts', defaultOn: true },
                        { key: 'generalDiscussion', label: 'General Discussion', defaultOn: true },
                        { key: 'safetyAndCrime', label: 'Safety & Crime', defaultOn: true },
                        { key: 'governance', label: 'Governance', defaultOn: true },
                        { key: 'disasterAndFire', label: 'Disaster & Fire', defaultOn: true },
                        { key: 'businesses', label: 'Businesses', defaultOn: true },
                        { key: 'resourcesAndRecovery', label: 'Resources & Recovery', defaultOn: true },
                        { key: 'communityEvents', label: 'Community Events', defaultOn: true }
                      ].map(pref => (
                        <div key={pref.key} className="flex items-center justify-between">
                          <Label htmlFor={pref.key} className="cursor-pointer">
                            {pref.label}
                          </Label>
                          <Switch
                            id={pref.key}
                            checked={notifications[pref.key as keyof typeof notifications]}
                            onCheckedChange={(checked) => 
                              setNotifications(prev => ({ ...prev, [pref.key]: checked }))
                            }
                          />
                        </div>
                      ))}
                      
                      {/* Push notifications toggle */}
                      <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
                        <div>
                          <Label htmlFor="pushNotifications" className="cursor-pointer">
                            Push Notifications
                          </Label>
                          <p className="text-xs text-[var(--muted-foreground)]">
                            Receive notifications on your device when important updates occur
                          </p>
                        </div>
                        <Switch
                          id="pushNotifications"
                          checked={notifications.pushNotifications}
                          onCheckedChange={(checked) => 
                            setNotifications(prev => ({ ...prev, pushNotifications: checked }))
                          }
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Error message */}
                {error && (
                  <div className="p-4 mb-6 text-sm bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-md flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                    <p>{error}</p>
                  </div>
                )}
                
                {/* Submit button */}
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full md:w-auto"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                        Submitting...
                      </>
                    ) : (
                      "Submit Application"
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </main>
        
        <footer className="p-2 text-center text-[var(--muted-foreground)] border-t border-[var(--border)]">
          © 2025 In Construction, Inc. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
