// app/services/communityService.ts
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    doc, 
    getDoc, 
    onSnapshot, 
    orderBy, 
    limit,
    Timestamp,
    startAfter,
    DocumentSnapshot
  } from 'firebase/firestore';
  import { db } from "@/lib/firebase-client";
  
  import { CommunityMembership } from "@/app/types/database";
  
  /**
   * Fetch all communities a user is a member of
   * This includes both regular memberships and "ghost" viewing communities
   * 
   * @param userId - The ID of the user
   * @returns Promise containing array of community data
   */
  export async function getUserCommunities(userId: string): Promise<FirestoreData[]> {
    try {
      // Get user's community memberships from the junction collection
      const membershipRef = collection(db, 'community_memberships');
      const q = query(membershipRef, where('userId', '==', userId));
      const snapshot = await getDocs(q);
      
      // Extract community IDs from memberships
      const communityIds = snapshot.docs.map(doc => doc.data().communityId);
      
      if (communityIds.length === 0) {
        return [];
      }
      
      // Fetch the full community data using the IDs
      // Note: Firestore 'in' queries are limited to 10 items, for larger sets we'd need to batch
      const communitiesRef = collection(db, 'communities');
      const communityQuery = query(communitiesRef, where('__name__', 'in', communityIds));
      const communitySnapshot = await getDocs(communityQuery);
      
      return communitySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching user communities:', error);
      throw error;
    }
  }
  
  /**
   * Fetch posts for a specific community with optional filtering and sorting
   * 
   * @param communityId - ID of the community to fetch posts for
   * @param options - Optional parameters for filtering and sorting
   * @returns Promise containing array of post data
   */
  export async function getCommunityPosts(
    communityId: string, 
    options?: {
      sortBy?: 'recent' | 'upvoted' | 'trending',
      categoryTag?: string,
      limit?: number,
      lastVisible?: DocumentSnapshot
    }
  ): Promise<{posts: FirestoreData[], lastVisible: DocumentSnapshot | null}> {
    try {
      const postsRef = collection(db, 'posts');
      
      // Start with filtering by communityId
      let q = query(postsRef, where('communityId', '==', communityId));
      
      // Apply category filter if provided and not 'all'
      if (options?.categoryTag && options.categoryTag !== 'all') {
        q = query(q, where('categoryTag', '==', options.categoryTag));
      }
      
      // Apply sorting based on the requested sort type
      if (options?.sortBy === 'recent') {
        q = query(q, orderBy('createdAt', 'desc'));
      } else if (options?.sortBy === 'upvoted') {
        q = query(q, orderBy('stats.upvotes', 'desc'));
      } else if (options?.sortBy === 'trending') {
        // Trending could be a custom algorithm considering recency and popularity
        // Here's a simple implementation - you might want a more sophisticated approach
        q = query(q, orderBy('stats.upvotes', 'desc'), orderBy('createdAt', 'desc'));
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

  export async function getCommunityMembers(communityId: string): Promise<CommunityMembership[]> {
    const membershipsRef = collection(db, "community_memberships");
    const q = query(membershipsRef, where("communityId", "==", communityId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as CommunityMembership));
  }
  
  /**
   * Subscribe to real-time updates for a community's posts
   * This sets up a listener that will call the callback whenever posts change
   * 
   * @param communityId - ID of the community to watch
   * @param callback - Function to call with updated posts data
   * @param options - Optional filtering and sorting parameters
   * @returns Unsubscribe function to stop listening
   */
  export function subscribeToCommunityPosts(
    communityId: string,
    callback: (posts: FirestoreData[]) => void,
    options?: {
      sortBy?: 'recent' | 'upvoted' | 'trending',
      categoryTag?: string,
      limit?: number
    }
  ): () => void {
    // Start with basic community filter
    const postsRef = collection(db, 'posts');
    let q = query(postsRef, where('communityId', '==', communityId));
    
    // Apply category filter if provided
    if (options?.categoryTag && options?.categoryTag !== 'all') {
      q = query(q, where('categoryTag', '==', options.categoryTag));
    }
    
    // Apply sorting options
    if (options?.sortBy === 'recent') {
      q = query(q, orderBy('createdAt', 'desc'));
    } else if (options?.sortBy === 'upvoted') {
      q = query(q, orderBy('stats.upvotes', 'desc'));
    } else if (options?.sortBy === 'trending') {
      q = query(q, orderBy('stats.upvotes', 'desc'), orderBy('createdAt', 'desc'));
    } else {
      q = query(q, orderBy('createdAt', 'desc'));
    }
    
    // Apply limit if provided
    if (options?.limit) {
      q = query(q, limit(options.limit));
    }
    
    // Set up the listener
    return onSnapshot(q, (snapshot) => {
      const posts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(posts);
    }, (error) => {
      console.error('Error in posts snapshot listener:', error);
    });
  }
  
  /**
   * Get detailed information about a specific community
   * 
   * @param communityId - ID of the community to fetch
   * @returns Promise with community data or null if not found
   */
  export async function getCommunityDetails(communityId: string): Promise<FirestoreData | null> {
    try {
      const docRef = doc(db, 'communities', communityId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching community details:', error);
      throw error;
    }
  }
  
  /**
   * Get all available community category tags
   * These are the tags that can be used to categorize posts
   * 
   * @returns Array of category tag strings
   */
  export function getCommunityCategories(): string[] {
    // These match the categories defined in your system specs
    return [
      'generalDiscussion',
      'safetyAndCrime', 
      'governance',
      'disasterAndFire', 
      'businesses', 
      'resourcesAndRecovery',
      'communityEvents', 
      'emergencyDiscussion', 
      'officialEmergencyAlerts'
    ];
  }
  
  /**
   * Returns a human-readable display name for category tags
   * 
   * @param tag - The category tag
   * @returns Formatted display name
   */
  export function formatCategoryName(tag: string): string {
    const formattedNames: {[key: string]: string} = {
      'generalDiscussion': 'General Discussion',
      'safetyAndCrime': 'Safety & Crime', 
      'governance': 'Governance',
      'disasterAndFire': 'Disaster & Fire', 
      'businesses': 'Businesses', 
      'resourcesAndRecovery': 'Resources & Recovery',
      'communityEvents': 'Community Events', 
      'emergencyDiscussion': 'Emergency Discussion', 
      'officialEmergencyAlerts': 'Official Alerts'
    };
    
    return formattedNames[tag] || tag;
  }
  
  /**
   * Save the user's current community selection to localStorage
   * 
   * @param userId - The user's ID
   * @param communityId - The selected community ID
   */
  export function saveUserCommunitySelection(userId: string, communityId: string): void {
    if (!userId || !communityId) return;
    
    try {
      localStorage.setItem(`townhall_selected_community_${userId}`, communityId);
    } catch (error) {
      console.error('Error saving community selection:', error);
    }
  }
  
  /**
   * Get the user's previously selected community from localStorage
   * 
   * @param userId - The user's ID
   * @returns The previously selected community ID or null
   */
  export function getUserCommunitySelection(userId: string): string | null {
    try {
      return localStorage.getItem(`townhall_selected_community_${userId}`);
    } catch (error) {
      console.error('Error retrieving community selection:', error);
      return null;
    }
  }
  /**
 * Check if a user is a member of a specific community
 * 
 * @param userId - The user's ID
 * @param communityId - The community ID to check membership for
 * @returns Promise with boolean result
 */
export async function checkCommunityMembership(userId: string, communityId: string): Promise<boolean> {
  try {
    const membershipRef = collection(db, 'community_memberships');
    const q = query(
      membershipRef, 
      where('userId', '==', userId),
      where('communityId', '==', communityId)
    );
    
    const snapshot = await getDocs(q);
    return !snapshot.empty; // User is a member if query returns results
  } catch (error) {
    console.error('Error checking community membership:', error);
    return false;
  }
}

/**
 * Get full details of a specific community
 * 
 * @param communityId - ID of the community to fetch
 * @returns Promise with community data
 */
export async function getCommunityById(communityId: string): Promise<FirestoreData | null> {
  try {
    const docRef = doc(db, 'communities', communityId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching community details:', error);
    throw error;
  }
}