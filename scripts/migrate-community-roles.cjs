require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // Parse the credentials from environment variable
    const serviceAccount = JSON.parse(
      Buffer.from(process.env.FIREBASE_ADMIN_CREDENTIALS, 'base64').toString()
    );
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });
  } catch (error) {
    console.error('Error initializing admin SDK:', error);
    process.exit(1);
  }
}

async function migrateCommunityRoles() {
  try {
    const db = admin.firestore();
    const batch = db.batch();
    let batchCount = 0;
    const BATCH_LIMIT = 500; // Firestore batch limit

    console.log('Starting community roles migration...');

    // Get all user roles
    const userRolesSnapshot = await db.collection('user_roles').get();
    console.log(`Found ${userRolesSnapshot.size} user roles to migrate`);

    // Process each user role
    for (const userRoleDoc of userRolesSnapshot.docs) {
      const userRole = userRoleDoc.data();
      
      // Get the corresponding official role
      const officialRoleDoc = await db.collection('official_roles').doc(userRole.roleId).get();
      
      if (!officialRoleDoc.exists) {
        console.warn(`Official role ${userRole.roleId} not found for user role ${userRoleDoc.id}`);
        continue;
      }

      const officialRole = officialRoleDoc.data();

      // Create new combined role document
      const newRoleId = `${userRole.communityId}_${userRole.userId}`;
      const newRoleRef = db.collection('community_user_roles').doc(newRoleId);

      // Get user details for fullName
      const userDoc = await db.collection('users').doc(userRole.userId).get();
      const userData = userDoc.exists ? userDoc.data() : null;
      const fullName = userData ? `${userData.firstName} ${userData.lastName}` : 'Unknown User';

      // Create the new role document
      const newRole = {
        userId: userRole.userId,
        communityId: userRole.communityId,
        title: officialRole.title,
        fullName: fullName,
        permissions: officialRole.permissions,
        badge: officialRole.badge,
        assignedAt: userRole.assignedAt
      };

      // Add to batch
      batch.set(newRoleRef, newRole);
      batchCount++;

      // If we've reached the batch limit, commit and start a new batch
      if (batchCount >= BATCH_LIMIT) {
        await batch.commit();
        console.log(`Committed batch of ${batchCount} roles`);
        batchCount = 0;
      }
    }

    // Commit any remaining documents
    if (batchCount > 0) {
      await batch.commit();
      console.log(`Committed final batch of ${batchCount} roles`);
    }

    console.log('Migration completed successfully!');
    
    // Ask for confirmation before deleting old collections
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    readline.question('Do you want to delete the old collections? (yes/no): ', async (answer) => {
      if (answer.toLowerCase() === 'yes') {
        console.log('Deleting old collections...');
        
        // Delete all documents in official_roles
        const officialRolesSnapshot = await db.collection('official_roles').get();
        const officialRolesBatch = db.batch();
        officialRolesSnapshot.docs.forEach(doc => {
          officialRolesBatch.delete(doc.ref);
        });
        await officialRolesBatch.commit();
        console.log('Deleted official_roles collection');

        // Delete all documents in user_roles
        const userRolesBatch = db.batch();
        userRolesSnapshot.docs.forEach(doc => {
          userRolesBatch.delete(doc.ref);
        });
        await userRolesBatch.commit();
        console.log('Deleted user_roles collection');

        console.log('Old collections deleted successfully!');
      } else {
        console.log('Skipping deletion of old collections');
      }
      
      readline.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

// Run the migration
migrateCommunityRoles(); 