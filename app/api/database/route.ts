import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-server";
import { collection, getDocs } from "firebase/firestore";
import { FirestoreData } from "@/app/types";

type CollectionData = FirestoreData[];

export async function GET(_req: NextRequest) {


  console.log("Firestore db instance:", db);

  const result: {
    users: CollectionData;
    communities: CollectionData;
    official_roles: CollectionData;
    community_memberships: CollectionData;
    user_roles: CollectionData;
    posts: CollectionData;
    comments: CollectionData;
    activity_logs: CollectionData;
    user_votes: CollectionData;
    notifications: CollectionData;
    [key: string]: CollectionData;
  } = {
    users: [],
    communities: [],
    official_roles: [],
    community_memberships: [],
    user_roles: [],
    posts: [],
    comments: [],
    activity_logs: [],
    user_votes: [],
    notifications: [],
  };

  try {
    // Fetch data from all collections
    for (const collectionName of Object.keys(result)) {
      try {
        const snapshot = await getDocs(collection(db, collectionName));
        if (!snapshot.empty) {
          // This cast is now safe because we're using a more flexible type
          result[collectionName] = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
        }
      } catch (collectionError) {
        console.error(`Error fetching ${collectionName}:`, collectionError);
      }
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error fetching Firestore data:", error);
    return NextResponse.json(
      { ...result, error: "Partial data retrieved due to error" },
      { status: 200 }
    );
  }
}