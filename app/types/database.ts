// Utility type for Firestore timestamps
//app/types/database.ts
export interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
}

export type FirestoreData = Record<string, any>;
export type NestedComment = Comment & { replies: NestedComment[] };


// User-related types
export interface User {
  id?: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  birthDate: FirestoreTimestamp;
  bio: string;
  profilePhotoUrl: string;
  verification: {
    status: 'verified' | 'pending' | 'rejected';
    method: string;
    documentUrls: string[];
    verificationDate: FirestoreTimestamp;
  };
  createdAt: FirestoreTimestamp;
  lastLogin: FirestoreTimestamp;
  accountStatus: 'active' | 'suspended' | 'deactivated';
  isAdmin?: boolean;
}

// Community-related types
export interface Community {
  id?: string;
  name: string;
  bio: string;
  location: {
    city: string;
    state: string;
    zipCodes: string[];
  };
  stats: {
    memberCount: number;
    verifiedCount: number;
    ghostCount: number;
    lastUpdated: FirestoreTimestamp;
  };
  contractInfo: {
    startDate: FirestoreTimestamp;
    renewalDate: FirestoreTimestamp;
    status: 'active' | 'pending' | 'expired';
  };
  status: 'active' | 'pending' | 'inactive';
  createdAt: FirestoreTimestamp;
}

// Official roles types
export interface OfficialRole {
  id?: string;
  communityId: string;
  title: string;
  displayName: string;
  permissions: {
    canPin: boolean;
    canArchive: boolean;
    canPostEmergency: boolean;
    canModerate: boolean;
  };
  badge: {
    iconUrl: string;
    color: string;
  };
  documentProvidedBy: string;
  documentUploadDate: FirestoreTimestamp;
}

// Community membership types
export interface CommunityMembership {
  id?: string;
  userId: string;
  communityId: string;
  type: 'resident' | 'ghost';
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    verificationDocumentUrls: string[];
  };
  notificationPreferences: {
    emergencyAlerts: boolean;
    generalDiscussion: boolean;
    safetyAndCrime: boolean;
    governance: boolean;
    disasterAndFire: boolean;
    businesses: boolean;
    resourcesAndRecovery: boolean;
    communityEvents: boolean;
    pushNotifications: boolean;
  };
  joinDate: FirestoreTimestamp;
  status: 'active' | 'suspended';
  verificationStatus: 'verified' | 'pending' | 'rejected';
}

// User role assignment
export interface UserRole {
  id?: string;
  userId: string;
  communityId: string;
  roleId: string;
  assignedAt: FirestoreTimestamp;
}

// Post types
export interface Post {
  id?: string;
  authorId: string;
  communityId: string;
  title: string;
  content: string;
  categoryTag: string;
  geographicTag: string;
  mediaUrls: string[];
  stats: {
    upvotes: number;
    downvotes: number;
    commentCount: number;
  };
  author: {
    name: string;
    role: string;
    badgeUrl: string;
    badge?: {  // Add this new optional field
      emoji?: string;
      color?: string;
    };
  };
  status: 'active' | 'archived' | 'pinned';
  pinExpiresAt?: FirestoreTimestamp;
  isEmergency: boolean;
  createdAt: FirestoreTimestamp;
  editedAt?: FirestoreTimestamp;
}

// Comment types
export interface Comment {
  id?: string;
  postId: string;
  authorId: string;
  parentCommentId?: string;
  content: string;
  stats: {
    upvotes: number;
    downvotes: number;
  };
  author: {
    name: string;
    role: string;
    badgeUrl: string;
    badge?: {
      emoji?: string;
      color?: string;
    };
  };
  status: 'active' | 'deleted';
  createdAt: FirestoreTimestamp;
  editedAt?: FirestoreTimestamp;
}

// Activity log types
export interface ActivityLog {
  id?: string;
  userId: string;
  communityId: string;
  type: 'post_create' | 'comment_create' | 'vote' | 'archive' | 'pin';
  targetId: string;
  details: {
    oldStatus?: string;
    newStatus?: string;
    reason?: string;
  };
  createdAt: FirestoreTimestamp;
}

// User vote types
export interface UserVote {
  id?: string;
  userId: string;
  communityId: string;
  targetType: 'post' | 'comment';
  targetId: string;
  voteType: 'upvote' | 'downvote';
  createdAt: FirestoreTimestamp;
}

// Notification types
export interface Notification {
  id: string;
  communityId: string;
  content: {
    body: string;
    sourceCategoryTag: string;
    sourceId: string;
    title: string;
  };
  createdAt: { seconds: number; nanoseconds: number };
  priority: number;
  status: {
    delivered: boolean;
    deliveredAt: { seconds: number; nanoseconds: number };
    read: boolean;
  };
  type: string;
  userId: string;
}


// Database entity collection
export interface DatabaseEntities {
  users: User[];
  communities: Community[];
  official_roles: OfficialRole[];
  community_memberships: CommunityMembership[];
  user_roles: UserRole[];
  posts: Post[];
  comments: Comment[];
  activity_logs: ActivityLog[];
  user_votes: UserVote[];
  notifications: Notification[];
}