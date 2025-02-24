import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";
import { getDatabase, type Database } from "firebase/database";
import { getRemoteConfig, type RemoteConfig } from "firebase/remote-config";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA8krcjPPhxF222gKTBUJhgeDuJ_6X5HiE",
  authDomain: "cs-4800-in-construction-63b73.firebaseapp.com",
  databaseURL: "https://cs-4800-in-construction-63b73-default-rtdb.firebaseio.com",
  projectId: "cs-4800-in-construction-63b73",
  storageBucket: "cs-4800-in-construction-63b73.firebasestorage.app",
  messagingSenderId: "430628626450",
  appId: "1:430628626450:web:a55ef8c6768ddb915e38cb",
  measurementId: "G-CRXZ621DDX"
};

// Initialize Firebase app (singleton pattern)
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Firebase services
const db: Firestore = getFirestore(app);
const auth: Auth = getAuth(app);
const realtimeDB: Database = getDatabase(app);
const remoteConfig: RemoteConfig = getRemoteConfig(app);

// Export services
export { db, auth, realtimeDB, remoteConfig };