//app/myprofile/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/app/services/authService";
import { UserModel } from "@/app/models/UserModel";
import { MainNavbar } from "@/components/ui/main-navbar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Camera, User, Save, Loader2 } from "lucide-react";
import { storage } from "@/lib/firebase-client";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Footer } from "@/components/ui/footer";  

export default function MyProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [user, setUser] = useState<UserModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [bio, setBio] = useState("");
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [newProfilePhoto, setNewProfilePhoto] = useState<File | null>(null);

  // Fetch user data
  useEffect(() => {
    async function fetchUserData() {
      try {
        setLoading(true);
        const currentUser = await getCurrentUser();
        
        if (!currentUser) {
          router.push("/auth/login");
          return;
        }
        
        // Verify the user is authenticated properly
        const isVerified = await currentUser.isVerified();
        if (!isVerified) {
          router.push("/auth/authenticate-person");
          return;
        }
        
        setUser(currentUser);
        setBio(currentUser.bio || "");
        setProfilePhoto(currentUser.profilePhotoUrl || null);
      } catch (error) {
        console.error("Error fetching user data:", error);
        setError("Failed to load your profile. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    
    fetchUserData();
  }, [router]);

  // Handle profile photo selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Profile photo must be less than 5MB");
        return;
      }
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        setError("Selected file must be an image");
        return;
      }
      
      setNewProfilePhoto(file);
      // Create preview URL
      setProfilePhoto(URL.createObjectURL(file));
      setError(null);
    }
  };

  // Trigger file input click
  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    setError(null);
    setSuccess(null);
    setSaving(true);
    
    try {
      // Upload new profile photo if selected
      let photoUrl = user.profilePhotoUrl;
      
      if (newProfilePhoto) {
        const storageRef = ref(storage, `profile_photos/${user.id}/${Date.now()}_${newProfilePhoto.name}`);
        await uploadBytes(storageRef, newProfilePhoto);
        photoUrl = await getDownloadURL(storageRef);
      }
      
      // Update user profile - only bio and profile photo can be changed
      await user.update({
        bio,
        profilePhotoUrl: photoUrl
      });
      
      setSuccess("Profile updated successfully!");
      
      // Reset new photo state
      setNewProfilePhoto(null);
    } catch (error) {
      console.error("Error updating profile:", error);
      setError("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent"></div>
          <p className="text-[var(--foreground)]">Loading your profile...</p>
        </div>
      </div>
    );
  }
  
  if (!user) return null;

  return (
    <div className="min-h-screen flex bg-[var(--background)]">
      <MainNavbar user={user} />
      
      <div className="flex-1 ml-0 flex flex-col min-h-screen bg-[var(--background)]">
        <main className="flex-grow p-6">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-[var(--foreground)]">Your Profile</h1>
            
            <form onSubmit={handleSubmit}>
              <Card className="bg-[var(--card)] border-[var(--border)] mb-6">
                <CardHeader>
                  <CardTitle className="text-xl text-[var(--foreground)]">
                    Profile Information
                  </CardTitle>
                  <CardDescription className="text-[var(--muted-foreground)]">
                    Update your profile photo and bio to personalize how you appear to the community
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Profile photo */}
                  <div className="flex flex-col items-center">
                    <div
                      className="w-32 h-32 rounded-full overflow-hidden bg-[var(--muted)] mb-4 cursor-pointer relative"
                      onClick={handlePhotoClick}
                    >
                      {profilePhoto ? (
                        <img 
                          src={profilePhoto} 
                          alt="Profile" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[var(--primary)]">
                          <User className="h-16 w-16 text-[var(--primary-foreground)]" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Camera className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                      data-testid="file-input" // ADD THIS LINE

                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handlePhotoClick}
                      className="text-sm"
                    >
                      Change Photo
                    </Button>
                  </div>
                  
                  {/* Name fields - READ ONLY */}
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={user.firstName || ""}
                        readOnly
                        disabled
                        className="bg-[var(--muted)] text-[var(--muted-foreground)]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={user.lastName || ""}
                        readOnly
                        disabled
                        className="bg-[var(--muted)] text-[var(--muted-foreground)]"
                      />
                      <p className="text-xs text-[var(--muted-foreground)]">
                        Name cannot be changed. Contact support if needed.
                      </p>
                    </div>
                  </div>
                  
                  {/* Bio field */}
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Input
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell the community about yourself..."
                      rows={5}
                      className="bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]"
                    />
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Write a short bio to introduce yourself to your community. This will be visible to other community members.
                    </p>
                  </div>
                  
                  {/* Email - read only */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={user.email}
                      readOnly
                      disabled
                      className="bg-[var(--muted)] text-[var(--muted-foreground)]"
                    />
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Your email is used for login and cannot be changed here.
                    </p>
                  </div>
                  
                  {/* Status messages */}
                  {error && (
                    <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100 p-3 rounded-md text-sm">
                      {error}
                    </div>
                  )}
                  
                  {success && (
                    <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 p-3 rounded-md text-sm">
                      {success}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button type="submit" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </div>
        </main>
        
        {/* Replace the default footer with the new Footer component */}
        <Footer />
      </div>
    </div>
  );
}