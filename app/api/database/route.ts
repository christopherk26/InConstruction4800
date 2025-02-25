import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-server";
import { collection, getDocs } from "firebase/firestore";

type CollectionData = any[] | "not found";

export async function GET(req: NextRequest) {
  console.log("Firestore db instance:", db);

  const result: Record<string, CollectionData> = {
    users: "not found",
    communities: "not found",
    official_roles: "not found",
    community_memberships: "not found",
    user_roles: "not found",
    posts: "not found",
    comments: "not found",
    activity_logs: "not found",
    user_votes: "not found",
  };

  try {
    // Fetch data from all collections
    for (const collectionName of Object.keys(result)) {
      try {
        const snapshot = await getDocs(collection(db, collectionName));
        if (!snapshot.empty) {
          result[collectionName] = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
        }
      } catch (collectionError) {
        console.error(`Error fetching ${collectionName}:`, collectionError);
        // Continue with other collections if one fails
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