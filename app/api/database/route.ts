import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-server"; // Adjusted import
import { collection, getDocs } from "firebase/firestore";

type CollectionData = string | any[];

export async function GET(req: NextRequest) {
  console.log("Firestore db instance:", db);

  const result: {
    users: CollectionData;
    posts: CollectionData;
    communities: CollectionData;
  } = {
    users: "not found",
    posts: "not found",
    communities: "not found",
  };

  try {
    const usersSnapshot = await getDocs(collection(db, "users"));
    if (!usersSnapshot.empty) {
      result.users = usersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    }

    const postsSnapshot = await getDocs(collection(db, "posts"));
    if (!postsSnapshot.empty) {
      result.posts = postsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    }

    const communitiesSnapshot = await getDocs(collection(db, "communities"));
    if (!communitiesSnapshot.empty) {
      result.communities = communitiesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
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