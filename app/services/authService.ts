import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  getAuth,
  User as FirebaseUser,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, setDoc, updateDoc, getDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase-client";
import { User, FirestoreTimestamp } from "@/app/types/database";
import { UserModel } from "@/app/models/UserModel";

/**
 * Converts a JavaScript Date to a Firestore Timestamp for consistent storage
 * @param date - The JavaScript Date object to convert
 * @returns FirestoreTimestamp with seconds and nanoseconds
 */
const dateToTimestamp = (date: Date): FirestoreTimestamp => {
  const timestamp = Timestamp.fromDate(date);
  return { seconds: timestamp.seconds, nanoseconds: timestamp.nanoseconds };
};

/**
 * Creates a Firestore-compatible timestamp from the current server time
 * @returns FirestoreTimestamp representing the current time
 */
const serverTimestampToFirestore = (): FirestoreTimestamp => {
  return dateToTimestamp(new Date());
};

/**
 * Checks if an email is an admin email
 * @param email - Email to check
 * @returns boolean indicating if the email is an admin email
 */
const isAdminEmail = (email: string): boolean => {
  // List of admin emails - you can expand this or move to a configuration file
  const adminEmails = [
    'christopherkurdoghlian@gmail.com',
    // Add other admin emails here
  ];
  return adminEmails.includes(email);
};

/**
 * Signs up a new user with email and password
 * - Creates a Firebase Auth user
 * - Sends an email verification link
 * - Stores user data in Firestore
 * @param email - User's email address
 * @param password - User's password
 * @param userData - Additional user info (firstName, lastName, etc.)
 * @returns UserModel instance representing the new user
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  userData: { firstName: string; lastName: string; phoneNumber: string; birthDate: Date }
): Promise<UserModel> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    await updateProfile(firebaseUser, {
      displayName: `${userData.firstName} ${userData.lastName}`,
    });

    await sendEmailVerification(firebaseUser);

    const now = serverTimestampToFirestore();
    const birthDateTimestamp = dateToTimestamp(userData.birthDate);

    const userDoc: Omit<User, "id"> = {
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
        verificationDate: now,
      },
      createdAt: now,
      lastLogin: now,
      accountStatus: "active",
      isAdmin: isAdminEmail(email) // Check if the email is an admin email
    };

    await setDoc(doc(db, "users", firebaseUser.uid), userDoc);

    return new UserModel({ id: firebaseUser.uid, ...userDoc });
  } catch (error) {
    console.error("Error signing up with email:", error);
    throw error;
  }
}

/**
 * Signs in an existing user with email and password
 * - Blocks login if email is not verified
 * - Updates last login time in Firestore
 * @param email - User's email address
 * @param password - User's password
 * @returns UserModel instance with updated lastLogin
 */
export async function signInWithEmail(email: string, password: string): Promise<UserModel> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    const uid = firebaseUser.uid;

    // Block login if email is not verified
    if (!firebaseUser.emailVerified) {
      throw new Error("Please verify your email before logging in.");
    }

    const userDocRef = doc(db, "users", uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      throw new Error("User document not found in Firestore");
    }

    const now = serverTimestampToFirestore();
    
    // Update last login and ensure isAdmin is set correctly
    const userData = userDoc.data() as Omit<User, "id">;
    const updatedUserData = {
      ...userData,
      lastLogin: now,
      isAdmin: isAdminEmail(email) // Ensure admin status is up to date
    };

    await updateDoc(userDocRef, updatedUserData);

    return new UserModel({ id: uid, ...updatedUserData });
  } catch (error) {
    console.error("Error signing in with email:", error);
    throw error;
  }
}

/**
 * Signs in a user with Google
 * - Google users are considered verified by default (email is verified by Google)
 * - Creates/updates Firestore user document
 * @returns UserModel instance for the signed-in user
 */
export async function signInWithGoogle(): Promise<UserModel> {
  try {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const firebaseUser = userCredential.user;
    const uid = firebaseUser.uid;

    const userDocRef = doc(db, "users", uid);
    const userDoc = await getDoc(userDocRef);
    const now = serverTimestampToFirestore();

    if (!userDoc.exists()) {
      const nameParts = firebaseUser.displayName?.split(" ") || ["", ""];
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      const newUserData: Omit<User, "id"> = {
        email: firebaseUser.email || "",
        firstName,
        lastName,
        phoneNumber: "",
        birthDate: now,
        bio: "",
        profilePhotoUrl: firebaseUser.photoURL || "",
        verification: {
          status: "pending", // Still pending for ID verification
          method: "google",
          documentUrls: [],
          verificationDate: now,
        },
        createdAt: now,
        lastLogin: now,
        accountStatus: "active",
        isAdmin: isAdminEmail(firebaseUser.email || '') // Check if the email is an admin email
      };

      await setDoc(userDocRef, newUserData);
      return new UserModel({ id: uid, ...newUserData });
    } else {
      // Update last login and ensure admin status
      const userData = userDoc.data() as Omit<User, "id">;
      const updatedUserData = {
        ...userData,
        lastLogin: now,
        isAdmin: isAdminEmail(firebaseUser.email || '')
      };

      await updateDoc(userDocRef, updatedUserData);
      return new UserModel({ id: uid, ...updatedUserData });
    }
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
}


/**
 * Signs out the current user from Firebase Auth
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
 * Fetches the current authenticated user's data from Firestore
 * - Uses onAuthStateChanged to ensure auth state is fully initialized
 * @returns UserModel instance or null if not authenticated
 */
export async function getCurrentUser(): Promise<UserModel | null> {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      unsubscribe(); // Clean up listener after first call
      if (!firebaseUser) {
        resolve(null);
        return;
      }

      try {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          console.error("User document not found in Firestore");
          resolve(null);
          return;
        }

        const userData = userDoc.data() as Omit<User, "id">;
        resolve(new UserModel({ id: firebaseUser.uid, ...userData }));
      } catch (error) {
        console.error("Error fetching user data:", error);
        reject(error);
      }
    });
  });
}

/**
 * Sets up a listener for authentication state changes
 * @param callback - Function to call when auth state changes
 * @returns Unsubscribe function to stop listening
 */
export function onAuthStateChange(callback: (user: FirebaseUser | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

/**
 * Sends a password reset email to the user
 * @param email - The email address to send the reset link to
 * @returns Promise that resolves when the email is sent
 */
export async function resetPassword(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error("Error sending password reset:", error);
    throw error;
  }
}