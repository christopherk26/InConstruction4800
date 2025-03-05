// app/services/authService.ts
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    sendPasswordResetEmail,
    sendEmailVerification,
    GoogleAuthProvider,
    signInWithPopup,
    updateProfile,
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword as firebaseUpdatePassword,
    updateEmail as firebaseUpdateEmail,
    getAuth,
    User as FirebaseUser,
    onAuthStateChanged
  } from 'firebase/auth';
  import { doc, setDoc, updateDoc, getDoc, Timestamp } from 'firebase/firestore';
  import { auth, db } from '@/lib/firebase-client';
  import { User, FirestoreTimestamp } from '@/app/types/database';
  import { UserModel } from '@/app/models/UserModel';
  
  /**
   * Converts a JavaScript Date to a Firestore Timestamp
   */
  const dateToTimestamp = (date: Date): FirestoreTimestamp => {
    const timestamp = Timestamp.fromDate(date);
    return {
      seconds: timestamp.seconds,
      nanoseconds: timestamp.nanoseconds
    };
  };
  
  /**
   * Converts Firestore server timestamp to our FirestoreTimestamp type
   */
  const serverTimestampToFirestore = (): FirestoreTimestamp => {
    const now = new Date();
    return dateToTimestamp(now);
  };
  
  /**
   * Sign up a new user with email and password
   * Creates both Firebase Auth account and Firestore user document
   */
  export async function signUpWithEmail(
    email: string, 
    password: string, 
    userData: { 
      firstName: string, 
      lastName: string,
      phoneNumber: string,
      birthDate: Date
    }
  ): Promise<UserModel> {
    try {
      // Create Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Set display name in Firebase Auth
      await updateProfile(firebaseUser, {
        displayName: `${userData.firstName} ${userData.lastName}`
      });
      
      // Send email verification
      await sendEmailVerification(firebaseUser);
      
      // Create Firestore user document
      const now = serverTimestampToFirestore();
      const birthDateTimestamp = dateToTimestamp(userData.birthDate);
      
      const userDoc: Omit<User, 'id'> = {
        email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phoneNumber: userData.phoneNumber,
        birthDate: birthDateTimestamp,
        bio: "",
        profilePhotoUrl: "",
        verification: {
          status: "pending",
          method: "email",
          documentUrls: [],
          verificationDate: now
        },
        createdAt: now,
        lastLogin: now,
        accountStatus: "active"
      };
      
      // Use Firebase Auth UID as document ID
      await setDoc(doc(db, "users", firebaseUser.uid), userDoc);
      
      // Create and return UserModel
      return new UserModel({ 
        id: firebaseUser.uid, 
        ...userDoc 
      });
    } catch (error) {
      console.error("Error signing up with email:", error);
      throw error;
    }
  }
  
  /**
   * Sign in with email and password
   * Updates last login time in Firestore
   */
  export async function signInWithEmail(email: string, password: string): Promise<UserModel> {
    try {
      // Authenticate with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      
      // Get user from Firestore
      const userDocRef = doc(db, "users", uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        throw new Error("User document not found in Firestore");
      }
      
      // Update last login
      const now = serverTimestampToFirestore();
      await updateDoc(userDocRef, { lastLogin: now });
      
      // Create UserModel with updated timestamp
      const userData = userDoc.data() as Omit<User, 'id'>;
      return new UserModel({ 
        id: uid,
        ...userData,
        lastLogin: now
      });
    } catch (error) {
      console.error("Error signing in with email:", error);
      throw error;
    }
  }
  
  /**
   * Sign in with Google
   * Creates user document if it doesn't exist
   */
  export async function signInWithGoogle(): Promise<UserModel> {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const firebaseUser = userCredential.user;
      const uid = firebaseUser.uid;
      
      // Check if user already exists in Firestore
      const userDocRef = doc(db, "users", uid);
      const userDoc = await getDoc(userDocRef);
      
      const now = serverTimestampToFirestore();
      
      if (!userDoc.exists()) {
        // Create new user document
        const nameParts = firebaseUser.displayName?.split(' ') || ['', ''];
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        const newUserData: Omit<User, 'id'> = {
          email: firebaseUser.email || "",
          firstName,
          lastName,
          phoneNumber: firebaseUser.phoneNumber || "",
          birthDate: now, // Default birthdate, will need to be updated
          bio: "",
          profilePhotoUrl: firebaseUser.photoURL || "",
          verification: {
            status: "pending",
            method: "google",
            documentUrls: [],
            verificationDate: now
          },
          createdAt: now,
          lastLogin: now,
          accountStatus: "active"
        };
        
        await setDoc(userDocRef, newUserData);
        
        return new UserModel({ 
          id: uid, 
          ...newUserData 
        });
      } else {
        // Update existing user's last login
        await updateDoc(userDocRef, { lastLogin: now });
        
        const userData = userDoc.data() as Omit<User, 'id'>;
        return new UserModel({ 
          id: uid, 
          ...userData,
          lastLogin: now 
        });
      }
    } catch (error) {
      console.error("Error signing in with Google:", error);
      throw error;
    }
  }
  
  /**
   * Sign out the current user
   */
  export async function signOut(): Promise<void> {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  }
  
  /**
   * Send password reset email
   */
  export async function resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error("Error sending password reset:", error);
      throw error;
    }
  }
  
  /**
   * Update user's password
   * Requires recent authentication
   */
  export async function updatePassword(currentPassword: string, newPassword: string): Promise<void> {
    const user = auth.currentUser;
    if (!user || !user.email) {
      throw new Error("No authenticated user found");
    }
    
    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await firebaseUpdatePassword(user, newPassword);
    } catch (error) {
      console.error("Error updating password:", error);
      throw error;
    }
  }
  
  /**
   * Update user's email address
   * Requires recent authentication
   */
  export async function updateEmail(currentPassword: string, newEmail: string): Promise<void> {
    const user = auth.currentUser;
    if (!user || !user.email) {
      throw new Error("No authenticated user found");
    }
    
    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update email in Firebase Auth
      await firebaseUpdateEmail(user, newEmail);
      
      // Update email in Firestore
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, { email: newEmail });
      
      // Send verification email
      await sendEmailVerification(user);
    } catch (error) {
      console.error("Error updating email:", error);
      throw error;
    }
  }
  
  /**
   * Get current user data from Firestore
   * Returns null if not authenticated
   */
  export async function getCurrentUser(): Promise<UserModel | null> {
    const user = auth.currentUser;
    if (!user) return null;
    
    try {
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        console.error("User document not found in Firestore");
        return null;
      }
      
      const userData = userDoc.data() as Omit<User, 'id'>;
      return new UserModel({ 
        id: user.uid, 
        ...userData 
      });
    } catch (error) {
      console.error("Error getting current user:", error);
      throw error;
    }
  }
  
  /**
   * Check if email is already in use
   */
  export async function isEmailInUse(email: string): Promise<boolean> {
    try {
      // This is a bit of a hack but works - if createUserWithEmailAndPassword fails
      // with "auth/email-already-in-use", then the email is in use
      await createUserWithEmailAndPassword(auth, email, Math.random().toString(36).slice(2));
      
      // If we get here, the email is not in use
      // Now delete the user we just created
      if (auth.currentUser) {
        await auth.currentUser.delete();
      }
      
      // Sign out
      await firebaseSignOut(auth);
      
      return false;
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        return true;
      }
      
      // For any other error, re-throw
      throw error;
    }
  }
  
  /**
   * Set up auth state listener
   * Callback will be called whenever auth state changes
   */
  export function onAuthStateChange(callback: (user: FirebaseUser | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  }
  
  /**
   * Create a function to check if the user is verified
   */
  export async function isUserVerified(): Promise<boolean> {
    const user = await getCurrentUser();
    if (!user) return false;
    
    return user.verification.status === 'verified';
  }
  
  /**
   * Check if user is an official in a community
   */
  export async function isUserOfficial(communityId: string): Promise<boolean> {
    const user = await getCurrentUser();
    if (!user) return false;
    
    const userModel = new UserModel(user);
    const roles = await userModel.getRoles();
    
    // Check if user has any role other than "Citizen" in this community
    for (const role of roles) {
      if (role.communityId === communityId) {
        const roleDocRef = doc(db, "official_roles", role.roleId);
        const roleDoc = await getDoc(roleDocRef);
        
        if (roleDoc.exists() && roleDoc.data().title !== "Citizen") {
          return true;
        }
      }
    }
    
    return false;
  }