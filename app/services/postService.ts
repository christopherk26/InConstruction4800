export async function createPost(postData: Omit<Post, 'id' | 'createdAt' | 'stats'>): Promise<FirestoreData> {
  try {
      // Set default values
      const now = Timestamp.now();
      const newPost = {
          ...postData,
          createdAt: now,
          status: 'active',
          stats: {
              upvotes: 0,
              downvotes: 0,
              commentCount: 0
          }
      };

      // Add the post to Firestore
      const docRef = await addDoc(collection(db, 'posts'), newPost);

      // Log activity
      await addDoc(collection(db, 'activity_logs'), {
          userId: postData.authorId,
          communityId: postData.communityId,
          type: 'post_create',
          targetId: docRef.id,
          details: {},
          createdAt: now
      });

      // Get all followers of the author
      const followersSnapshot = await getDocs(
          query(collection(db, 'followers', postData.authorId, 'following'))
      );

      // Send notifications to all followers
      const batch = db.batch();
      followersSnapshot.forEach((doc) => {
          const followerId = doc.id;
          const notificationRef = doc(
              collection(db, "users", followerId, "notifications")
          );

          batch.set(notificationRef, {
              postId: docRef.id,
              authorId: postData.authorId,
              message: `${postData.authorId} posted something new!`,
              read: false,
              createdAt: now,
          });
      });

      await batch.commit();

      return {
          id: docRef.id,
          ...newPost
      };
  } catch (error) {
      console.error('Error creating post:', error);
      throw error;
  }
}
