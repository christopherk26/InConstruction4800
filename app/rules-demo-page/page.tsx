"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "../../lib/firebase-client"; // Adjust path as needed

// Define interfaces based on the database schema
interface Post {
  id: string;
  authorId: string;
  communityId: string;
  title: string;
  content: string;
  categoryTag: string;
  geographicTag?: string;
  mediaUrls?: string[];
  stats?: {
    upvotes: number;
    downvotes: number;
    commentCount: number;
  };
  author?: {
    name: string;
    role: string;
    badgeUrl: string;
  };
  status: "active" | "archived" | "pinned";
  pinExpiresAt?: Timestamp;
  isEmergency: boolean;
  createdAt: Timestamp;
  editedAt?: Timestamp;
  // UI-specific properties added client-side
  canEdit?: boolean;
  canPin?: boolean;
  visible?: boolean;
}

export default function RulesDemo() {
  const [userRole, setUserRole] = useState<string>("resident"); // Default role
  const [verificationStatus, setVerificationStatus] = useState<string>("verified");
  const [communityId, setCommunityId] = useState<string>("community1");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Simulates fetching data with different user permissions
  const fetchPosts = async () => {
    setLoading(true);
    try {
      // In a real app, this would use the authenticated user's claims
      // For demo, we'll simulate different access levels
      const postsRef = collection(db, "posts");
      const snapshot = await getDocs(postsRef);
      
      // Filter posts based on role/verification in client
      // (In production, this filtering would happen in Firebase rules)
      const allPosts = snapshot.docs.map(doc => {
        const data = doc.data() as Omit<Post, 'id'>;
        return {
          id: doc.id,
          ...data,
          // Simulate permission checks
          canEdit: userRole === "mayor" || data.authorId === "currentUser",
          canPin: ["mayor", "police_chief", "fire_chief"].includes(userRole),
          visible: data.communityId === communityId || userRole === "mayor"
        } as Post;
      });
      
      setPosts(allPosts);
    } catch (err) {
      console.error("Error fetching posts:", err);
      setError("Error fetching posts. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [userRole, verificationStatus, communityId]);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Town Hall Security Rules Demo</h1>
      
      <div className="mb-8 p-4 bg-blue-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Simulate User Access</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block mb-2">User Role</label>
            <select 
              value={userRole} 
              onChange={(e) => setUserRole(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="resident">Regular Resident</option>
              <option value="mayor">Mayor</option>
              <option value="police_chief">Police Chief</option>
              <option value="fire_chief">Fire Chief</option>
            </select>
          </div>
          
          <div>
            <label className="block mb-2">Verification Status</label>
            <select 
              value={verificationStatus} 
              onChange={(e) => setVerificationStatus(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
              <option value="ghost">Ghost (Non-resident)</option>
            </select>
          </div>
          
          <div>
            <label className="block mb-2">Community</label>
            <select 
              value={communityId} 
              onChange={(e) => setCommunityId(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="community1">Hometown</option>
              <option value="community2">Neighboring City</option>
            </select>
          </div>
        </div>
      </div>
      
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Current Access Level:</h2>
        <div className="p-3 bg-gray-100 rounded">
          <p className="mb-1"><strong>Can post:</strong> {verificationStatus === "verified" ? "Yes" : "No"}</p>
          <p className="mb-1"><strong>Can pin posts:</strong> {["mayor", "police_chief", "fire_chief"].includes(userRole) ? "Yes" : "No"}</p>
          <p className="mb-1"><strong>Can post emergency alerts:</strong> {["mayor", "fire_chief"].includes(userRole) ? "Yes" : "No"}</p>
          <p><strong>Can moderate:</strong> {userRole === "mayor" ? "Yes" : "No"}</p>
        </div>
      </div>
      
      <h2 className="text-xl font-semibold mb-4">Posts Visible to You</h2>
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {posts
            .filter((post): post is Post => post.visible !== undefined && post.visible)
            .map(post => (
              <div key={post.id} className="border p-4 rounded shadow-sm">
                <div className="flex justify-between">
                  <h3 className="font-bold">{post.title}</h3>
                  <div className="text-sm text-gray-600">
                    {post.categoryTag}
                    {post.isEmergency && (
                      <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                        Emergency
                      </span>
                    )}
                  </div>
                </div>
                <p className="my-2">{post.content}</p>
                
                {post.author && (
                  <div className="text-sm text-gray-600 mt-2">
                    Posted by: {post.author.name}
                    {post.author.role && <span> ({post.author.role})</span>}
                  </div>
                )}
                
                <div className="mt-3 flex gap-2">
                  {post.canEdit && (
                    <button className="px-3 py-1 bg-blue-100 rounded text-blue-800 text-sm">
                      Edit
                    </button>
                  )}
                  {post.canPin && (
                    <button className="px-3 py-1 bg-yellow-100 rounded text-yellow-800 text-sm">
                      {post.status === "pinned" ? "Unpin" : "Pin"}
                    </button>
                  )}
                  {userRole === "mayor" && (
                    <button className="px-3 py-1 bg-red-100 rounded text-red-800 text-sm">
                      {post.status === "archived" ? "Restore" : "Archive"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          
          {posts.filter(post => post.visible).length === 0 && (
            <p className="text-gray-500 italic">No posts visible with current permissions</p>
          )}
        </div>
      )}
    </div>
  );
}