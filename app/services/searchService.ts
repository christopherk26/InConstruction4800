// app/services/searchService.ts
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    orderBy, 
    limit, 
    or,
    and,
    startAt,
    endAt,
    Timestamp,
    DocumentData,
    QueryDocumentSnapshot
  } from 'firebase/firestore';
  import { db } from '@/lib/firebase-client';
  import { getCommunityUsers } from './userService';
  import { getCommunityPosts } from './communityService';
  import { User, Post, FirestoreData } from '@/app/types/database';
  
  /**
   * Search for users across communities or within a specific community
   * 
   * @param searchTerm - The search query string
   * @param communityId - Optional specific community to search within
   * @param maxResults - Maximum number of results to return
   * @returns Promise containing array of matching users
   */
  export async function searchUsers(
    searchTerm: string,
    communityId?: string,
    maxResults: number = 20
  ): Promise<User[]> {
    try {
      // Normalize search term
      const normalizedTerm = searchTerm.toLowerCase().trim();
      
      if (!normalizedTerm) {
        return [];
      }
      
      let users: User[] = [];
      
      // If searching within a specific community
      if (communityId) {
        // Get all users in community (more efficient in small communities)
        const communityUsers = await getCommunityUsers(communityId);
        
        // Filter users locally based on search criteria
        users = communityUsers.filter(user => {
          // Check name match
          const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
          const nameMatch = fullName.includes(normalizedTerm);
          
          // Check email match
          const emailMatch = user.email.toLowerCase().includes(normalizedTerm);
          
          // Check bio match
          const bioMatch = user.bio?.toLowerCase().includes(normalizedTerm) || false;
          
          return nameMatch || emailMatch || bioMatch;
        });
      } 
      // If searching across all communities
      else {
        // Firebase doesn't support direct text search, so we use a combination of methods
        // This is a simplified approach - for production, consider Algolia or another search service
        
        const usersRef = collection(db, 'users');
        
        // Since we can't do direct text search, we'll use startAt/endAt with field values
        // starting with our search term.
        // Note: This will only match the beginning of fields, not substrings.
        
        // Check first name
        const firstNameQuery = query(
          usersRef,
          orderBy('firstName'),
          startAt(normalizedTerm),
          endAt(normalizedTerm + '\uf8ff'), // \uf8ff is a high code point that comes after most characters
          limit(maxResults)
        );
        
        // Check last name
        const lastNameQuery = query(
          usersRef,
          orderBy('lastName'),
          startAt(normalizedTerm),
          endAt(normalizedTerm + '\uf8ff'),
          limit(maxResults)
        );
        
        // Check email
        const emailQuery = query(
          usersRef,
          orderBy('email'),
          startAt(normalizedTerm),
          endAt(normalizedTerm + '\uf8ff'),
          limit(maxResults)
        );
        
        // Execute all queries
        const [firstNameResults, lastNameResults, emailResults] = await Promise.all([
          getDocs(firstNameQuery),
          getDocs(lastNameQuery),
          getDocs(emailQuery)
        ]);
        
        // Combine results, removing duplicates
        const userMap = new Map<string, User>();
        
        const processResults = (snapshots: QueryDocumentSnapshot<DocumentData, DocumentData>[]) => {
          snapshots.forEach(doc => {
            const userData = {
              id: doc.id,
              ...doc.data()
            } as User;
            
            // Only add if not already added
            if (!userMap.has(doc.id)) {
              userMap.set(doc.id, userData);
            }
          });
        };
        
        processResults(firstNameResults.docs);
        processResults(lastNameResults.docs);
        processResults(emailResults.docs);
        
        // Convert map to array
        users = Array.from(userMap.values());
        
        // If we didn't get enough results with prefix search, we could add a fallback strategy here
        // But for now, this is a reasonable approach
      }
      
      // Sort results by relevance (exact matches first, then partial)
      return users.sort((a, b) => {
        const aName = `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase();
        const bName = `${b.firstName || ''} ${b.lastName || ''}`.toLowerCase();
        
        // Exact matches first
        if (aName === normalizedTerm) return -1;
        if (bName === normalizedTerm) return 1;
        
        // Then sort by name (alphabetically)
        return aName.localeCompare(bName);
      }).slice(0, maxResults);
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }
  
  /**
   * Search for posts across communities or within a specific community
   * 
   * @param searchTerm - The search query string
   * @param communityId - Optional specific community to search within
   * @param maxResults - Maximum number of results to return
   * @returns Promise containing array of matching posts
   */
  export async function searchPosts(
    searchTerm: string,
    communityId?: string,
    maxResults: number = 20
  ): Promise<Post[]> {
    try {
      // Normalize search term
      const normalizedTerm = searchTerm.toLowerCase().trim();
      
      if (!normalizedTerm) {
        return [];
      }
      
      let posts: Post[] = [];
      
      // If searching within a specific community
      if (communityId) {
        // Get all posts in community
        const result = await getCommunityPosts(communityId, { 
          limit: 100, // Use a reasonably large limit
          sortBy: 'recent'
        });
        
        // Filter posts locally based on search criteria
        posts = (result.posts as Post[]).filter(post => {
          // Check title match
          const titleMatch = post.title.toLowerCase().includes(normalizedTerm);
          
          // Check content match
          const contentMatch = post.content.toLowerCase().includes(normalizedTerm);
          
          // Check author name match
          const authorMatch = post.author?.name?.toLowerCase().includes(normalizedTerm) || false;
          
          return titleMatch || contentMatch || authorMatch;
        });
      } 
      // If searching across all communities
      else {
        // Similar approach to user search, but for posts
        
        const postsRef = collection(db, 'posts');
        
        // Only search active posts
        const baseQuery = query(
          postsRef,
          where('status', 'in', ['active', 'pinned'])
        );
        
        // Check title
        const titleQuery = query(
          postsRef,
          where('status', 'in', ['active', 'pinned']),
          orderBy('title'),
          startAt(normalizedTerm),
          endAt(normalizedTerm + '\uf8ff'),
          limit(maxResults)
        );
        
        // Get some recent posts to add to search scope
        const recentPostsQuery = query(
          postsRef,
          where('status', 'in', ['active', 'pinned']),
          orderBy('createdAt', 'desc'),
          limit(100)
        );
        
        // Execute queries
        const [titleResults, recentResults] = await Promise.all([
          getDocs(titleQuery),
          getDocs(recentPostsQuery)
        ]);
        
        // Combine results, removing duplicates
        const postMap = new Map<string, Post>();
        
        // Add title-matched posts
        titleResults.docs.forEach(doc => {
          const postData = {
            id: doc.id,
            ...doc.data()
          } as Post;
          
          postMap.set(doc.id, postData);
        });
        
        // Check recent posts for content matches (since content is not indexed)
        recentResults.docs.forEach(doc => {
          // Skip if already added from title match
          if (postMap.has(doc.id)) {
            return;
          }
          
          const postData = doc.data() as Omit<Post, 'id'>;
          
          // Check for match in content or author name
          const contentMatch = postData.content.toLowerCase().includes(normalizedTerm);
          const authorMatch = postData.author?.name?.toLowerCase().includes(normalizedTerm) || false;
          
          if (contentMatch || authorMatch) {
            postMap.set(doc.id, {
              id: doc.id,
              ...postData
            } as Post);
          }
        });
        
        // Convert map to array
        posts = Array.from(postMap.values());
      }
      
      // Sort results by relevance and recency
      return posts.sort((a, b) => {
        // Title exact matches first
        if (a.title.toLowerCase() === normalizedTerm) return -1;
        if (b.title.toLowerCase() === normalizedTerm) return 1;
        
        // Title contains match second
        const aTitleContains = a.title.toLowerCase().includes(normalizedTerm);
        const bTitleContains = b.title.toLowerCase().includes(normalizedTerm);
        if (aTitleContains && !bTitleContains) return -1;
        if (!aTitleContains && bTitleContains) return 1;
        
        // Then sort by recency (newer first)
        const aTime = a.createdAt.seconds;
        const bTime = b.createdAt.seconds;
        return bTime - aTime;
      }).slice(0, maxResults);
    } catch (error) {
      console.error('Error searching posts:', error);
      throw error;
    }
  }
  
  /**
   * Combined search function to search both users and posts
   * 
   * @param searchTerm - The search query string
   * @param communityId - Optional specific community to search within
   * @param maxResults - Maximum number of results per category
   * @returns Promise with object containing user and post results
   */
  export async function searchAll(
    searchTerm: string,
    communityId?: string,
    maxResults: number = 10
  ): Promise<{ users: User[], posts: Post[] }> {
    try {
      // Run both searches in parallel
      const [users, posts] = await Promise.all([
        searchUsers(searchTerm, communityId, maxResults),
        searchPosts(searchTerm, communityId, maxResults)
      ]);
      
      return { users, posts };
    } catch (error) {
      console.error('Error performing combined search:', error);
      throw error;
    }
  }