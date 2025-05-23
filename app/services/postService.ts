// app/services/postService.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
  startAfter,
  DocumentSnapshot,
  increment,
  runTransaction
} from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { FirestoreData, Post, Comment, UserVote } from '@/app/types/database';

/**
 * Get a specific post by ID
 * 
 * @param communityId - ID of the community the post belongs to
 * @param postId - ID of the post to fetch
 * @returns Promise with post data or null if not found
 */
export async function getPostById(communityId: string, postId: string): Promise<FirestoreData | null> {
  try {
    const docRef = doc(db, 'posts', postId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      // Verify the post belongs to the specified community
      const post = docSnap.data();
      if (post.communityId === communityId) {
        return {
          id: docSnap.id,
          ...post
        };
      }
    }
    return null;
  } catch (error) {
    console.error('Error fetching post by ID:', error);
    throw error;
  }
}

/**
 * Get comments for a specific post with nested replies (max 3 levels deep)
 * 
 * @param postId - ID of the post to fetch comments for
 * @returns Promise with array of comments and their nested replies
 */
export async function getPostComments(
  postId: string
): Promise<(Comment & { replies: Comment[] })[]> {
  try {
    const commentsRef = collection(db, 'comments');

    const q = query(
      commentsRef,
      where('postId', '==', postId),
      where('status', '==', 'active'),
      orderBy('createdAt', 'asc')
    );

    const snapshot = await getDocs(q);
    const allComments = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...(data as Comment),
        id: doc.id,
        replies: [] // Initialize empty replies array
      };
    });

    // Create a map for quick comment lookup
    const commentMap = new Map<string, Comment & { replies: Comment[] }>();
    allComments.forEach(comment => {
      commentMap.set(comment.id!, comment);
    });

    // Build the comment tree
    const topLevelComments: (Comment & { replies: Comment[] })[] = [];

    allComments.forEach(comment => {
      const parentId = comment.parentCommentId;

      if (parentId) {
        // This is a reply
        const parentComment = commentMap.get(parentId);
        if (parentComment) {
          // Only add if we haven't exceeded 3 levels
          const depth = getCommentDepth(parentComment, commentMap);
          if (depth < 3) {
            parentComment.replies.push(comment);
          }
        }
      } else {
        // This is a top-level comment
        topLevelComments.push(comment);
      }
    });

    return topLevelComments;
  } catch (error) {
    console.error('Error fetching post comments:', error);
    throw error;
  }
}

/**
 * Helper function to calculate the depth of a comment in the tree
 */
function getCommentDepth(
  comment: Comment & { replies: Comment[] },
  commentMap: Map<string, Comment & { replies: Comment[] }>,
  currentDepth: number = 0
): number {
  if (currentDepth >= 3) return currentDepth;

  let maxDepth = currentDepth;
  comment.replies.forEach(reply => {
    const replyComment = commentMap.get(reply.id!);
    if (replyComment) {
      const depth = getCommentDepth(replyComment, commentMap, currentDepth + 1);
      maxDepth = Math.max(maxDepth, depth);
    }
  });

  return maxDepth;
}

/**
 * Create a new post
 * 
 * @param postData - Data for the new post
 * @returns Promise with the created post data
 */
export async function createPost(postData: Omit<Post, 'id' | 'createdAt' | 'stats'>): Promise<FirestoreData> {
  try {
    console.log("Creating post with author data:", postData.author);

    // Get the user's role document using the composite key
    const roleDoc = await getDoc(
      doc(db, 'community_user_roles', `${postData.communityId}_${postData.authorId}`)
    );

    let roleDetails = null;
    if (roleDoc.exists()) {
      const roleData = roleDoc.data();
      roleDetails = {
        title: roleData.title || 'Member',
        badge: {
          emoji: roleData.badge?.emoji || '',
          color: roleData.badge?.color || ''
        }
      };
    }

    console.log("Final role details:", roleDetails);

    const newPost = {
      ...postData,
      createdAt: Timestamp.now(),
      status: 'active',
      stats: {
        upvotes: 0,
        downvotes: 0,
        commentCount: 0
      },
      author: {
        ...postData.author,
        role: roleDetails?.title || 'Member',
        badge: {
          emoji: roleDetails?.badge?.emoji || '',
          color: roleDetails?.badge?.color || ''
        }
      }
    };

    console.log("Final post author data:", newPost.author);

    // Add the post to Firestore
    const docRef = await addDoc(collection(db, 'posts'), newPost);

    // Log activity
    await addDoc(collection(db, 'activity_logs'), {
      userId: postData.authorId,
      communityId: postData.communityId,
      type: 'post_create',
      targetId: docRef.id,
      details: {},
      createdAt: Timestamp.now()
    });

    // Return the created post with its ID
    return {
      id: docRef.id,
      ...newPost
    };
  } catch (error) {
    console.error('Error creating post:', error);
    throw error;
  }
}

/**
 * Create a new comment
 * 
 * @param commentData - Data for the new comment
 * @returns Promise with the created comment data
 */
export async function createComment(
  commentData: {
    postId: string,
    authorId: string,
    content: string,
    parentCommentId?: string,
    author: {
      name: string,
      role?: string,
      badgeUrl?: string
    }
  }
): Promise<FirestoreData> {
  try {
    // Get post to check if it exists and to get communityId
    const postRef = doc(db, 'posts', commentData.postId);
    const postSnap = await getDoc(postRef);

    if (!postSnap.exists()) {
      throw new Error('Post not found');
    }

    const postData = postSnap.data();
    const communityId = postData.communityId;

    // REPLACE THIS SECTION - Get the user's role using the same approach as createPost
    // Get the user's role document using the composite key
    const roleDoc = await getDoc(
      doc(db, 'community_user_roles', `${communityId}_${commentData.authorId}`)
    );

    let roleDetails = null;
    if (roleDoc.exists()) {
      const roleData = roleDoc.data();
      roleDetails = {
        title: roleData.title || 'Member',
        badge: {
          emoji: roleData.badge?.emoji || '',
          color: roleData.badge?.color || ''
        }
      };
    }

    // Set default values
    const now = Timestamp.now();
    const newComment = {
      postId: commentData.postId,
      authorId: commentData.authorId,
      parentCommentId: commentData.parentCommentId || null,
      communityId: communityId,
      content: commentData.content,
      author: {
        ...commentData.author,
        role: roleDetails?.title || commentData.author.role || 'Member',
        badge: {
          emoji: roleDetails?.badge?.emoji || '',
          color: roleDetails?.badge?.color || ''
        }
      },
      stats: {
        upvotes: 0,
        downvotes: 0
      },
      status: 'active',
      createdAt: now
    };

    // Start a transaction to create comment and update post
    const commentRef = await addDoc(collection(db, 'comments'), newComment);

    // Increment comment count on post
    await updateDoc(postRef, {
      'stats.commentCount': increment(1)
    });

    // Log activity
    await addDoc(collection(db, 'activity_logs'), {
      userId: commentData.authorId,
      communityId: communityId,
      type: 'comment_create',
      targetId: commentData.postId,
      details: {
        commentId: commentRef.id
      },
      createdAt: now
    });

    // Return the created comment with its ID
    return {
      id: commentRef.id,
      ...newComment
    };
  } catch (error) {
    console.error('Error creating comment:', error);
    throw error;
  }
}

/**
 * Vote on a post (upvote or downvote)
 * 
 * @param postId - ID of the post to vote on
 * @param userId - ID of the user voting
 * @param communityId - ID of the community the post belongs to
 * @param voteType - Type of vote ('upvote' or 'downvote')
 * @returns Promise with the updated post data
 */
export async function voteOnPost(
  postId: string,
  userId: string,
  communityId: string,
  voteType: 'upvote' | 'downvote'
): Promise<FirestoreData | null> {
  try {
    // Check if user has already voted on this post
    const votesRef = collection(db, 'user_votes');
    const q = query(
      votesRef,
      where('userId', '==', userId),
      where('targetId', '==', postId),
      where('targetType', '==', 'post')
    );

    const voteQuerySnapshot = await getDocs(q);
    const now = Timestamp.now();

    // Handle transaction to update votes
    return await runTransaction(db, async (transaction) => {
      const postRef = doc(db, 'posts', postId);
      const postDoc = await transaction.get(postRef);

      if (!postDoc.exists()) {
        throw new Error('Post not found');
      }

      const postData = postDoc.data() as Post;
      const currentStats = postData.stats || { upvotes: 0, downvotes: 0, commentCount: 0 };
      let newStats = { ...currentStats };

      // If user has already voted
      if (!voteQuerySnapshot.empty) {
        const existingVote = voteQuerySnapshot.docs[0];
        const existingVoteData = existingVote.data() as UserVote;
        const existingVoteType = existingVoteData.voteType;

        // If same vote type, remove the vote
        if (existingVoteType === voteType) {
          // Remove vote document
          transaction.delete(doc(db, 'user_votes', existingVote.id));

          // Update post stats
          if (voteType === 'upvote') {
            newStats.upvotes = Math.max(0, currentStats.upvotes - 1);
          } else {
            newStats.downvotes = Math.max(0, currentStats.downvotes - 1);
          }
        }
        // If different vote type, change the vote
        else {
          // Update vote document
          transaction.update(doc(db, 'user_votes', existingVote.id), {
            voteType: voteType,
            createdAt: now
          });

          // Update post stats
          if (voteType === 'upvote') {
            newStats.upvotes = currentStats.upvotes + 1;
            newStats.downvotes = Math.max(0, currentStats.downvotes - 1);
          } else {
            newStats.downvotes = currentStats.downvotes + 1;
            newStats.upvotes = Math.max(0, currentStats.upvotes - 1);
          }
        }
      }
      // If user hasn't voted yet
      else {
        // Create new vote document
        const newVote: UserVote = {
          userId,
          communityId,
          targetType: 'post',
          targetId: postId,
          voteType,
          createdAt: now
        };

        const newVoteRef = doc(collection(db, 'user_votes'));
        transaction.set(newVoteRef, newVote);

        // Update post stats
        if (voteType === 'upvote') {
          newStats.upvotes = currentStats.upvotes + 1;
        } else {
          newStats.downvotes = currentStats.downvotes + 1;
        }
      }

      // Update the post with new stats
      transaction.update(postRef, { stats: newStats });

      // Log activity
      const activityLogRef = doc(collection(db, 'activity_logs'));
      transaction.set(activityLogRef, {
        userId,
        communityId,
        type: 'vote',
        targetId: postId,
        details: { voteType },
        createdAt: now
      });

      // Return updated post data
      return {
        id: postId,
        ...postData,
        stats: newStats
      };
    });
  } catch (error) {
    console.error('Error voting on post:', error);
    throw error;
  }
}

/**
 * Archive a post (soft delete by changing status)
 * 
 * @param postId - ID of the post to archive
 * @param userId - ID of the user archiving the post
 * @param reason - Optional reason for archiving
 * @returns Promise indicating success
 */
export async function archivePost(
  postId: string,
  userId: string,
  reason?: string
): Promise<boolean> {
  try {
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);

    if (!postSnap.exists()) {
      throw new Error('Post not found');
    }

    const postData = postSnap.data();

    // Check if user is authorized (post author or has moderation privileges)
    if (postData.authorId !== userId) {
      // TODO: Check if user has moderation rights
      throw new Error('Not authorized to archive this post');
    }

    // Soft delete by updating status
    await updateDoc(postRef, {
      status: 'archived',
      editedAt: Timestamp.now()
    });

    // Log activity
    await addDoc(collection(db, 'activity_logs'), {
      userId,
      communityId: postData.communityId,
      type: 'archive',
      targetId: postId,
      details: {
        oldStatus: 'active',
        newStatus: 'archived',
        reason: reason || ''
      },
      createdAt: Timestamp.now()
    });

    return true;
  } catch (error) {
    console.error('Error archiving post:', error);
    throw error;
  }
}

// Rename the existing deletePost function to maintain backward compatibility
// but mark it as deprecated
/**
 * @deprecated Use archivePost instead - this function performs a soft delete\
 * to do a complete delete, use the deletepost function in postActionsService.tsx
 */
export async function deletePost(
  postId: string,
  userId: string,
  reason?: string
): Promise<boolean> {
  return archivePost(postId, userId, reason);
}

/**
 * Pin a post to the top of the community
 * 
 * @param postId - ID of the post to pin
 * @param userId - ID of the user pinning the post
 * @param expiryDays - Number of days the pin should last
 * @returns Promise with the updated post data
 */
export async function pinPost(
  postId: string,
  userId: string,
  expiryDays: number = 7
): Promise<FirestoreData | null> {
  try {
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);

    if (!postSnap.exists()) {
      throw new Error('Post not found');
    }

    const postData = postSnap.data();

    // TODO: Check if user has pin privileges
    // For proper implementation, check user roles

    // Calculate pin expiry date
    const now = Timestamp.now();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiryDays);
    const pinExpiresAt = Timestamp.fromDate(expiryDate);

    // Update post status
    await updateDoc(postRef, {
      status: 'pinned',
      pinExpiresAt,
      editedAt: now
    });

    // Log activity
    await addDoc(collection(db, 'activity_logs'), {
      userId,
      communityId: postData.communityId,
      type: 'pin',
      targetId: postId,
      details: {
        oldStatus: postData.status,
        newStatus: 'pinned',
        expiryDate: expiryDate.toISOString()
      },
      createdAt: now
    });

    // Return updated post data
    return {
      id: postId,
      ...postData,
      status: 'pinned',
      pinExpiresAt,
      editedAt: now
    };
  } catch (error) {
    console.error('Error pinning post:', error);
    throw error;
  }
}

/**
 * Get a user's voting history for a list of posts
 * 
 * @param userId - User ID to check votes for
 * @param postIds - Array of post IDs to check
 * @returns Promise with map of postId to vote type
 */
export async function getUserVotesForPosts(
  userId: string,
  postIds: string[]
): Promise<Record<string, 'upvote' | 'downvote'>> {
  if (postIds.length === 0) return {};

  try {
    const votesRef = collection(db, 'user_votes');

    // Query for this user's votes on the specified posts
    const q = query(
      votesRef,
      where('userId', '==', userId),
      where('targetType', '==', 'post'),
      where('targetId', 'in', postIds)
    );

    const snapshot = await getDocs(q);

    // Create a map of postId -> voteType
    const voteMap: Record<string, 'upvote' | 'downvote'> = {};

    snapshot.docs.forEach(doc => {
      const vote = doc.data();
      voteMap[vote.targetId] = vote.voteType;
    });

    return voteMap;
  } catch (error) {
    console.error('Error fetching user votes:', error);
    return {};
  }
}

/**
* Fetch posts for a specific community with optional filtering and sorting
* 
* @param communityId - ID of the community to fetch posts for
* @param options - Optional parameters for filtering and sorting
* @returns Promise containing array of post data and last visible document for pagination
*/
export async function getCommunityPosts(
  communityId: string,
  options?: {
    sortBy?: 'recent' | 'upvoted' | 'trending',
    categoryTag?: string,
    limit?: number,
    lastVisible?: DocumentSnapshot
  }
): Promise<{ posts: FirestoreData[], lastVisible: DocumentSnapshot | null }> {
  try {
    const postsRef = collection(db, 'posts');

    // Start with filtering by communityId and active status
    let q = query(
      postsRef,
      where('communityId', '==', communityId),
      where('status', 'in', ['active', 'pinned'])
    );

    // Apply category filter if provided
    if (options?.categoryTag) {
      q = query(q, where('categoryTag', '==', options.categoryTag));
    }

    // Apply sorting based on the requested sort type
    if (options?.sortBy === 'upvoted') {
      q = query(q, orderBy('stats.upvotes', 'desc'), orderBy('createdAt', 'desc'));
    } else if (options?.sortBy === 'trending') {
      // A simple trending algorithm: high engagement (upvotes + comments) in recent time
      q = query(q, orderBy('stats.upvotes', 'desc'), orderBy('stats.commentCount', 'desc'), orderBy('createdAt', 'desc'));
    } else {
      // Default sort is by most recent
      q = query(q, orderBy('createdAt', 'desc'));
    }

    // For pagination, start after the last visible document if provided
    if (options?.lastVisible) {
      q = query(q, startAfter(options.lastVisible));
    }

    // Apply limit if provided
    if (options?.limit) {
      q = query(q, limit(options.limit));
    }

    // Execute the query
    const snapshot = await getDocs(q);

    // Get the last visible document for pagination
    const lastVisible = snapshot.docs.length > 0 ?
      snapshot.docs[snapshot.docs.length - 1] : null;

    // Map documents to our data format
    const posts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return { posts, lastVisible };
  } catch (error) {
    console.error('Error fetching community posts:', error);
    throw error;
  }
}

/**
 * Delete a comment and all its replies, and update the post's comment count
 * 
 * @param commentId - ID of the comment to delete
 * @param userId - ID of the user deleting the comment
 * @param communityId - ID of the community
 * @returns Promise indicating success
 */
export async function deleteComment(
  commentId: string,
  userId: string,
  communityId: string
): Promise<boolean> {
  try {
    // First get the comment to check authorization and get postId
    const commentRef = doc(db, 'comments', commentId);
    const commentSnap = await getDoc(commentRef);
    
    if (!commentSnap.exists()) {
      throw new Error('Comment not found');
    }
    
    const commentData = commentSnap.data();
    
    // Check if user is authorized (comment author)
    if (commentData.authorId !== userId) {
      throw new Error('Not authorized to delete this comment');
    }
    
    const postId = commentData.postId;
    if (!postId) {
      throw new Error('Invalid comment data: missing postId');
    }
    
    // Find all replies to this comment (recursively)
    const deletedCommentIds = await findAllReplies(commentId);
    
    // Add the original comment to the list
    deletedCommentIds.push(commentId);
    
    // Start a transaction for deleting comments and updating post count
    return await runTransaction(db, async (transaction) => {
      // Get the post reference for updating
      const postRef = doc(db, 'posts', postId);
      const postSnap = await transaction.get(postRef);
      
      if (!postSnap.exists()) {
        throw new Error('Associated post not found');
      }
      
      // Delete all comments (the original and all replies)
      for (const id of deletedCommentIds) {
        const ref = doc(db, 'comments', id);
        transaction.delete(ref);
      }
      
      // Update the post's comment count
      const totalDeleted = deletedCommentIds.length;
      transaction.update(postRef, {
        'stats.commentCount': increment(-totalDeleted)
      });
      
      // Log activity
      const activityLogRef = doc(collection(db, 'activity_logs'));
      transaction.set(activityLogRef, {
        userId,
        communityId,
        type: 'comment_delete',
        targetId: commentId,
        details: {
          postId,
          totalCommentsDeleted: totalDeleted
        },
        createdAt: Timestamp.now()
      });
      
      return true;
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
}

/**
 * Helper function to find all replies to a comment recursively
 * This doesn't use a transaction so we avoid type issues
 * 
 * @param parentCommentId - ID of the parent comment
 * @returns Promise with array of reply comment IDs
 */
async function findAllReplies(parentCommentId: string): Promise<string[]> {
  const replyIds: string[] = [];
  
  // Query for direct replies to this comment
  const repliesQuery = query(
    collection(db, 'comments'),
    where('parentCommentId', '==', parentCommentId)
  );
  
  const repliesSnapshot = await getDocs(repliesQuery);
  
  // For each direct reply, recursively find its replies
  for (const replyDoc of repliesSnapshot.docs) {
    const replyId = replyDoc.id;
    replyIds.push(replyId);
    
    // Recursively find replies to this reply
    const nestedReplies = await findAllReplies(replyId);
    replyIds.push(...nestedReplies);
  }
  
  return replyIds;
}
/**
 * Recalculate and update a post's comment count based on actual comment data
 * This can be used for maintenance or fixing inconsistent counts
 * 
 * @param postId - ID of the post to update
 * @returns Promise with the updated count
 */
export async function recalculatePostCommentCount(postId: string): Promise<number> {
  try {
    // Query for all active comments for this post
    const commentsQuery = query(
      collection(db, 'comments'),
      where('postId', '==', postId)
    );
    
    const commentsSnapshot = await getDocs(commentsQuery);
    const commentCount = commentsSnapshot.size;
    
    // Update the post with the correct count
    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, {
      'stats.commentCount': commentCount
    });
    
    return commentCount;
  } catch (error) {
    console.error('Error recalculating comment count:', error);
    throw error;
  }
}

/**
 * Vote on a comment (upvote or downvote)
 * 
 * @param commentId - ID of the comment to vote on
 * @param userId - ID of the user voting
 * @param communityId - ID of the community
 * @param voteType - Type of vote ('upvote' or 'downvote')
 * @returns Promise with the updated comment data
 */
export async function voteOnComment(
  commentId: string,
  userId: string,
  communityId: string,
  voteType: 'upvote' | 'downvote'
): Promise<Comment | null> {
  try {
    // Check if user has already voted on this comment
    const votesRef = collection(db, 'user_votes');
    const q = query(
      votesRef,
      where('userId', '==', userId),
      where('targetId', '==', commentId),
      where('targetType', '==', 'comment')
    );

    const voteQuerySnapshot = await getDocs(q);
    const now = Timestamp.now();

    // Handle transaction to update votes
    return await runTransaction(db, async (transaction) => {
      const commentRef = doc(db, 'comments', commentId);
      const commentDoc = await transaction.get(commentRef);

      if (!commentDoc.exists()) {
        throw new Error('Comment not found');
      }

      const commentData = commentDoc.data() as Comment;
      const currentStats = commentData.stats || { upvotes: 0, downvotes: 0 };
      let newStats = { ...currentStats };

      // If user has already voted
      if (!voteQuerySnapshot.empty) {
        const existingVote = voteQuerySnapshot.docs[0];
        const existingVoteData = existingVote.data() as UserVote;
        const existingVoteType = existingVoteData.voteType;

        // If same vote type, remove the vote
        if (existingVoteType === voteType) {
          // Remove vote document
          transaction.delete(doc(db, 'user_votes', existingVote.id));

          // Update comment stats
          if (voteType === 'upvote') {
            newStats.upvotes = Math.max(0, currentStats.upvotes - 1);
          } else {
            newStats.downvotes = Math.max(0, currentStats.downvotes - 1);
          }
        }
        // If different vote type, change the vote
        else {
          // Update vote document
          transaction.update(doc(db, 'user_votes', existingVote.id), {
            voteType: voteType,
            createdAt: now
          });

          // Update comment stats
          if (voteType === 'upvote') {
            newStats.upvotes = currentStats.upvotes + 1;
            newStats.downvotes = Math.max(0, currentStats.downvotes - 1);
          } else {
            newStats.downvotes = currentStats.downvotes + 1;
            newStats.upvotes = Math.max(0, currentStats.upvotes - 1);
          }
        }
      }
      // If user hasn't voted yet
      else {
        // Create new vote document
        const newVote: UserVote = {
          userId,
          communityId,
          targetType: 'comment',
          targetId: commentId,
          voteType,
          createdAt: now
        };

        const newVoteRef = doc(collection(db, 'user_votes'));
        transaction.set(newVoteRef, newVote);

        // Update comment stats
        if (voteType === 'upvote') {
          newStats.upvotes = currentStats.upvotes + 1;
        } else {
          newStats.downvotes = currentStats.downvotes + 1;
        }
      }

      // Update the comment with new stats
      transaction.update(commentRef, { stats: newStats });

      // Log activity
      const activityLogRef = doc(collection(db, 'activity_logs'));
      transaction.set(activityLogRef, {
        userId,
        communityId,
        type: 'vote',
        targetId: commentId,
        details: { voteType },
        createdAt: now
      });

      // Return updated comment data
      return {
        ...commentData,
        stats: newStats
      };
    });
  } catch (error) {
    console.error('Error voting on comment:', error);
    throw error;
  }
}

/**
 * Get a user's voting history for a list of comments
 * 
 * @param userId - User ID to check votes for
 * @param commentIds - Array of comment IDs to check
 * @returns Promise with map of commentId to vote type
 */
export async function getUserVotesForComments(
  userId: string,
  commentIds: string[]
): Promise<Record<string, 'upvote' | 'downvote'>> {
  if (commentIds.length === 0) return {};

  try {
    const votesRef = collection(db, 'user_votes');

    // Query for this user's votes on the specified comments
    const q = query(
      votesRef,
      where('userId', '==', userId),
      where('targetType', '==', 'comment'),
      where('targetId', 'in', commentIds)
    );

    const snapshot = await getDocs(q);

    // Create a map of commentId -> voteType
    const voteMap: Record<string, 'upvote' | 'downvote'> = {};

    snapshot.docs.forEach(doc => {
      const vote = doc.data();
      voteMap[vote.targetId] = vote.voteType;
    });

    return voteMap;
  } catch (error) {
    console.error('Error fetching user votes for comments:', error);
    return {};
  }
}