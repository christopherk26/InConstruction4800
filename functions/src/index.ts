import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import * as Tesseract from "tesseract.js";

initializeApp();
const db = getFirestore();
const storage = getStorage();

// Define the expected data structure from the client
interface RequestData {
  userId: string;
  firstName: string;
  lastName: string;
  imageUrl: string;
}

exports.verifyUserWithOCR = onCall(async (request: { data: RequestData; auth?: { uid: string; token: any } }) => {
  try {
    // Log the incoming request
    logger.info("verifyUserWithOCR called", {
      userId: request.data.userId,
      timestamp: new Date().toISOString(),
      data: request.data,
    });

    // Check authentication
    if (!request.auth) {
      logger.warn("Unauthenticated request attempt");
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    // Destructure and validate input
    const { userId, firstName, lastName, imageUrl } = request.data;
    if (!userId || !firstName || !lastName || !imageUrl) {
      logger.error("Missing required fields", { data: request.data });
      throw new HttpsError("invalid-argument", "All fields (userId, firstName, lastName, imageUrl) are required");
    }

    // Validate imageUrl
    if (!imageUrl.startsWith("http://") && !imageUrl.startsWith("https://")) {
      logger.error("Invalid image URL format", { imageUrl });
      throw new HttpsError("invalid-argument", "imageUrl must be a valid URL");
    }

    // Check userId matches auth UID
    if (request.auth.uid !== userId) {
      logger.warn("User ID mismatch", { authUid: request.auth.uid, providedUid: userId });
      throw new HttpsError("permission-denied", "User ID does not match authenticated user");
    }

    // Verify user exists in Firestore
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      logger.warn("User not found in Firestore", { userId });
      throw new HttpsError("not-found", "User not found");
    }

    // Construct and validate Storage path
    const fileName = imageUrl.split("/").pop()?.split("?")[0] || "";
    const storagePath = `verification/${userId}/${fileName}`;
    logger.info("Attempting to download file", { storagePath, imageUrl });

    const file = storage.bucket().file(storagePath);
    const [buffer] = await file.download().catch((err: Error) => {
      logger.error("Storage download failed", { error: err.message, stack: err.stack });
      throw new HttpsError("internal", `Failed to download file from Storage: ${err.message}`);
    });

    // Perform OCR
    logger.info("Starting OCR processing", { fileName });
    const { data: { text } } = await Tesseract.recognize(buffer, "eng", {
      logger: (m: Tesseract.LoggerMessage) => logger.debug("Tesseract progress", m),
    }).catch((err: Error) => {
      logger.error("OCR processing failed", { error: err.message, stack: err.stack });
      throw new HttpsError("internal", `OCR processing failed: ${err.message}`);
    });
    const textLower = text.toLowerCase();
    logger.info("OCR text extracted", { text: textLower });

    // Verify name and ID fields
    const nameMatches = textLower.includes(firstName.toLowerCase()) && textLower.includes(lastName.toLowerCase());
    const idFieldsPresent =
      textLower.includes("ln") &&
      textLower.includes("fn") &&
      textLower.includes("class") &&
      textLower.includes("rstr") &&
      textLower.includes("hgt") &&
      textLower.includes("eyes") &&
      textLower.includes("wgt") &&
      textLower.includes("dd") &&
      textLower.includes("iss") &&
      textLower.includes("hair");

    if (nameMatches && idFieldsPresent) {
      logger.info("Verification successful", { userId, firstName, lastName });
      await userRef.update({
        firstName,
        lastName,
        verification: {
          status: "verified",
          method: "ocr",
          documentUrl: imageUrl,
          verificationDate: Date.now(),
        },
      });
      return { message: `User ${firstName} ${lastName} successfully verified`, success: true };
    } else {
      logger.warn("Verification failed", { nameMatches, idFieldsPresent, text: textLower });
      throw new HttpsError("failed-precondition", "Document verification failed: Names or required ID fields don’t match");
    }
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    logger.error("Unexpected error in verifyUserWithOCR", { error: (error as Error).message, stack: (error as Error).stack });
    throw new HttpsError("internal", `Unexpected error: ${(error as Error).message}`);
  }
});