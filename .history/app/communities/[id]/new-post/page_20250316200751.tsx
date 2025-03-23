// app/communities/[communityId]/new-post/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Image, X, AlertTriangle } from "lucide-react";
import { MainNavbar } from "@/components/ui/main-navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { getCurrentUser } from "@/app/services/authService";
import { getCommunityById, checkCommunityMembership, getCommunityCategories, formatCategoryName, getCommunityMembers } from "@/app/services/communityService";
import { createPost } from "@/app/services/postService";
import { UserModel } from "@/app/models/UserModel";
import { storage } from "@/lib/firebase-client";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { createNotificationsForCommunity } from "@/app/services/notificationService";

// Simple custom Switch component to avoid dependency issues
function Switch({ 
  id, 
  checked = false, 
  onCheckedChange, 
  disabled = false 
}: { 
  id?: string; 
  checked?: boolean; 
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label 
      htmlFor={id} 
      className={`relative inline-flex items-center cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <input
        id={id}
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={e => onCheckedChange?.(e.target.checked)}
        disabled={disabled}
      />
      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
    </label>
  );
}

export default function NewPostPage() {
  // Get route parameters
  const router = useRouter();
  const params = useParams();
  const communityId = params?.id as string;
  
  // References
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State for user and community data
  const [user, setUser] = useState<UserModel | null>(null);
  const [community, setCommunity] = useState<any | null>(null);
  
  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("generalDiscussion");
  const [isEmergency, setIsEmergency] = useState(false);
  const [canPostEmergency, setCanPostEmergency] = useState(false);
  
  // Media handling
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingCommunity, setLoadingCommunity] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Check user auth and community access
  useEffect(() => {
    async function checkAccess() {
      try {
        setLoadingUser(true);
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
        setLoadingUser(false);
        
        // Check if user has access to this community
        const hasAccess = await checkCommunityMembership(currentUser.id || '', communityId);
        
        if (!hasAccess) {
          router.push(`/communities/access-denied?community=${communityId}`);
          return;
        }
        
        // Check if user has emergency posting privileges
        // This would typically check user roles in the community
        // For now, we'll just set it based on checking if the user is an admin or has the right role
        // TODO: Implement proper role-based check
        setCanPostEmergency(false);
        
        // Fetch community details
        setLoadingCommunity(true);
        const communityData = await getCommunityById(communityId);
        setCommunity(communityData);
        setLoadingCommunity(false);
        
      } catch (error) {
        console.error("Error checking access:", error);
        setError("Error loading community data. Please try again.");
      }
    }

    if (communityId) {
      checkAccess();
    }
  }, [communityId, router]);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      
      // Check file size and type
      const validFiles = newFiles.filter(file => {
        const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB limit
        const isValidType = file.type.startsWith('image/');
        return isValidSize && isValidType;
      });
      
      if (validFiles.length !== newFiles.length) {
        setError("Some files were skipped. Only images under 5MB are allowed.");
      }
      
      // Limit to 5 files maximum
      const filesToAdd = validFiles.slice(0, 5 - selectedFiles.length);
      
      if (selectedFiles.length + filesToAdd.length > 5) {
        setError("You can upload a maximum of 5 images.");
      }
      
      setSelectedFiles(prev => [...prev, ...filesToAdd]);
      
      // Create preview URLs
      const newPreviewUrls = filesToAdd.map(file => URL.createObjectURL(file));
      setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
    }
  };

  // Remove a selected file
  const removeFile = (index: number) => {
    // Revoke object URL to prevent memory leaks
    URL.revokeObjectURL(previewUrls[index]);
    
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !community) {
      setError("Missing user or community data");
      return;
    }
    
    if (!title.trim()) {
      setError("Please enter a title for your post");
      return;
    }
    
    if (!content.trim()) {
      setError("Please enter content for your post");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Upload media files if any
      const mediaUrls: string[] = [];
      if (selectedFiles.length > 0) {
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          const fileRef = ref(storage, `posts/${communityId}/${Date.now()}_${file.name}`);
          await uploadBytes(fileRef, file);
          const downloadUrl = await getDownloadURL(fileRef);
          mediaUrls.push(downloadUrl);
          setUploadProgress(Math.round(((i + 1) / selectedFiles.length) * 100));
        }
      }
      
      // Create post data
      const postData = {
        communityId,
        authorId: user.id || '',
        title: title.trim(),
        content: content.trim(),
        categoryTag: category,
        isEmergency: isEmergency && canPostEmergency,
        mediaUrls,
        author: {
          name: `${user.firstName} ${user.lastName}`.trim() || user.email,
          role: "", // You can set this if user roles are available
          badgeUrl: user.profilePhotoUrl || ""
        },
        geographicTag: "", // Set appropriate geographic tag
        status: "active",
        createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } // Add timestamp
      };
      
      // Create the post
      const newPost = await createPost(postData);
      
      // Fetch community members and create notifications
      const members = await getCommunityMembers(communityId);
      const memberIds = members
        .filter(member => member.userId !== user.id) // Exclude the post author
        .map(member => member.userId);
      
      await createNotificationsForCommunity({
        communityId,
        postId: newPost.id,
        title: postData.title,
        body: `${postData.author.name} created a new post: ${postData.title}`,
        categoryTag: postData.categoryTag,
        userIds: memberIds
      });
      
      // Show success and redirect
      setSuccess(true);
      setTimeout(() => {
        router.push(`/communities/${communityId}/posts/${newPost.id}`);
      }, 1500);
      
    } catch (error) {
      console.error("Error creating post or notifications:", error);
      setError("Failed to create post or send notifications. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (loadingUser || loadingCommunity) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent"></div>
          <p className="text-[var(--foreground)]">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error && !community) {
    return (
      <div className="min-h-screen flex bg-[var(--background)]">
        {user && <MainNavbar user={user} />}
        
        <div className="flex-1 ml-64 flex flex-col min-h-screen bg-[var(--background)]">
          <main className="flex-grow p-6">
            <div className="max-w-4xl mx-auto">
              <Card className="bg-[var(--card)] border-[var(--border)]">
                <CardHeader>
                  <CardTitle className="text-xl text-[var(--foreground)]">
                    Error
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-[var(--muted-foreground)]">{error}</p>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" onClick={() => router.back()}>
                    Go Back
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </main>
          
          <footer className="p-2 text-center text-[var(--muted-foreground)] border-t border-[var(--border)]">
            © 2025 In Construction, Inc. All rights reserved.
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[var(--background)]">
      {user && <MainNavbar user={user} />}
      
      <div className="flex-1 ml-64 flex flex-col min-h-screen bg-[var(--background)]">
        <main className="flex-grow p-6">
          <div className="max-w-4xl mx-auto">
            {/* Back button and navigation */}
            <div className="mb-6">
              <Button variant="outline" onClick={() => router.back()} className="mb-2">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <div className="text-sm text-[var(--muted-foreground)] mb-4">
                <Link href="/dashboard" className="hover:underline">Dashboard</Link>
                {" / "}
                <Link href="/communities" className="hover:underline">Communities</Link>
                {" / "}
                <Link href={`/communities/${communityId}`} className="hover:underline">{community?.name}</Link>
                {" / "}
                <span>New Post</span>
              </div>
            </div>
            
            {/* New Post Form */}
            <Card className="bg-[var(--card)] border-[var(--border)]">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-[var(--foreground)]">
                  Create New Post
                </CardTitle>
                <CardDescription className="text-[var(--muted-foreground)]">
                  Share your thoughts with the {community?.name} community
                </CardDescription>
              </CardHeader>
              
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-6">
                  {/* Success message */}
                  {success && (
                    <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 p-4 rounded-md">
                      Post created successfully! Redirecting...
                    </div>
                  )}
                  
                  {/* Error message */}
                  {error && (
                    <div className="bg-gray-100 dark:bg-gray-900 text-red-800 dark:text-red-100 p-4 rounded-md flex items-center">
                      <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
                      <p>{error}</p>
                    </div>
                  )}
                  
                  {/* Post title */}
                  <div className="space-y-2">
                    <Label htmlFor="title">Post Title</Label>
                    <Input
                      id="title"
                      placeholder="Enter a descriptive title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      disabled={isSubmitting}
                      required
                      className="bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]"
                    />
                  </div>
                  
                  {/* Post content */}
                  <div className="space-y-2">
                    <Label htmlFor="content">Post Content</Label>
                    <Textarea
                      id="content"
                      placeholder="Write your post content here..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={8}
                      disabled={isSubmitting}
                      required
                      className="bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]"
                    />
                  </div>
                  
                  {/* Category selection */}
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select 
                      value={category} 
                      onValueChange={setCategory}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger id="category" className="bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent className="bg-[var(--card)] border-[var(--border)]">
                        {getCommunityCategories().map((cat) => (
                          <SelectItem key={cat} value={cat} className="text-[var(--foreground)] hover:bg-[var(--secondary)]">
                            {formatCategoryName(cat)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Emergency post toggle (only if user has permission) */}
                  {canPostEmergency && (
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="emergency"
                        checked={isEmergency}
                        onCheckedChange={setIsEmergency}
                        disabled={isSubmitting}
                      />
                      <Label htmlFor="emergency" className="text-[var(--foreground)]">
                        Mark as Emergency Post
                      </Label>
                    </div>
                  )}
                  
                  {/* Media upload */}
                  <div className="space-y-4">
                    <Label className="text-[var(--foreground)]">Media (Optional)</Label>
                    
                    {/* Media preview */}
                    {previewUrls.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-4">
                        {previewUrls.map((url, index) => (
                          <div key={index} className="relative aspect-square">
                            <img
                              src={url}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-full object-cover rounded-md"
                            />
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="absolute top-1 right-1 bg-black bg-opacity-50 text-white rounded-full p-1"
                              disabled={isSubmitting}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* File input (hidden) */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="image/*"
                      multiple
                      className="hidden"
                      disabled={isSubmitting || selectedFiles.length >= 5}
                    />
                    
                    {/* Custom upload button */}
                    {selectedFiles.length < 5 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSubmitting}
                        className="w-full border-dashed"
                      >
                        <Image className="h-4 w-4 mr-2" />
                        Upload Images (Max 5)
                      </Button>
                    )}
                    
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Supported formats: JPG, PNG, GIF | Max size: 5MB per image
                    </p>
                  </div>
                  
                  {/* Upload progress */}
                  {isSubmitting && uploadProgress > 0 && (
                    <div className="w-full bg-[var(--secondary)] rounded-full h-2.5">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full" 
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  )}
                </CardContent>
                
                <CardFooter className="flex justify-end space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || !title.trim() || !content.trim()}
                  >
                    {isSubmitting ? "Creating Post..." : "Create Post"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>
        </main>
        
        <footer className="p-2 text-center text-[var(--muted-foreground)] border-t border-[var(--border)]">
          © 2025 In Construction, Inc. All rights reserved.
        </footer>
      </div>
    </div>
  );
}