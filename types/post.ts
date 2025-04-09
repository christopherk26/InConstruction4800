export interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  author: {
    name: string;
    role: string;
    badge: {
      emoji: string;
      color: string;
    };
  };
  communityId: string;
  communityName: string;
  categoryTag: string;
  geographicTag: string;
  isEmergency: boolean;
  mediaUrls: string[];
  status: 'active' | 'archived' | 'deleted';
  createdAt: Date;
  stats: {
    upvotes: number;
    downvotes: number;
    commentCount: number;
  };
} 