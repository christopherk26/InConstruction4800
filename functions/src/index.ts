import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as Tesseract from "tesseract.js";

admin.initializeApp();
const db = admin.firestore();
const storage = admin.storage();

interface VerifyData {
    userId: string;
    firstName: string;
    lastName: string;
    imageUrl: string; // Ensure this is required
}

export const verifyUserWithOCR = functions.https.onCall(
    
    async (request: functions.https.CallableRequest<VerifyData>): Promise<{ success: boolean; message: string }> => {
        const data = request.data;
        const context = request;

        console.log("Data:", data);
        console.log("Context:", context);
        

        if (!context.auth) {
            throw new functions.https.HttpsError("unauthenticated", "You must be logged in.");
        }

        const { userId, firstName, lastName, imageUrl } = data;
        if (!userId || !firstName || !lastName || !imageUrl) {
            throw new functions.https.HttpsError("invalid-argument", "Missing required fields.");
        }

        try {
            const userRef = db.collection("users").doc(userId);
            const userDoc = await userRef.get();
            if (!userDoc.exists) {
                throw new functions.https.HttpsError("not-found", "User not found.");
            }

            const fileName = imageUrl.split("/").pop() || ""; 
            const file = storage.bucket().file(fileName);

            const [buffer] = await file.download();
            const { data: { text } } = await Tesseract.recognize(buffer, "eng");
        
            const textLower = text.toLowerCase();
            console.log(textLower);

            const nameMatches = textLower.includes(firstName.toLowerCase()) && 
                               textLower.includes(lastName.toLowerCase())&& textLower.includes("sex")
                               && textLower.includes("ln") && textLower.includes("fn") && textLower.includes("class")
                               && textLower.includes("rstr") && textLower.includes("hgt")&& textLower.includes("eyes")
                               && textLower.includes("wgt")&& textLower.includes("dd")&& textLower.includes("iss")
                               && textLower.includes("hair");

            if (nameMatches) {
                await userRef.update({
                    firstName,
                    lastName,
                    verification: {
                        status: "verified",
                        method: "ocr",
                        documentUrl: imageUrl,
                        verificationDate: admin.firestore.Timestamp.now(),
                    },
                });
                return { success: true, message: "Verification successful" };
            } else {
                throw new functions.https.HttpsError("failed-precondition", "Names don’t match ID.");
            }
        } catch (error) {
            console.error("Error:", error);
            throw new functions.https.HttpsError("internal", "Verification failed.");
        }
    }
);