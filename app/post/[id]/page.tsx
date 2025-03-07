'use client';

import { Suspense } from 'react';
import { use } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import Image from 'next/image';
import { ThumbsUp, MessageCircle, Flag } from 'lucide-react';

// Type definition for post data
type Post = {
  id: string;
  title: string;
  content: string;
  authorId: string;
  communityId: string;
  categoryTag: string;
  createdAt: {
    seconds: number;
    nanoseconds: number;
  };
  stats: {
    upvotes: number;
    downvotes: number;
    commentCount: number;
  };
  author: {
    name: string;
    role: string;
    badgeUrl: string;
  };
  mediaUrls?: string[];
  isEmergency?: boolean;
};

// Async function to fetch post
async function fetchPost(postId: string): Promise<Post | null> {
  try {
    const postRef = doc(db, 'posts', postId);
    const postSnapshot = await getDoc(postRef);

    if (postSnapshot.exists()) {
      return {
        id: postSnapshot.id,
        ...postSnapshot.data()
      } as Post;
    }
    return null;
  } catch (error) {
    console.error('Error fetching post:', error);
    return null;
  }
}

function PostContent({ postId }: { postId: string }) {
  const post = use(fetchPost(postId));

  // Convert Firestore timestamp to readable date
  const formatDate = (timestamp: { seconds: number }) => {
    return new Date(timestamp.seconds * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!post) {
    return (
      <div className="text-center text-red-500 p-4">
        Post not found
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Emergency Banner */}
      {post.isEmergency && (
        <div className="bg-red-500 text-white text-center font-bold mb-4 py-2 rounded">
          EMERGENCY ALERT
        </div>
      )}

      {/* Post Header */}
      <div className="mb-6">
        <h1 className={`text-3xl font-bold mb-4 ${post.isEmergency ? 'text-red-600' : 'text-gray-800'}`}>
          {post.title}
        </h1>

        {/* Author Information */}
        <div className="flex items-center mb-4">
          {post.author.badgeUrl && (
            <Image 
              src={post.author.badgeUrl} 
              alt={`${post.author.name}'s badge`} 
              width={40} 
              height={40} 
              className="mr-4 rounded-full"
            />
          )}
          <div>
            <p className="font-semibold text-lg">{post.author.name}</p>
            <p className="text-sm text-gray-600">
              {post.author.role} • {formatDate(post.createdAt)}
            </p>
          </div>
        </div>

        {/* Category Tag */}
        <div className="mb-4">
          <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-sm capitalize">
            {post.categoryTag}
          </span>
        </div>
      </div>

      {/* Post Content */}
      <div className="prose max-w-none mb-6">
        {post.content}
      </div>

      {/* Media */}
      {post.mediaUrls && post.mediaUrls.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {post.mediaUrls.map((url, index) => (
            <Image 
              key={index} 
              src={url} 
              alt={`Post media ${index + 1}`} 
              width={500} 
              height={300} 
              className="rounded-lg object-cover"
            />
          ))}
        </div>
      )}

      {/* Post Actions */}
      <div className="flex justify-between items-center border-t pt-4">
        <div className="flex items-center space-x-4">
          <button className="flex items-center space-x-1 text-gray-600 hover:text-blue-600">
            <ThumbsUp size={20} />
            <span>{post.stats.upvotes}</span>
          </button>
          <button className="flex items-center space-x-1 text-gray-600 hover:text-green-600">
            <MessageCircle size={20} />
            <span>{post.stats.commentCount}</span>
          </button>
        </div>
        <button className="text-gray-600 hover:text-red-600">
          <Flag size={20} />
        </button>
      </div>
    </div>
  );
}

export default function PostDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = use(params);

  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-blue-500"></div>
      </div>
    }>
      <PostContent postId={id} />
    </Suspense>
  );
}