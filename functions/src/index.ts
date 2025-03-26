import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import * as Tesseract from "tesseract.js"; 
const { fromBuffer } = require("pdf2pic");
import * as admin from "firebase-admin";


/*
VerifyUserWithOCR uses OCR to read through the given ID to verify the information given.
Since we dont have access to actual documents, we saw this strategy as the best fit.

applyForCommunity has a very similar process, using OCR on documents. However, for
documents, PDFs must be acceptable which requires an extra step: changing the PDF
file to a series of images, which are processed by OCR individually. We then iterate
through the series to see if the given info is validated in any of the pages.
*/

const app = initializeApp({
  storageBucket: "cs-4800-in-construction-63b73.firebasestorage.app"
});
const db = getFirestore(app);
const storage = getStorage(app);

interface RequestData {
  firstName: string;
  lastName: string;
  birthDate: string;
  imageUrl: string; // This will now be the storage path, e.g., "verification/<userId>/<fileName>"
}

exports.verifyUserWithOCR = onCall(async (request: { data: RequestData; auth?: { uid: string; token: any } }) => {
  try {
    logger.info("verifyUserWithOCR called (FUNCTION-ONLY ACCESS)", {
      timestamp: new Date().toISOString(),
      data: request.data,
    });

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const { firstName, lastName, birthDate, imageUrl } = request.data;

    if (!firstName || !lastName || !birthDate || !imageUrl) {
      const missingFields = [];
      if (!firstName) missingFields.push("firstName");
      if (!lastName) missingFields.push("lastName");
      if (!birthDate) missingFields.push("birthDate");
      if (!imageUrl) missingFields.push("imageUrl");
      throw new HttpsError("invalid-argument", `All fields required. Missing: ${missingFields.join(", ")}`);
    }

    // Use the provided storage path directly
    const storagePath = imageUrl; // e.g., "verification/<userId>/Drivers_Liscense.pdf"
    const file = storage.bucket().file(storagePath);

    // Optional: Check if the file exists
    const [exists] = await file.exists();
    if (!exists) {
      throw new HttpsError("not-found", `File not found at path: ${storagePath}`);
    }

    const [buffer] = await file.download();
    const ocrResult = await Tesseract.recognize(buffer, "eng");
    const textLower = ocrResult.data.text.toLowerCase();

    const birthDateVariants = [
      birthDate.toLowerCase(),
      birthDate.replace(/-/g, "/"),
      birthDate.replace(/-/g, ""),
    ];

    const nameMatches = textLower.includes(firstName.toLowerCase()) && textLower.includes(lastName.toLowerCase());
    const birthDateMatches = birthDateVariants.some((variant) => textLower.includes(variant));
    const idFieldsPresent =
      textLower.includes("class") &&
      textLower.includes("rstr") &&
      textLower.includes("eyes") &&
      textLower.includes("wgt") &&
      textLower.includes("dd") &&
      textLower.includes("hair");

    if (nameMatches &&birthDateMatches && idFieldsPresent) {
      const userRef = db.collection("users").doc(userId);
      await userRef.update({
        firstName,
        lastName,
        birthDate,
        verification: {
          status: "verified",
          method: "ocr",
          documentUrl: storagePath, // Store the storage path (or generate a download URL if preferred)
          verificationDate: Date.now(),
        },
      });
      return { message: `User ${firstName} ${lastName} successfully verified`, success: true };
    } else {
      await file.delete(); // Clean up unverified file
      throw new HttpsError("failed-precondition", "Verification failed: Names, birth date, or ID fields don’t match");
    }
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error("Unexpected error", { error: errorMessage });
    throw new HttpsError("internal", `Unexpected error: ${errorMessage}`);
  }
});

// Creating the function for applying to community

interface DataForCommunityApp {
  communityID: string;
  userAddress: string;
  userZip: string;
  docUrl: string;
  fullAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  notificationPreferences: {
    emergencyAlerts: boolean;
    generalDiscussion: boolean;
    safetyAndCrime: boolean;
    governance: boolean;
    disasterAndFire: boolean;
    businesses: boolean;
    resourcesAndRecovery: boolean;
    communityEvents: boolean;
    pushNotifications: boolean;
  };
}

exports.applyForCommunity = onCall(async (request: { data: DataForCommunityApp; auth?: { uid: string; token: any } }) => {
  try {
    logger.info("applyForCommunity called", {
      timestamp: new Date().toISOString(),
      userId: request.auth?.uid || "unauthenticated"
    });

    // Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated to apply for community membership");
    }

    const userId = request.auth.uid;
    const { 
      communityID, 
      userAddress, 
      userZip, 
      docUrl, 
      fullAddress,
      notificationPreferences 
    } = request.data;

    // Validate required fields
    if (!communityID || !userAddress || !userZip || !docUrl || !fullAddress) {
      const missingFields = [];
      if (!communityID) missingFields.push("communityID");
      if (!userAddress) missingFields.push("userAddress");
      if (!userZip) missingFields.push("userZip");
      if (!docUrl) missingFields.push("docUrl");
      if (!fullAddress) missingFields.push("fullAddress");
      throw new HttpsError("invalid-argument", `All fields required. Missing: ${missingFields.join(", ")}`);
    }

    // Get reference to the uploaded file in storage
    const storagePath = docUrl;
    const file = storage.bucket().file(storagePath);
    
    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      throw new HttpsError("not-found", `File not found at path: ${storagePath}`);
    }

    // Set default notificationPreferences if not provided
    const defaultNotificationPrefs = {
      emergencyAlerts: true,
      generalDiscussion: true,
      safetyAndCrime: true,
      governance: true,
      disasterAndFire: true,
      businesses: true,
      resourcesAndRecovery: true,
      communityEvents: true,
      pushNotifications: true
    };
    
    const finalNotificationPrefs = notificationPreferences || defaultNotificationPrefs;
    
    // Process document based on file type (PDF or image)
    let ocrText = "";
    let finalDocUrl = docUrl;
    
    const isPDF = docUrl.toLowerCase().endsWith('.pdf');
    
    if (isPDF) {
      // Download PDF and convert to image
      const [pdfBuffer] = await file.download();
      
      const options = {
        density: 100,
        saveFilename: `${userId}_${communityID}_converted`,
        savePath: "/tmp",
        format: "png",
        width: 600,
        height: 600
      };
      
      const convert = fromBuffer(pdfBuffer, options);
      const result = await convert(1, { responseType: "buffer" });
      
      // Run OCR on converted image
      const ocrResult = await Tesseract.recognize(result, "eng");
      ocrText = ocrResult.data.text.toLowerCase();
      
      // Save converted image to storage
      const imagePath = storagePath.replace('.pdf', '.png');
      const imageFile = storage.bucket().file(imagePath);
      
      await imageFile.save(result, {
        metadata: { contentType: 'image/png' }
      });
      
      finalDocUrl = imagePath;
    } else {
      // If it's an image, download and run OCR directly
      const [imageBuffer] = await file.download();
      const ocrResult = await Tesseract.recognize(imageBuffer, "eng");
      ocrText = ocrResult.data.text.toLowerCase();
    }
    
    // Verify document contains address information
    logger.info("Running address verification via OCR");
    
    // Convert address and zip to lowercase for case-insensitive matching
    const addressLower = userAddress.toLowerCase();
    const zipLower = userZip.toLowerCase();
    
    // Check if address and zip code are in the OCR text
    const addressMatches = ocrText.includes(addressLower);
    const zipMatches = ocrText.includes(zipLower);
    
    // Additional verification: look for common terms in residence documents
    const documentsTerms = [
      "utility", "bill", "statement", "account", "service",
      "electric", "water", "gas", "cable", "internet", "card", "id",
      "lease", "rental", "tenant", "residence", "property"
    ];

    // add a document term for the name of the community itself 
    // which you will need to query from the database
    
    const termsFound = documentsTerms.filter(term => ocrText.includes(term));
    const hasResidenceTerms = termsFound.length >= 2; // At least 2 terms should be found
    
    if ((addressMatches || zipMatches) && hasResidenceTerms) {
      // Verification successful, create community membership
      logger.info("Address verification successful, creating membership");
      
      // Get Firestore reference
      const db = getFirestore();
      
      // Check if user already has membership in this community
      const existingMembershipQuery = await db.collection('community_memberships')
        .where('userId', '==', userId)
        .where('communityId', '==', communityID)
        .limit(1)
        .get();
      
      if (!existingMembershipQuery.empty) {
        // Membership already exists
        logger.info("User already has membership in this community");
        return { 
          success: true, 
          message: "You are already a member of this community",
          membershipId: existingMembershipQuery.docs[0].id
        };
      }
      
      // Create community membership document
      const membershipData = {
        userId,
        communityId: communityID,
        type: 'resident', // Default to resident type
        address: {
          street: fullAddress.street,
          city: fullAddress.city,
          state: fullAddress.state,
          zipCode: fullAddress.zipCode,
          verificationDocumentUrls: [finalDocUrl]
        },
        notificationPreferences: finalNotificationPrefs,
        joinDate: admin.firestore.Timestamp.now(),
        status: 'active',
        verificationStatus: 'verified'
      };
      
      // Add to community_memberships collection
      const membershipRef = await db.collection('community_memberships').add(membershipData);
      
      // Increment community member count
      const communityRef = db.collection('communities').doc(communityID);
      const communityDoc = await communityRef.get();
      
      if (communityDoc.exists) {
        // Update stats if they exist
        if (communityDoc.data()?.stats) {
          await communityRef.update({
            'stats.memberCount': admin.firestore.FieldValue.increment(1),
            'stats.verifiedCount': admin.firestore.FieldValue.increment(1),
            'stats.lastUpdated': admin.firestore.Timestamp.now()
          });
        }
      }
      
      return { 
        success: true, 
        message: "Application approved and membership created successfully",
        membershipId: membershipRef.id
      };
    } else {
      // Verification failed
      logger.info("Address verification failed", { 
        addressFound: addressMatches, 
        zipFound: zipMatches,
        termsFound
      });
      
      // Still create membership but mark as pending
      const db = getFirestore();
      
      // Check if user already has membership in this community
      const existingMembershipQuery = await db.collection('community_memberships')
        .where('userId', '==', userId)
        .where('communityId', '==', communityID)
        .limit(1)
        .get();
      
      if (!existingMembershipQuery.empty) {
        return { 
          success: false, 
          message: "You already have a pending or active membership in this community"
        };
      }
      
      // Create pending membership
      const membershipData = {
        userId,
        communityId: communityID,
        type: 'resident',
        address: {
          street: fullAddress.street,
          city: fullAddress.city,
          state: fullAddress.state,
          zipCode: fullAddress.zipCode,
          verificationDocumentUrls: [finalDocUrl]
        },
        notificationPreferences: finalNotificationPrefs,
        joinDate: admin.firestore.Timestamp.now(),
        status: 'active',
        verificationStatus: 'pending' // Mark as pending for manual review
      };
      
      // Add to community_memberships collection
      const membershipRef = await db.collection('community_memberships').add(membershipData);
      
      return { 
        success: false, 
        message: "Address verification inconclusive. Your application has been submitted for manual review.",
        membershipId: membershipRef.id
      };
    }
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error("Unexpected error", { error: errorMessage });
    throw new HttpsError("internal", `Unexpected error: ${errorMessage}`);
  }
});