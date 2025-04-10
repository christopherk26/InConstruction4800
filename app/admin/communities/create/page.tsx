// ./app/admin/communities/create/page.tsx
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from "@/lib/firebase-client";
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export default function CreateCommunityPage() {
  const router = useRouter();
  const [communityData, setCommunityData] = useState({
    name: '',
    bio: '',
    city: '',
    state: '',
    zipCodes: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const communityRef = collection(db, 'communities');
      const newCommunity = await addDoc(communityRef, {
        name: communityData.name,
        bio: communityData.bio,
        location: {
          city: communityData.city,
          state: communityData.state,
          zipCodes: communityData.zipCodes.split(',').map(zip => zip.trim())
        },
        stats: {
          memberCount: 0,
          verifiedCount: 0,
          ghostCount: 0,
          lastUpdated: serverTimestamp()
        },
        contractInfo: {
          startDate: serverTimestamp(),
          renewalDate: null,
          status: 'active'
        },
        status: 'active',
        createdAt: serverTimestamp()
      });

      router.push(`/admin/communities/manage?newCommunityId=${newCommunity.id}`);
    } catch (error) {
      console.error("Error creating community:", error);
      setError('Failed to create community. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent"></div>
          <p className="text-[var(--foreground)]">Creating community...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <Card className="bg-[var(--card)] border-[var(--border)]">
        <CardHeader>
          <CardTitle>Create New Community</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block mb-2">Community Name</label>
              <Input
                id="name"
                placeholder="Enter community name"
                value={communityData.name}
                onChange={(e) => setCommunityData({...communityData, name: e.target.value})}
                required
              />
            </div>

            <div>
              <label htmlFor="bio" className="block mb-2">Community Description</label>
              <Textarea
                id="bio"
                placeholder="Describe the community"
                value={communityData.bio}
                onChange={(e) => setCommunityData({...communityData, bio: e.target.value})}
                rows={4}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="city" className="block mb-2">City</label>
                <Input
                  id="city"
                  placeholder="Enter city"
                  value={communityData.city}
                  onChange={(e) => setCommunityData({...communityData, city: e.target.value})}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="state" className="block mb-2">State</label>
                <Input
                  id="state"
                  placeholder="Enter state"
                  value={communityData.state}
                  onChange={(e) => setCommunityData({...communityData, state: e.target.value})}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="zipCodes" className="block mb-2">Zip Codes (comma-separated)</label>
              <Input
                id="zipCodes"
                placeholder="90001, 90002, 90003"
                value={communityData.zipCodes}
                onChange={(e) => setCommunityData({...communityData, zipCodes: e.target.value})}
                required
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}

            <Button 
              type="submit" 
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Community'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}