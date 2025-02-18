// src/firebase.js
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
