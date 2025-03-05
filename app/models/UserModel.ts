// models/UserModel.ts
import { User, FirestoreTimestamp } from '@/app/types/database';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  Timestamp, 
  serverTimestamp 
} from 'firebase/firestore';
import { getAuth, updateEmail, updatePassword } from 'firebase/auth';
import { db } from '@/lib/firebase-client'; // Assuming this is your Firebase initialization

export class UserModel implements User {
  // Properties from User interface
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

  /**
   * Create a new UserModel instance
   * @param userData User data to initialize with
   */
  constructor(userData: User) {
    this.id = userData.id;
    this.email = userData.email;
    this.firstName = userData.firstName;
    this.lastName = userData.lastName;
    this.phoneNumber = userData.phoneNumber;
    this.birthDate = userData.birthDate;
    this.bio = userData.bio || '';
    this.profilePhotoUrl = userData.profilePhotoUrl || '';
    this.verification = {
      status: userData.verification?.status || 'pending',
      method: userData.verification?.method || '',
      documentUrls: userData.verification?.documentUrls || [],
      verificationDate: userData.verification?.verificationDate || { seconds: 0, nanoseconds: 0 }
    };
    this.createdAt = userData.createdAt || { seconds: 0, nanoseconds: 0 };
    this.lastLogin = userData.lastLogin || { seconds: 0, nanoseconds: 0 };
    this.accountStatus = userData.accountStatus || 'active';
  }

  /**
   * Convert a JavaScript Date to a Firestore Timestamp
   * @param date JavaScript Date object
   * @returns FirestoreTimestamp
   */
  static dateToTimestamp(date: Date): FirestoreTimestamp {
    const timestamp = Timestamp.fromDate(date);
    return {
      seconds: timestamp.seconds,
      nanoseconds: timestamp.nanoseconds
    };
  }

  /**
   * Convert a Firestore Timestamp to a JavaScript Date
   * @param timestamp FirestoreTimestamp
   * @returns JavaScript Date object
   */
  static timestampToDate(timestamp: FirestoreTimestamp): Date {
    return new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
  }

  /**
   * Get a user by their ID
   * @param id User ID
   * @returns Promise resolving to UserModel or null if not found
   */
  static async getById(id: string): Promise<UserModel | null> {
    try {
      const docRef = doc(db, 'users', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return new UserModel({ id, ...docSnap.data() } as User);
      }
      
      return null;
    } catch (error) {
      console.error("Error getting user by ID:", error);
      throw error;
    }
  }

  /**
   * Get a user by their email
   * @param email User email
   * @returns Promise resolving to UserModel or null if not found
   */
  static async getByEmail(email: string): Promise<UserModel | null> {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return new UserModel({ id: doc.id, ...doc.data() } as User);
      }
      
      return null;
    } catch (error) {
      console.error("Error getting user by email:", error);
      throw error;
    }
  }

  /**
   * Create a new user in Firestore
   * @param userData User data without ID
   * @param uid Optional Firebase Auth UID
   * @returns Promise resolving to new UserModel
   */
  static async create(userData: Omit<User, 'id'>, uid?: string): Promise<UserModel> {
    try {
      // Set created timestamp
      const now = serverTimestamp();
      const userDataWithTimestamp = {
        ...userData,
        createdAt: now,
        lastLogin: now
      };
      
      let userDocRef;
      
      if (uid) {
        // Use provided UID as document ID (from Firebase Auth)
        userDocRef = doc(db, 'users', uid);
        await setDoc(userDocRef, userDataWithTimestamp);
      } else {
        // Let Firestore generate an ID
        userDocRef = doc(collection(db, 'users'));
        await setDoc(userDocRef, userDataWithTimestamp);
      }
      
      // Convert server timestamp to FirestoreTimestamp for local use
      // Since serverTimestamp() doesn't return immediately usable timestamp
      const createdAt = UserModel.dateToTimestamp(new Date());
      
      const newUser = new UserModel({
        id: userDocRef.id,
        ...userData,
        createdAt,
        lastLogin: createdAt
      } as User);
      
      return newUser;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  /**
   * Update user's Firestore profile data
   * @param data Partial user data to update
   * @returns Promise resolving when update completes
   */
  async update(data: Partial<User>): Promise<void> {
    if (!this.id) throw new Error("Cannot update user without ID");
    
    try {
      const userRef = doc(db, 'users', this.id);
      await updateDoc(userRef, data);
      
      // Update local instance
      Object.assign(this, data);
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  }

  /**
   * Update user's authentication email
   * @param newEmail New email address
   * @returns Promise resolving when update completes
   */
  async updateEmail(newEmail: string): Promise<void> {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) throw new Error("No authenticated user found");
    if (!this.id) throw new Error("User has no ID");
    
    try {
      // Update Firebase Auth email
      await updateEmail(user, newEmail);
      
      // Update Firestore profile
      await this.update({ email: newEmail });
    } catch (error) {
      console.error("Error updating email:", error);
      throw error;
    }
  }

  /**
   * Update user's authentication password
   * @param newPassword New password
   * @returns Promise resolving when update completes
   */
  async updatePassword(newPassword: string): Promise<void> {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) throw new Error("No authenticated user found");
    
    try {
      await updatePassword(user, newPassword);
    } catch (error) {
      console.error("Error updating password:", error);
      throw error;
    }
  }

  /**
   * Update user's last login timestamp
   * @returns Promise resolving when update completes
   */
  async updateLastLogin(): Promise<void> {
    if (!this.id) throw new Error("Cannot update user without ID");
    
    try {
      const now = UserModel.dateToTimestamp(new Date());
      await this.update({ lastLogin: now });
    } catch (error) {
      console.error("Error updating last login:", error);
      throw error;
    }
  }

  /**
   * Delete user from Firestore
   * @param deleteAuth Whether to also delete the user's Firebase Auth account
   * @returns Promise resolving when deletion completes
   */
  async delete(deleteAuth: boolean = false): Promise<void> {
    if (!this.id) throw new Error("Cannot delete user without ID");
    
    try {
      // Delete Firestore document
      const userRef = doc(db, 'users', this.id);
      await deleteDoc(userRef);
      
      // Optionally delete Firebase Auth account
      if (deleteAuth) {
        const auth = getAuth();
        const user = auth.currentUser;
        if (user && user.uid === this.id) {
          await user.delete();
        }
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  }

  /**
   * Change user's verification status
   * @param status New verification status
   * @param method Verification method used
   * @returns Promise resolving when update completes
   */
  async updateVerificationStatus(
    status: 'verified' | 'pending' | 'rejected',
    method?: string
  ): Promise<void> {
    try {
      const now = UserModel.dateToTimestamp(new Date());
      const verificationUpdate = {
        verification: {
          ...this.verification,
          status,
          verificationDate: now
        }
      };
      
      if (method) {
        verificationUpdate.verification.method = method;
      }
      
      await this.update(verificationUpdate);
    } catch (error) {
      console.error("Error updating verification status:", error);
      throw error;
    }
  }

  /**
   * Change user's account status
   * @param status New account status
   * @returns Promise resolving when update completes
   */
  async updateAccountStatus(status: 'active' | 'suspended' | 'deactivated'): Promise<void> {
    try {
      await this.update({ accountStatus: status });
    } catch (error) {
      console.error("Error updating account status:", error);
      throw error;
    }
  }

  /**
   * Get user's full name
   * @returns User's full name
   */
  getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  /**
   * Check if user is verified
   * @returns Whether the user is verified
   */
  isVerified(): boolean {
    return this.verification.status === 'verified';
  }

  /**
   * Check if user's account is active
   * @returns Whether the user's account is active
   */
  isActive(): boolean {
    return this.accountStatus === 'active';
  }

  /**
   * Get user's birth date as JavaScript Date
   * @returns User's birth date
   */
  getBirthDate(): Date {
    return UserModel.timestampToDate(this.birthDate);
  }

  /**
   * Calculate user's age
   * @returns User's age in years
   */
  getAge(): number {
    const birthDate = this.getBirthDate();
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();
    
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Get user's communities
   * @returns Promise resolving to array of community IDs
   */
  async getCommunityIds(): Promise<string[]> {
    if (!this.id) return [];
    
    try {
      const membershipsRef = collection(db, 'community_memberships');
      const q = query(membershipsRef, where('userId', '==', this.id));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => doc.data().communityId);
    } catch (error) {
      console.error("Error getting user's communities:", error);
      throw error;
    }
  }

  /**
   * Get user's roles
   * @returns Promise resolving to array of role IDs by community
   */
  async getRoles(): Promise<{ communityId: string, roleId: string }[]> {
    if (!this.id) return [];
    
    try {
      const userRolesRef = collection(db, 'user_roles');
      const q = query(userRolesRef, where('userId', '==', this.id));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          communityId: data.communityId,
          roleId: data.roleId
        };
      });
    } catch (error) {
      console.error("Error getting user's roles:", error);
      throw error;
    }
  }

  /**
   * Check if user has a specific role in a community
   * @param communityId Community ID
   * @param roleId Role ID
   * @returns Promise resolving to boolean
   */
  async hasRole(communityId: string, roleId: string): Promise<boolean> {
    if (!this.id) return false;
    
    try {
      const userRolesRef = collection(db, 'user_roles');
      const q = query(
        userRolesRef, 
        where('userId', '==', this.id),
        where('communityId', '==', communityId),
        where('roleId', '==', roleId)
      );
      const querySnapshot = await getDocs(q);
      
      return !querySnapshot.empty;
    } catch (error) {
      console.error("Error checking user role:", error);
      throw error;
    }
  }

  /**
   * Convert user model to plain object (for serialization)
   * @returns Plain JavaScript object representing user
   */
  toJSON(): Record<string, any> {
    return {
      id: this.id,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      phoneNumber: this.phoneNumber,
      birthDate: this.birthDate,
      bio: this.bio,
      profilePhotoUrl: this.profilePhotoUrl,
      verification: this.verification,
      createdAt: this.createdAt,
      lastLogin: this.lastLogin,
      accountStatus: this.accountStatus
    };
  }
}