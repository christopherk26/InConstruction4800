import { NextResponse } from "next/server";
import { db } from "@/lib/firebase"; // Adjust path to your Firebase setup
import { collection, getDocs } from "firebase/firestore";

// GET request handler
export async function GET() {
  try {
    const querySnapshot = await getDocs(collection(db, "posts"));
    const posts = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return NextResponse.json({ posts }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}