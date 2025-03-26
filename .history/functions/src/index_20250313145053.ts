import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
admin.initializeApp();

const db = admin.firestore();

export const verifyUser = functions.https.onCall(async (data, context) => {
  // Ensure the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
  }

  const { userId, firstName, lastName, documentUrl } = data;

  // Validate input
  if (!userId || !firstName || !lastName || !documentUrl) {
    throw new functions.https.HttpsError("invalid-argument", "Missing required fields.");
  }

  try {
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError("not-found", "User not found.");
    }

    // Mock verification logic (replace with real ID verification service in production)
    const isValidDocument = documentUrl.includes(".pdf") || documentUrl.includes(".jpg") || documentUrl.includes(".png");
    if (!isValidDocument) {
      throw new functions.https.HttpsError("invalid-argument", "Invalid document type.");
    }

    // Simulate verification success (in reality, integrate with Onfido/ID.me)
    const verificationSuccess = true; // Mocked for demo

    if (verificationSuccess) {
      const now = admin.firestore.Timestamp.now();
      await userRef.update({
        firstName,
        lastName,
        verification: {
          status: "verified",
          method: "internal",
          documentUrls: admin.firestore.FieldValue.arrayUnion(documentUrl),
          verificationDate: now,
        },
      });
      return true;
    } else {
      throw new functions.https.HttpsError("failed-precondition", "Verification failed.");
    }
  } catch (error) {
    console.error("Error verifying user:", error);
    throw new functions.https.HttpsError("internal", "Verification process failed.");
  }
});

export const onPostCreated = functions.firestore
  .document("posts/{postId}")
  .onCreate(async (snapshot, context) => {
    try {
      // Get the newly created post data
      const post = snapshot.data();
      const postId = context.params.postId;
      const communityId = post.communityId;
      const postTitle = post.title;
      const authorName = post.author?.name || "Someone";

      // Fetch community members
      const membersSnapshot = await db
        .collection("communityMembers")
        .where("communityId", "==", communityId)
        .get();

      if (membersSnapshot.empty) {
        console.log(`No members found for community ${communityId}`);
        return null;
      }

      const memberIds = membersSnapshot.docs.map(doc => doc.data().userId);

      // Filter out the post author (optional: don't notify the poster)
      const recipients = memberIds.filter(userId => userId !== post.authorId);

      if (recipients.length === 0) {
        console.log(`No recipients to notify in community ${communityId}`);
        return null;
      }

      // Create notifications in a batch for efficiency
      const batch = db.batch();
      recipients.forEach(userId => {
        const notificationRef = db.collection("notifications").doc();
        const notificationData = {
          userId,
          communityId,
          postId,
          content: `${authorName} posted in your community: "${postTitle}"`,
          createdAt: admin.firestore.Timestamp.now(),
          status: { read: false }
        };
        batch.set(notificationRef, notificationData);
      });

      // Commit the batch
      await batch.commit();
      console.log(`Created ${recipients.length} notifications for post ${postId}`);

      return null;
    } catch (error) {
      console.error("Error creating notifications:", error);
      throw new functions.https.HttpsError("internal", "Failed to create notifications");
    }
  });
