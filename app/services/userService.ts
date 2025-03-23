// app/services/userService.ts
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  Timestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { FirestoreData } from '@/app/types';
import { UserModel } from '@/app/models/UserModel';
import { User } from '@/app/types/database';
import { OfficialRole, UserRole } from '@/app/types/database';


/**
 * Fetch all users who are members of a specific community
 * 
 * @param communityId - ID of the community to fetch users for
 * @returns Promise containing array of user data
 */
export async function getCommunityUsers(communityId: string): Promise<User[]> {
  try {
    // First, get the community memberships to find user IDs
    const membershipRef = collection(db, 'community_memberships');
    const q = query(
      membershipRef,
      where('communityId', '==', communityId),
      where('status', '==', 'active')
    );
    const snapshot = await getDocs(q);

    // Extract user IDs from memberships
    const userIds = snapshot.docs.map(doc => doc.data().userId);

    if (userIds.length === 0) {
      return [];
    }

    // Fetch user details for each user ID
    // Note: Firestore 'in' queries are limited to 10 items per batch
    const userBatches = [];
    for (let i = 0; i < userIds.length; i += 10) {
      const batchIds = userIds.slice(i, i + 10);
      const usersRef = collection(db, 'users');
      const userQuery = query(usersRef, where('__name__', 'in', batchIds));
      userBatches.push(getDocs(userQuery));
    }

    // Execute all batch queries
    const batchResults = await Promise.all(userBatches);

    // Combine results from all batches and properly type them
    const users = batchResults.flatMap(querySnapshot =>
      querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as User))
    );

    // Sort users by name for consistent display
    return users.sort((a, b) => {
      const nameA = `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase();
      const nameB = `${b.firstName || ''} ${b.lastName || ''}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  } catch (error) {
    console.error('Error fetching community users:', error);
    throw error;
  }
}

/**
 * Get detailed user profile information
 * 
 * @param userId - ID of the user to fetch
 * @returns Promise with user data or null if not found
 */
export async function getUserProfile(userId: string): Promise<User | null> {
  try {
    const user = await UserModel.getById(userId);
    if (!user) return null;

    // Return a plain object version of the user data
    return user.toJSON() as User;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
}

/**
 * Get a user's role within a specific community
 * 
 * @param userId - ID of the user
 * @param communityId - ID of the community
 * @returns Promise with role data or null if no role found
 */
export async function getUserCommunityRole(userId: string, communityId: string): Promise<FirestoreData | null> {
  try {
    const userRolesRef = collection(db, 'user_roles');
    const q = query(
      userRolesRef,
      where('userId', '==', userId),
      where('communityId', '==', communityId)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const userRole = snapshot.docs[0].data();

    // Get the role details
    const roleRef = doc(db, 'official_roles', userRole.roleId);
    const roleSnap = await getDoc(roleRef);

    if (!roleSnap.exists()) return null;

    return {
      ...userRole,
      roleDetails: {
        id: roleSnap.id,
        ...roleSnap.data(),
        badge: {
          emoji: roleSnap.data().badge?.iconUrl || '',
          color: roleSnap.data().badge?.color || ''
        }
      }
    };
  } catch (error) {
    console.error('Error fetching user community role:', error);
    throw error;
  }
}
/**
 * Get a user's posts within a community
 * 
 * @param userId - ID of the user
 * @param communityId - ID of the community
 * @param maxPosts - Maximum number of posts to return (default: 5)
 * @returns Promise with array of post data
 */
export async function getUserCommunityPosts(
  userId: string,
  communityId: string,
  maxPosts: number = 5
): Promise<FirestoreData[]> {
  try {
    const postsRef = collection(db, 'posts');
    const q = query(
      postsRef,
      where('authorId', '==', userId),
      where('communityId', '==', communityId),
      where('status', 'in', ['active', 'pinned']),
      orderBy('createdAt', 'desc'),
      limit(maxPosts)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching user community posts:', error);
    throw error;
  }
}

export async function checkUserPermission(
  userId: string,
  communityId: string,
  permissionType: 'canPin' | 'canArchive' | 'canPostEmergency' | 'canModerate'
): Promise<boolean> {
  try {
    // Find user's role in this community
    const userRoleQuery = query(
      collection(db, 'user_roles'),
      where('userId', '==', userId),
      where('communityId', '==', communityId)
    );
    const userRoleSnapshot = await getDocs(userRoleQuery);

    // If no role found, return false
    if (userRoleSnapshot.empty) return false;

    // Get the role ID
    const userRole = userRoleSnapshot.docs[0].data() as UserRole;

    // Find the corresponding official role
    const officialRoleDoc = await getDoc(
      doc(db, 'official_roles', userRole.roleId)
    );

    // If official role not found, return false
    if (!officialRoleDoc.exists()) return false;

    // Check the specific permission
    const roleData = officialRoleDoc.data() as OfficialRole;
    return roleData.permissions[permissionType] === true;

  } catch (error) {
    console.error("Error checking user permission:", error);
    return false;
  }
}