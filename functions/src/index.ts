import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import * as Tesseract from "tesseract.js";

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
    console.log(textLower)

    //const birthDateVariants = [
      //birthDate.toLowerCase(),
      //birthDate.replace(/-/g, "/"),
      //birthDate.replace(/-/g, ""),
    //];

    const nameMatches = textLower.includes(firstName.toLowerCase()) && textLower.includes(lastName.toLowerCase());
    // const birthDateMatches = birthDateVariants.some((variant) => textLower.includes(variant));
    const idFieldsPresent =
      textLower.includes("class") &&
      textLower.includes("rstr") &&
      textLower.includes("eyes") &&
      textLower.includes("wgt") &&
      textLower.includes("dd") &&
      textLower.includes("hair");

    if (nameMatches && idFieldsPresent) {
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