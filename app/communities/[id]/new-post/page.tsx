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
import { getCommunityById, checkCommunityMembership, getCommunityCategories, formatCategoryName } from "@/app/services/communityService";
import { getCommunityUsers } from "@/app/services/userService";
import { createPost } from "@/app/services/postService";
import { UserModel } from "@/app/models/UserModel";
import { storage } from "@/lib/firebase-client";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import { createNotificationsForCommunity } from "@/app/services/notificationService";
import { Timestamp } from "firebase/firestore";

import { Footer } from "@/components/ui/footer";
import { checkUserPermission } from "@/app/services/userService";

import { Switch } from "@/components/ui/switch";


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
  const [geographicTag, setGeographicTag] = useState("");

  const [category, setCategory] = useState("generalDiscussion");
  const [canPostEmergency, setCanPostEmergency] = useState(false);

  const [sendNotification, setSendNotification] = useState(false); // New state for toggle


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

  useEffect(() => {
    async function checkEmergencyPermission() {
      if (!user || !user.id || !communityId) return;

      try {
        const canPostEmergency = await checkUserPermission(
          user.id,
          communityId,
          'canPostEmergency'
        );

        setCanPostEmergency(canPostEmergency);
      } catch (error) {
        console.error("Error checking emergency permissions:", error);
      }
    }

    if (user && communityId) {
      checkEmergencyPermission();
    }
  }, [user, communityId]);

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

          // Update progress

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
        geographicTag: geographicTag.trim(),

        // Set isEmergency based on the category
        isEmergency: category === "officialEmergencyAlerts",
        mediaUrls,
        author: {
          name: `${user.firstName} ${user.lastName}`.trim() || user.email,
          role: "",
          badgeUrl: user.profilePhotoUrl || ""
        },
        status: "active" as const,
        createdAt: Timestamp.fromDate(new Date()) // Use Firebase Timestamp

      };

      // Create the post
      const newPost = await createPost(postData);

      // Create notifications only if toggle is enabled
      if (sendNotification) {
        try {
          // Get all community members except the current user (post author)
          const members = await getCommunityUsers(communityId);

          // Filter out the current user from notifications recipients
          const userIdsToNotify = members
            .filter(member => member.id !== user.id) // Filter using id property from User objects
            .map(member => member.id || '')
            .filter(id => id !== '');

          if (userIdsToNotify.length > 0) {
            await createNotificationsForCommunity({
              communityId,
              postId: newPost.id,
              title: postData.title,
              body: `${postData.author.name} created a new post: ${postData.title}`,
              categoryTag: postData.categoryTag,
              userIds: userIdsToNotify
            });

            console.log(`Notifications sent to ${userIdsToNotify.length} community members`);
          }
        } catch (notificationError) {
          console.error("Error sending notifications:", notificationError);
          // Don't fail the post creation if notifications fail
          // Just log the error and continue
        }
      }


      // Show success and redirect after a short delay
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

        <div className="flex-1 ml-0 flex flex-col min-h-screen bg-[var(--background)]">
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

      <div className="flex-1 ml-0 flex flex-col min-h-screen bg-[var(--background)]">
        <main className="flex-grow p-6">
          <div className="max-w-4xl mx-auto">

            <div className="mb-6">

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

                  {/* new geographic input field */}

                  <div className="space-y-2">
                    <Label htmlFor="geographicTag">Location (Optional)</Label>
                    <Input
                      id="geographicTag"
                      placeholder="Enter street address or location"
                      value={geographicTag}
                      onChange={(e) => setGeographicTag(e.target.value)}
                      className="bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]"
                    />
                  </div>

                  {/* Post content */}
                  <div className="space-y-2">
                    <Label htmlFor="content">Post Content</Label>
                    <Input
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
                      onValueChange={(value) => {
                        // Check permission for emergency alerts category
                        if (value === "officialEmergencyAlerts" && !canPostEmergency) {
                          setError("You don't have permission to post in the Official Emergency Alerts category");
                          return;
                        }
                      
                        // Clear any previous error
                        if (error === "You don't have permission to post in the Official Emergency Alerts category") {
                          setError(null);
                        }
                      
                        // Automatically turn on notifications for emergency posts
                        if (value === "officialEmergencyAlerts") {
                          setSendNotification(true);
                        }
                      
                        setCategory(value);
                      }}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger id="category" className="bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent className="bg-[var(--card)] border-[var(--border)]">
                        {getCommunityCategories().map((cat) => (
                          // Only show emergency category if user has permission
                          (cat !== "officialEmergencyAlerts" || canPostEmergency) && (
                            <SelectItem
                              key={cat}
                              value={cat}
                              className={`text-[var(--foreground)] hover:bg-[var(--secondary)] 
              ${cat === "officialEmergencyAlerts" ? "text-red-500 font-semibold" : ""}`}
                            >
                              {cat === "officialEmergencyAlerts" ? "🚨 " : ""}
                              {formatCategoryName(cat)}
                            </SelectItem>
                          )
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Show explanation for emergency category */}
                    {category === "officialEmergencyAlerts" && (
                      <p className="text-xs text-red-500 dark:text-red-400">
                        Posts in this category will be marked as emergency alerts and will be highlighted
                        to all community members. Only use for urgent, time-sensitive information.
                      </p>
                    )}
                  </div>



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



                  {/* Notification toggle (new addition) */}
                  {/* Notification Toggle Section */}
                  <div className="space-y-2 border-t border-[var(--border)] pt-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label
                          htmlFor="notification-toggle"
                          className="text-[var(--foreground)] font-semibold"
                        >
                          Create Community Notification
                        </Label>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          When enabled, this will send a notification to community members
                          based on their individual notification preferences. Emergency posts
                          will always be sent.
                        </p>
                      </div>
                      <Switch
                        id="notification-toggle"
                        checked={sendNotification}
                        onCheckedChange={setSendNotification}
                        disabled={isSubmitting}
                      />
                    </div>
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

        {/* Replace the default footer with the new Footer component */}
        <Footer />
      </div>
    </div>
  );
}