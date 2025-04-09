// ./app/services/communityRoleService.ts
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    writeBatch, 
    doc,
    deleteDoc,
    addDoc,
    Timestamp,
    getDoc,
    setDoc,
    updateDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { CommunityUserRole } from '@/app/types/database';

/**
 * Get a user's role in a specific community
 * @param communityId - ID of the community
 * @param userId - ID of the user
 * @returns Promise with role data or null if not found
 */
export async function getCommunityUserRole(
    communityId: string, 
    userId: string
): Promise<CommunityUserRole | null> {
    try {
        const roleDoc = await getDoc(
            doc(db, 'community_user_roles', `${communityId}_${userId}`)
        );
        
        if (!roleDoc.exists()) {
            return null;
        }
        
        const data = roleDoc.data();
        if (!data.userId || !data.communityId || !data.title || !data.fullName || !data.permissions || !data.assignedAt) {
            console.error('Invalid role data structure:', data);
            return null;
        }

        const role: CommunityUserRole = {
            userId: data.userId,
            communityId: data.communityId,
            title: data.title,
            fullName: data.fullName,
            permissions: {
                canPin: !!data.permissions.canPin,
                canArchive: !!data.permissions.canArchive,
                canPostEmergency: !!data.permissions.canPostEmergency,
                canModerate: !!data.permissions.canModerate
            },
            assignedAt: data.assignedAt
        };

        if (data.badge) {
            role.badge = data.badge;
        }

        return role;
    } catch (error) {
        console.error('Error getting community user role:', error);
        throw error;
    }
}

/**
 * Get all user roles for a specific community
 * @param communityId - ID of the community
 * @returns Promise with array of role data
 */
export async function getCommunityUserRoles(
    communityId: string
): Promise<CommunityUserRole[]> {
    try {
        const rolesRef = collection(db, 'community_user_roles');
        const q = query(rolesRef, where('communityId', '==', communityId));
        const snapshot = await getDocs(q);
        
        const roles: CommunityUserRole[] = [];
        
        for (const doc of snapshot.docs) {
            const data = doc.data();
            if (!data.userId || !data.communityId || !data.title || !data.fullName || !data.permissions || !data.assignedAt) {
                console.error('Invalid role data structure:', data);
                continue;
            }

            const role: CommunityUserRole = {
                userId: data.userId,
                communityId: data.communityId,
                title: data.title,
                fullName: data.fullName,
                permissions: {
                    canPin: !!data.permissions.canPin,
                    canArchive: !!data.permissions.canArchive,
                    canPostEmergency: !!data.permissions.canPostEmergency,
                    canModerate: !!data.permissions.canModerate
                },
                assignedAt: data.assignedAt
            };

            if (data.badge) {
                role.badge = data.badge;
            }

            roles.push(role);
        }

        return roles;
    } catch (error) {
        console.error('Error getting community user roles:', error);
        throw error;
    }
}

/**
 * Assign or update a user's role in a community
 * @param roleData - Role data to assign/update
 * @returns Promise indicating success
 */
export async function assignCommunityUserRole(
    roleData: Omit<CommunityUserRole, 'assignedAt'>
): Promise<boolean> {
    try {
        const docId = `${roleData.communityId}_${roleData.userId}`;
        const roleRef = doc(db, 'community_user_roles', docId);
        
        await setDoc(roleRef, {
            ...roleData,
            assignedAt: Timestamp.now()
        });
        
        return true;
    } catch (error) {
        console.error('Error assigning community user role:', error);
        throw error;
    }
}

/**
 * Update specific fields of a user's role
 * @param communityId - ID of the community
 * @param userId - ID of the user
 * @param updates - Fields to update
 * @returns Promise indicating success
 */
export async function updateCommunityUserRole(
    communityId: string,
    userId: string,
    updates: Partial<Omit<CommunityUserRole, 'userId' | 'communityId' | 'assignedAt'>>
): Promise<boolean> {
    try {
        const docId = `${communityId}_${userId}`;
        const roleRef = doc(db, 'community_user_roles', docId);
        
        await updateDoc(roleRef, {
            ...updates,
            assignedAt: Timestamp.now()
        });
        
        return true;
    } catch (error) {
        console.error('Error updating community user role:', error);
        throw error;
    }
}

/**
 * Remove a user's role from a community
 * @param communityId - ID of the community
 * @param userId - ID of the user
 * @returns Promise indicating success
 */
export async function removeCommunityUserRole(
    communityId: string,
    userId: string
): Promise<boolean> {
    try {
        const docId = `${communityId}_${userId}`;
        const roleRef = doc(db, 'community_user_roles', docId);
        
        await deleteDoc(roleRef);
        return true;
    } catch (error) {
        console.error('Error removing community user role:', error);
        throw error;
    }
}

/**
 * Check if a user has a specific permission in a community
 * @param userId - ID of the user
 * @param communityId - ID of the community
 * @param permission - Permission to check
 * @returns Promise with boolean indicating if user has permission
 */
export async function checkUserPermission(
    userId: string,
    communityId: string,
    permission: keyof CommunityUserRole['permissions']
): Promise<boolean> {
    try {
        const role = await getCommunityUserRole(communityId, userId);
        if (!role) return false;
        
        return role.permissions[permission] || false;
    } catch (error) {
        console.error('Error checking user permission:', error);
        return false;
    }
}