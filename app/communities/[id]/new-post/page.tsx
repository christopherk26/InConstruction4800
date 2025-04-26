//app/communities/[id]/new-post/page.tsx
"use client";

import { useEffect, useState, useRef, ChangeEvent } from "react";
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
import {
  getCommunityById,
  checkCommunityMembership,
  getCommunityCategories,
  formatCategoryName,
  getUserCommunities,
  getUserCommunitySelection,
  setUserCommunitySelection
} from "@/app/services/communityService";
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
  const urlCommunityId = params?.id as string;

  // References
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for user and community data
  const [user, setUser] = useState<UserModel | null>(null);
  const [community, setCommunity] = useState<any | null>(null);

  // New state for all user communities
  const [userCommunities, setUserCommunities] = useState<{ id: string; name: string }[]>([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string>(urlCommunityId || '');

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [geographicTag, setGeographicTag] = useState("");

  const [category, setCategory] = useState("generalDiscussion");
  const [canPostEmergency, setCanPostEmergency] = useState(false);
  const [loadingPermissions, setLoadingPermissions] = useState(true);

  const [sendNotification, setSendNotification] = useState(false);

  // Media handling
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingCommunity, setLoadingCommunity] = useState(true);
  const [loadingCommunities, setLoadingCommunities] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load user and their communities
  useEffect(() => {
    async function loadUserData() {
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
    
        // Fetch all user communities
        setLoadingCommunities(true);
        const communities = await getUserCommunities(currentUser.id || '');
        const formattedCommunities = communities.map(community => ({
          id: community.id || '',
          name: community.name || 'Unnamed Community'
        }));
        setUserCommunities(formattedCommunities);
        setLoadingCommunities(false);
    
        // Determine which community to select
        let communityToSelect = '';
        
        // First priority: URL parameter
        if (urlCommunityId) {
          const hasAccess = await checkCommunityMembership(currentUser.id || '', urlCommunityId);
          if (hasAccess) {
            communityToSelect = urlCommunityId;
          }
        }
        
        // Second priority: Last selected community from localStorage
        if (!communityToSelect && currentUser.id) {
          const lastSelected = getUserCommunitySelection(currentUser.id);
          if (lastSelected) {
            // Verify user still has access to this community
            const hasAccess = await checkCommunityMembership(currentUser.id, lastSelected);
            if (hasAccess) {
              communityToSelect = lastSelected;
            }
          }
        }
        
        // Third priority: First community in list
        if (!communityToSelect && formattedCommunities.length > 0) {
          communityToSelect = formattedCommunities[0].id;
        }
        
        if (communityToSelect) {
          setLoadingCommunity(true);
          setLoadingPermissions(true);
          
          try {
            // Get community data
            const communityData = await getCommunityById(communityToSelect);
            setCommunity(communityData);
            setLoadingCommunity(false);
            
            // Check permissions explicitly
            if (currentUser && currentUser.id) {
              try {
                const hasEmergencyPermission = await checkUserPermission(
                  currentUser.id,
                  communityToSelect,
                  'canPostEmergency'
                );
                
                console.log(`Initial permission check for ${communityToSelect}: ${hasEmergencyPermission}`);
                setCanPostEmergency(hasEmergencyPermission);
              } catch (permError) {
                console.error("Error checking permissions:", permError);
                setCanPostEmergency(false);
              }
            } else {
              setCanPostEmergency(false);
            }
          } catch (error) {
            console.error("Error loading community details:", error);
            setError("Error loading community details. Please try again.");
          } finally {
            setLoadingPermissions(false);
            // Only update the selected community ID at the very end
            setSelectedCommunityId(communityToSelect);
          }
          
          // Save selection to localStorage
          if (currentUser.id) {
            setUserCommunitySelection(currentUser.id, communityToSelect);
          }
        } else if (formattedCommunities.length === 0) {
          // No communities available
          setError("You haven't joined any communities yet. Please join a community before creating a post.");
        }
      } catch (error) {
        console.error("Error loading user data:", error);
        setError("Error loading user data. Please try again.");
      }
    }

    loadUserData();
  }, [router, urlCommunityId]);

  // Load community details when selected community changes
  // Modify your loadCommunityDetails function
const loadCommunityDetails = async (communityId: string) => {
  if (!communityId) return;
  
  try {
    setLoadingCommunity(true);
    setLoadingPermissions(true); // Start loading permissions
    
    // Get community data first
    const communityData = await getCommunityById(communityId);
    setCommunity(communityData);
    
    // Mark basic community data as loaded
    setLoadingCommunity(false);
    
    // Check emergency posting permissions for this community
    if (user && user.id) {
      try {
        // Check permission explicitly
        const hasEmergencyPermission = await checkUserPermission(
          user.id,
          communityId,
          'canPostEmergency'
        );
        
        console.log(`Permission check for ${communityId}: ${hasEmergencyPermission}`);
        setCanPostEmergency(hasEmergencyPermission);
      } catch (permError) {
        console.error("Error checking permissions:", permError);
        setCanPostEmergency(false);
      } finally {
        setLoadingPermissions(false); // Always mark permissions as done loading
      }
    } else {
      setCanPostEmergency(false);
      setLoadingPermissions(false);
    }
  } catch (error) {
    console.error("Error loading community details:", error);
    setError("Error loading community details. Please try again.");
    setLoadingCommunity(false);
    setLoadingPermissions(false);
  }
};

  // Handle community selection change
  const handleCommunityChange = async (communityId: string) => {
    // Save selection to localStorage first
    if (user && user.id) {
      setUserCommunitySelection(user.id, communityId);
    }
    
    // Set loading states
    setLoadingCommunity(true);
    setLoadingPermissions(true);
    
    try {
      // Get community data
      const communityData = await getCommunityById(communityId);
      setCommunity(communityData);
      setLoadingCommunity(false);
      
      // Check permissions explicitly
      if (user && user.id) {
        try {
          const hasEmergencyPermission = await checkUserPermission(
            user.id,
            communityId,
            'canPostEmergency'
          );
          
          console.log(`Permission check for ${communityId}: ${hasEmergencyPermission}`);
          setCanPostEmergency(hasEmergencyPermission);
        } catch (permError) {
          console.error("Error checking permissions:", permError);
          setCanPostEmergency(false);
        }
      } else {
        setCanPostEmergency(false);
      }
    } catch (error) {
      console.error("Error loading community details:", error);
      setError("Error loading community details. Please try again.");
    } finally {
      setLoadingPermissions(false);
      // Only update the selected community ID at the very end, after all other states are updated
      setSelectedCommunityId(communityId);
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

    if (!user || !community || !selectedCommunityId) {
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
          const fileRef = ref(storage, `posts/${selectedCommunityId}/${Date.now()}_${file.name}`);

          await uploadBytes(fileRef, file);
          const downloadUrl = await getDownloadURL(fileRef);
          mediaUrls.push(downloadUrl);

          // Update progress
          setUploadProgress(Math.round(((i + 1) / selectedFiles.length) * 100));
        }
      }

      // Create post data
      const postData = {
        communityId: selectedCommunityId,
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
      if (sendNotification || category === "officialEmergencyAlerts") {
        try {
          // Get all community members except the current user (post author)
          const members = await getCommunityUsers(selectedCommunityId);

          // Filter out the current user from notifications recipients
          const userIdsToNotify = members
            .filter(member => member.id !== user.id) // Filter using id property from User objects
            .map(member => member.id || '')
            .filter(id => id !== '');

          if (userIdsToNotify.length > 0) {
            await createNotificationsForCommunity({
              communityId: selectedCommunityId,
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
        router.push(`/communities/${selectedCommunityId}/posts/${newPost.id}`);
      }, 1500);

    } catch (error) {
      console.error("Error creating post or notifications:", error);
      setError("Failed to create post or send notifications. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (loadingUser || loadingCommunities) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent"></div>
          <p className="text-[var(--foreground)]">Loading...</p>
        </div>
      </div>
    );
  }

  // No communities state
  if (userCommunities.length === 0) {
    return (
      <div className="min-h-screen flex bg-[var(--background)]">
        {user && <MainNavbar user={user} />}

        <div className="flex-1 ml-0 flex flex-col min-h-screen bg-[var(--background)]">
          <main className="flex-grow p-6">
            <div className="max-w-4xl mx-auto">
              <Card className="bg-[var(--card)] border-[var(--border)]">
                <CardHeader>
                  <CardTitle className="text-xl text-[var(--foreground)]">
                    No Communities
                  </CardTitle>
                  <CardDescription className="text-[var(--muted-foreground)]">
                    You need to join a community before you can create a post.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-[var(--muted-foreground)] mb-4">
                    Join a community to start posting and interacting with other members.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button asChild>
                    <Link href="/communities/apply">Join a Community</Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </main>
          <Footer />
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
          <Footer />
        </div>
      </div>
    );
  }

  function handleFileSelect(event: ChangeEvent<HTMLInputElement>): void {
    throw new Error("Function not implemented.");
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
                  Share your thoughts with your community
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

                  {/* Community selection dropdown - NEW */}
                  <div className="space-y-2">
                    <Label htmlFor="community">Community</Label>
                    <Select
                      value={selectedCommunityId}
                      onValueChange={handleCommunityChange}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger
                        id="community"
                        className="bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]"
                      >
                        <SelectValue placeholder="Select a community" />
                      </SelectTrigger>
                      <SelectContent className="bg-[var(--card)] border-[var(--border)]">
                        {userCommunities.map((comm) => (
                          <SelectItem
                            key={comm.id}
                            value={comm.id}
                            className="text-[var(--foreground)] hover:bg-[var(--secondary)]"
                          >
                            {comm.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Show loading indicator while loading community details */}
                  {loadingCommunity && (
                    <div className="py-4 flex justify-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent"></div>
                    </div>
                  )}

                  {/* Only show the form when community is loaded */}
                  {!loadingCommunity && community && (
                    <>
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

                      {/* Geographic input field */}
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

                        {/* Show loading indicator while checking permissions */}
                        {loadingPermissions ? (
                          <div className="py-2 flex items-center gap-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent"></div>
                            <span className="text-sm text-[var(--muted-foreground)]">Loading categories...</span>
                          </div>
                        ) : (
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
                            <SelectTrigger
                              id="category"
                              className="bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]"
                            >
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent className="bg-[var(--card)] border-[var(--border)]">
                              {getCommunityCategories().map((cat) => (
                                <SelectItem
                                  key={cat}
                                  value={cat}
                                  className={`text-[var(--foreground)] hover:bg-[var(--secondary)] 
        ${cat === "officialEmergencyAlerts" ? "text-red-500 font-semibold" : ""}`}
                                  disabled={cat === "officialEmergencyAlerts" && !canPostEmergency && !loadingPermissions}
                                >
                                  {cat === "officialEmergencyAlerts" ? "🚨 " : ""}
                                  {formatCategoryName(cat)}
                                  {cat === "officialEmergencyAlerts" && !canPostEmergency && !loadingPermissions && " (Requires permission)"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

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

                      {/* Notification toggle */}
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
                            checked={sendNotification || category === "officialEmergencyAlerts"}
                            onCheckedChange={(checked) => {
                              // Don't allow turning off notifications for emergency posts
                              if (category === "officialEmergencyAlerts" && !checked) {
                                return;
                              }
                              setSendNotification(checked);
                            }}
                            disabled={isSubmitting || category === "officialEmergencyAlerts"}
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
                    </>
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
                    disabled={isSubmitting || !title.trim() || !content.trim() || loadingCommunity || loadingPermissions || !community}
                  >
                    {isSubmitting ? "Creating Post..." : "Create Post"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}