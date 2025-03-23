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
    getDoc
  } from 'firebase/firestore';
  import { db } from '@/lib/firebase-client';
  import { OfficialRole, UserRole } from '@/app/types/database';
  import { UserModel } from '@/app/models/UserModel';
  
  export async function processCommunityRolesFromCSV(
    communityId: string, 
    csvData: any[]
  ): Promise<{ officialRoles: OfficialRole[], userRoles: UserRole[] }> {
    const batch = writeBatch(db);
    const officialRoles: OfficialRole[] = [];
    const userRoles: UserRole[] = [];
  
    // First, delete existing roles for this community
    const officialRolesQuery = query(
      collection(db, 'official_roles'), 
      where('communityId', '==', communityId)
    );
    const userRolesQuery = query(
      collection(db, 'user_roles'), 
      where('communityId', '==', communityId)
    );
  
    const officialRolesSnapshot = await getDocs(officialRolesQuery);
    const userRolesSnapshot = await getDocs(userRolesQuery);
  
    // Delete existing roles
    officialRolesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    userRolesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
  
    // Process each row in the CSV
    for (const row of csvData) {
      // Find user by email
      const userQuery = query(
        collection(db, 'users'), 
        where('email', '==', row.email)
      );
      const userSnapshot = await getDocs(userQuery);
  
      if (!userSnapshot.empty) {
        const userId = userSnapshot.docs[0].id;
  
        // Create Official Role
        const officialRoleRef = doc(collection(db, 'official_roles'));
        const officialRole: OfficialRole = {
          communityId,
          title: row.role_title,
          displayName: row.full_name,
          permissions: {
            canPin: row.can_pin === 'true',
            canArchive: row.can_archive === 'true',
            canPostEmergency: row.can_post_emergency === 'true',
            canModerate: row.can_moderate === 'true'
          },
          badge: {
            iconUrl: row.badge_emoji || '', 
            color: row.badge_color || '#000000'
          },
          documentProvidedBy: 'CSV Upload',
          documentUploadDate: {
            seconds: Math.floor(Date.now() / 1000),
            nanoseconds: 0
          }
        };
        batch.set(officialRoleRef, officialRole);
        officialRoles.push({ ...officialRole, id: officialRoleRef.id });
  
        // Create User Role
        const userRoleRef = doc(collection(db, 'user_roles'));
        const userRole: UserRole = {
          userId,
          communityId,
          roleId: officialRoleRef.id,
          assignedAt: {
            seconds: Math.floor(Date.now() / 1000),
            nanoseconds: 0
          }
        };
        batch.set(userRoleRef, userRole);
        userRoles.push({ ...userRole, id: userRoleRef.id });
      }
    }
  
    // Commit the batch
    await batch.commit();
  
    return { officialRoles, userRoles };
  }
  
  export async function getUserRoleInCommunity(
    userId: string, 
    communityId: string
  ): Promise<{ officialRole?: OfficialRole, userRole?: UserRole }> {
    try {
      // Find user role
      const userRoleQuery = query(
        collection(db, 'user_roles'),
        where('userId', '==', userId),
        where('communityId', '==', communityId)
      );
      const userRoleSnapshot = await getDocs(userRoleQuery);
  
      if (userRoleSnapshot.empty) {
        return {};
      }
  
      const userRole = { 
        id: userRoleSnapshot.docs[0].id, 
        ...userRoleSnapshot.docs[0].data() 
      } as UserRole;
  
      // Find corresponding official role
      const officialRoleDoc = await getDoc(
        doc(db, 'official_roles', userRole.roleId)
      );
  
      if (!officialRoleDoc.exists()) {
        return { userRole };
      }
  
      const officialRole = { 
        id: officialRoleDoc.id, 
        ...officialRoleDoc.data() 
      } as OfficialRole;
  
      return { userRole, officialRole };
    } catch (error) {
      console.error("Error getting user role:", error);
      throw error;
    }
  }