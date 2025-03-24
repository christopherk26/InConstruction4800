import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import * as Tesseract from "tesseract.js"; 
const { fromBuffer } = require("pdf2pic");

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
  communityID : string;
  userAddress : string;
  userZip : string;
  docUrl: string;
}


exports.applyForCommunity = onCall(async (request: { data: DataForCommunityApp; auth?: { uid: string; token: any } }) => {
  try {
    logger.info("applyForCommunity called (FUNCTION-ONLY ACCESS)", {
      timestamp: new Date().toISOString(),
      data: request.data,
    });

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userID = request.auth.uid;
    const { communityID, userAddress, userZip, docUrl } = request.data;

    if (!communityID || !userAddress || !userZip || !docUrl) {
      const missingFields = [];
      if (!communityID) missingFields.push("communityID");
      if (!userAddress) missingFields.push("userAddress");
      if (!userZip) missingFields.push("userZip");
      if (!docUrl) missingFields.push("docUrl");
      throw new HttpsError("invalid-argument", `All fields required. Missing: ${missingFields.join(", ")}`);
    }

    const storagePath = docUrl;
    const file = storage.bucket().file(storagePath);
    
    let finalDocUrl = docUrl;

    const isPDF = docUrl.endsWith('.pdf');
    let ocrText = ""; // To store OCR results

    if (isPDF) {
      const [pdfBuffer] = await file.download();

      const options = {
        density: 100,
        saveFilename: `${userID}_${communityID}_converted`,
        savePath: "/tmp",
        format: "png",
        width: 600,
        height: 600
      };

      const convert = fromBuffer(pdfBuffer, options);
      const result = await convert(1, { responseType: "buffer" });

      // Run OCR on the result buffer
      const ocrResult = await Tesseract.recognize(result, "eng");
      ocrText = ocrResult.data.text.toLowerCase();

      // Save the converted image to storage
      const imagePath = storagePath.replace('.pdf', '.png');
      const imageFile = storage.bucket().file(imagePath);

      await imageFile.save(result, {
        metadata: { contentType: 'image/png' }
      });

      finalDocUrl = imagePath;
    } else {
      // If not PDF, download and run OCR directly on the image
      const [imageBuffer] = await file.download();
      const ocrResult = await Tesseract.recognize(imageBuffer, "eng");
      ocrText = ocrResult.data.text.toLowerCase();
    }

    // Example OCR validation (adapt to your needs)
    const addressMatches = ocrText.includes(userAddress.toLowerCase());
    const zipMatches = ocrText.includes(userZip.toLowerCase());

    if (addressMatches && zipMatches) {
      const applicationData = {
        userID,
        communityID,
        userAddress,
        userZip,
        docUrl: finalDocUrl,
        ocrVerified: true,
      };

      // Add your logic here, e.g., save to Firestore
      // const db = getFirestore();
      // await db.collection("communityApplications").doc().set(applicationData);

      return { message: "Document verified and application submitted", success: true };
    } else {
      throw new HttpsError("failed-precondition", "Verification failed: Address or ZIP code not found in document");
    }

  } catch (err) {
    if (err instanceof HttpsError) throw err;
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error("Unexpected error", { error: errorMessage });
    throw new HttpsError("internal", `Unexpected error: ${errorMessage}`);
  }
});