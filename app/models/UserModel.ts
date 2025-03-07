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
import { db } from '@/lib/firebase-client';

export class UserModel implements User {
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

  constructor(userData: User) {
    this.id = userData.id;
    this.email = userData.email;
    this.firstName = userData.firstName;
    this.lastName = userData.lastName;
    this.phoneNumber = userData.phoneNumber;
    this.birthDate = userData.birthDate;
    this.bio = userData.bio || '';
    this.profilePhotoUrl = userData.profilePhotoUrl || '';
    this.verification = userData.verification;
    this.createdAt = userData.createdAt;
    this.lastLogin = userData.lastLogin;
    this.accountStatus = userData.accountStatus || 'active';
  }

  /**
   * Fetch the latest user data from Firestore
   * - Remains private, only callable within class
   */
  private async refreshData(): Promise<void> {
    if (!this.id) throw new Error("Cannot refresh user without ID");
    const docRef = doc(db, "users", this.id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as Omit<User, "id">;
      Object.assign(this, data);
    } else {
      throw new Error("User document not found");
    }
  }

  /**
   * Convert a JavaScript Date to a Firestore Timestamp
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
   */
  static timestampToDate(timestamp: FirestoreTimestamp): Date {
    return new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
  }

  /**
   * Get a user by their ID
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
   */
  static async create(userData: Omit<User, 'id'>, uid?: string): Promise<UserModel> {
    try {
      const now = serverTimestamp();
      const userDataWithTimestamp = {
        ...userData,
        createdAt: now,
        lastLogin: now
      };
      
      let userDocRef;
      if (uid) {
        userDocRef = doc(db, 'users', uid);
        await setDoc(userDocRef, userDataWithTimestamp);
      } else {
        userDocRef = doc(collection(db, 'users'));
        await setDoc(userDocRef, userDataWithTimestamp);
      }
      
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
   */
  async update(data: Partial<User>): Promise<void> {
    if (!this.id) throw new Error("Cannot update user without ID");
    try {
      const userRef = doc(db, 'users', this.id);
      await updateDoc(userRef, data);
      Object.assign(this, data);
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  }

  /**
   * Update user's authentication email
   */
  async updateEmail(newEmail: string): Promise<void> {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error("No authenticated user found");
    if (!this.id) throw new Error("User has no ID");
    try {
      await updateEmail(user, newEmail);
      await this.update({ email: newEmail });
    } catch (error) {
      console.error("Error updating email:", error);
      throw error;
    }
  }

  /**
   * Update user's authentication password
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
   */
  async delete(deleteAuth: boolean = false): Promise<void> {
    if (!this.id) throw new Error("Cannot delete user without ID");
    try {
      const userRef = doc(db, 'users', this.id);
      await deleteDoc(userRef);
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
   * Change user's verification status and refresh local data
   * - Updated to refresh data after update
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
      await this.refreshData(); // Refresh local instance after Firestore update
    } catch (error) {
      console.error("Error updating verification status:", error);
      throw error;
    }
  }

  /**
   * Change user's account status
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
   */
  getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  /**
   * Check if user is verified, fetching latest data
   */
  async isVerified(): Promise<boolean> {
    await this.refreshData(); // Fetch latest data from Firestore
    return this.verification.status === "verified";
  }

  /**
   * Check if user's account is active
   */
  isActive(): boolean {
    return this.accountStatus === 'active';
  }

  /**
   * Get user's birth date as JavaScript Date
   */
  getBirthDate(): Date {
    return UserModel.timestampToDate(this.birthDate);
  }

  /**
   * Calculate user's age
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
   * Convert user model to plain object
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