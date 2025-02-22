
//lib/firebase.js
/* 
Security Note
Don’t commit firebaseConfig to public Git repos with real keys. Use environment variables in production:
Create .env.local:

bash
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
Update lib/firebase.js:
javascript


const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
Add .env.local to .gitignore.
 */


import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

//import { getStorage } from "firebase/storage";
//import { getFunctions } from "firebase/functions";
import { getRemoteConfig } from "firebase/remote-config";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA8krcj...",
  authDomain: "cs-4800-in-construction-63b73.firebaseapp.com",
  databaseUrl: "https://cs-4800-in-construction-63b73-default-rtdb.firebaseio.com/",
  projectId: "cs-4800-in-construction-63b73",
  storageBucket: "cs-4800-in-construction-63b73.firebasestorage.app",
  messagingSenderId: "430628626450",
  appId: "1:430628626450:web:a55ef8c6768ddb915e38cb",
  measurementId: "G-CRXZ621DDX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
//const functions = getFunctions(app);
const realtimeDB = getDatabase(app);
const remoteConfig = getRemoteConfig(app);

//export { db, auth, realtimeDB, remoteConfig };
export { realtimeDB as db, auth, remoteConfig };