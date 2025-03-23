// app/services/postActionsService.ts
import { 
    doc,
    updateDoc, 
    collection, 
    addDoc, 
    getDoc,
    deleteDoc,
    Timestamp
  } from 'firebase/firestore';
  import { db } from '@/lib/firebase-client';
  import { checkUserPermission } from './userService';
  
  // Validates if the user has permission to perform an action
  // and returns boolean indicating permission status
  export async function validateActionPermission(
    userId: string,
    communityId: string, 
    postId: string,
    actionType: 'delete' | 'archive' | 'pin'
  ): Promise<boolean> {
    try {
      // Get the post to check if user is the author
      const postRef = doc(db, 'posts', postId);
      const postSnap = await getDoc(postRef);
      
      if (!postSnap.exists()) {
        throw new Error('Post not found');
      }
      
      const postData = postSnap.data();
      const isAuthor = postData.authorId === userId;
      
      // Users can always delete their own posts
      if (actionType === 'delete' && isAuthor) {
        return true;
      }
      
      // For other actions, check specific permissions
      let permissionType: 'canPin' | 'canArchive' | 'canModerate';
      
      switch (actionType) {
        case 'pin':
          permissionType = 'canPin';
          break;
        case 'archive':
          permissionType = 'canArchive';
          break;
        case 'delete':
          permissionType = 'canModerate'; // For deleting others' posts
          break;
        default:
          return false;
      }
      
      return await checkUserPermission(userId, communityId, permissionType);
    } catch (error) {
      console.error(`Error validating ${actionType} permission:`, error);
      return false;
    }
  }
  
  // Pin a post (make it stick to the top)
  export async function pinPost(
    userId: string,
    communityId: string,
    postId: string,
    expiryDays: number = 7
  ): Promise<boolean> {
    try {
      // Validate permission
      const hasPermission = await validateActionPermission(
        userId, 
        communityId, 
        postId,
        'pin'
      );
      
      if (!hasPermission) {
        throw new Error('You do not have permission to pin posts');
      }
      
      // Update post status
      const postRef = doc(db, 'posts', postId);
      
      // Calculate pin expiry date
      const now = Timestamp.now();
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + expiryDays);
      const pinExpiresAt = Timestamp.fromDate(expiryDate);
      
      await updateDoc(postRef, {
        status: 'pinned',
        pinExpiresAt,
        editedAt: now
      });
      
      // Log activity
      await addDoc(collection(db, 'activity_logs'), {
        userId,
        communityId,
        type: 'pin',
        targetId: postId,
        details: {
          expiryDate: expiryDate.toISOString()
        },
        createdAt: now
      });
      
      return true;
    } catch (error) {
      console.error('Error pinning post:', error);
      return false;
    }
  }
  
  // Unpin a post (revert to normal)
  export async function unpinPost(
    userId: string,
    communityId: string,
    postId: string
  ): Promise<boolean> {
    try {
      // Validate permission
      const hasPermission = await validateActionPermission(
        userId, 
        communityId, 
        postId,
        'pin'
      );
      
      if (!hasPermission) {
        throw new Error('You do not have permission to unpin posts');
      }
      
      // Update post status
      const postRef = doc(db, 'posts', postId);
      
      await updateDoc(postRef, {
        status: 'active',
        pinExpiresAt: null,
        editedAt: Timestamp.now()
      });
      
      // Log activity
      await addDoc(collection(db, 'activity_logs'), {
        userId,
        communityId,
        type: 'unpin',
        targetId: postId,
        createdAt: Timestamp.now()
      });
      
      return true;
    } catch (error) {
      console.error('Error unpinning post:', error);
      return false;
    }
  }
  
  // Archive a post
  export async function archivePost(
    userId: string,
    communityId: string,
    postId: string,
    reason?: string
  ): Promise<boolean> {
    try {
      // Validate permission
      const hasPermission = await validateActionPermission(
        userId, 
        communityId, 
        postId,
        'archive'
      );
      
      if (!hasPermission) {
        throw new Error('You do not have permission to archive posts');
      }
      
      // Update post status
      const postRef = doc(db, 'posts', postId);
      const now = Timestamp.now();
      
      await updateDoc(postRef, {
        status: 'archived',
        editedAt: now
      });
      
      // Log activity
      await addDoc(collection(db, 'activity_logs'), {
        userId,
        communityId,
        type: 'archive',
        targetId: postId,
        details: {
          oldStatus: 'active',
          newStatus: 'archived',
          reason: reason || ''
        },
        createdAt: now
      });
      
      return true;
    } catch (error) {
      console.error('Error archiving post:', error);
      return false;
    }
  }
  
  // Unarchive a post (revert to active)
  export async function unarchivePost(
    userId: string,
    communityId: string,
    postId: string
  ): Promise<boolean> {
    try {
      // Validate permission
      const hasPermission = await validateActionPermission(
        userId, 
        communityId, 
        postId,
        'archive'
      );
      
      if (!hasPermission) {
        throw new Error('You do not have permission to unarchive posts');
      }
      
      // Update post status
      const postRef = doc(db, 'posts', postId);
      const now = Timestamp.now();
      
      await updateDoc(postRef, {
        status: 'active',
        editedAt: now
      });
      
      // Log activity
      await addDoc(collection(db, 'activity_logs'), {
        userId,
        communityId,
        type: 'unarchive',
        targetId: postId,
        details: {
          oldStatus: 'archived',
          newStatus: 'active'
        },
        createdAt: now
      });
      
      return true;
    } catch (error) {
      console.error('Error unarchiving post:', error);
      return false;
    }
  }
  
  // Delete a post (hard delete)
  export async function deletePost(
    userId: string,
    communityId: string,
    postId: string
  ): Promise<boolean> {
    try {
      // Validate permission (either owner or moderator)
      const hasPermission = await validateActionPermission(
        userId, 
        communityId, 
        postId,
        'delete'
      );
      
      if (!hasPermission) {
        throw new Error('You do not have permission to delete this post');
      }
      
      // Get the post data for logging
      const postRef = doc(db, 'posts', postId);
      const postSnap = await getDoc(postRef);
      
      if (!postSnap.exists()) {
        throw new Error('Post not found');
      }
      
      // Hard delete by removing the document
      await deleteDoc(postRef);
      
      // Log activity
      await addDoc(collection(db, 'activity_logs'), {
        userId,
        communityId,
        type: 'delete',
        targetId: postId,
        createdAt: Timestamp.now()
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting post:', error);
      return false;
    }
  }