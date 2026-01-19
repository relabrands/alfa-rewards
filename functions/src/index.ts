import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { VertexAI } from '@google-cloud/vertexai';

admin.initializeApp();
const db = admin.firestore();

// Initialize Vertex AI
// NOTE: You need to enable the Vertex AI API in your Google Cloud Project.
// And ensure the Cloud Functions Service Account has "Vertex AI User" role.
const project = process.env.GCLOUD_PROJECT || 'lab-alfa-rewards';
const location = 'us-central1'; // Or your preferred region
const vertexAI = new VertexAI({ project: project, location: location });

// Instantiate Gemini model
const model = vertexAI.preview.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
        'maxOutputTokens': 2048,
        'temperature': 0.4,
        'topP': 1,
        'topK': 32,
    },
});

export const processInvoice = functions.firestore
    .document('scans/{scanId}')
    .onUpdate(async (change: functions.Change<functions.firestore.QueryDocumentSnapshot>, context: functions.EventContext) => {
        const newData = change.after.data();
        const previousData = change.before.data();

        // Only trigger when status changes to 'uploaded'
        if (newData.status !== 'uploaded' || previousData.status === 'uploaded') {
            return null;
        }

        const scanId = context.params.scanId;
        console.log(`Processing scan ${scanId} for user ${newData.userId}`);

        try {
            // 1. Fetch Active Products
            const productsSnapshot = await db.collection('products').get();
            const products = productsSnapshot.docs.map(doc => doc.data());

            // 2. Prepare Prompt
            const productNames = products.map((p: any) => p.name).join(', ');
            const prompt = `
                Analyze this invoice image. 
                I need to find if any of the following products are present: [${productNames}].
                
                For each match, extract the exact product name found and the quantity.
                Return ONLY a valid JSON object with this structure:
                {
                    "matches": [
                        { "product": "Procuct Name From List", "quantity": number, "confidence": "high/medium/low" }
                    ],
                    "invoiceDate": "YYYY-MM-DD" (if found),
                    "invoiceNumber": "string" (if found)
                }
                If no products are found, return matches as empty array. Do not include markdown formatting.
            `;

            // 3. Call Vertex AI
            // We need the file content. 
            // If imageUrl is a public URL or Signed URL, Gemini might accept it directly if Multimodal is enabled for URLs?
            // Actually, for Vertex AI Node SDK, it's best to pass the base64 or GCS URI.
            // Since we use Firebase Storage, we can construct the GCS URI: gs://<bucket>/<path>

            // Assume imageUrl is the downloadURL. We need the GCS URI or path.
            // Client should ideally store the 'storagePath' in the doc too.
            // If not, we can try to pass GCS URI if we know the bucket.
            const bucketName = admin.storage().bucket().name;
            // We need the file path inside the bucket. 
            // Let's assume the client saves 'storagePath' in the doc.

            const storagePath = newData.storagePath;
            if (!storagePath) {
                throw new Error('Storage path not found in document.');
            }

            const filePart = {
                fileData: {
                    fileUri: `gs://${bucketName}/${storagePath}`,
                    mimeType: 'image/jpeg', // Identify or dynamic
                },
            };

            const textPart = {
                text: prompt
            };

            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [filePart, textPart] }],
            });

            const response = result.response;
            const textResponse = response.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!textResponse) {
                console.error("No text response from Vertex AI");
                throw new Error("Empty response from AI");
            }

            console.log("AI Response:", textResponse);

            // 4. Parse Response & Calculate Rewards
            // Clean markdown jsons
            const jsonStr = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();

            const aiData = JSON.parse(jsonStr);

            let totalPoints = 0;
            const matchedDetails: any[] = [];

            if (aiData.matches && Array.isArray(aiData.matches)) {
                aiData.matches.forEach((match: any) => {
                    // Normalize strings for comparison: lowercase and trim
                    const matchName = (match.product || '').toLowerCase().trim();

                    const productConfig = products.find((p: any) => {
                        const dbName = (p.name || '').toLowerCase().trim();
                        return dbName === matchName || dbName.includes(matchName) || matchName.includes(dbName);
                    });

                    if (productConfig) {
                        const pointsPerUnit = Number(productConfig.points) || 0;
                        const quantity = Number(match.quantity) || 1;
                        const points = quantity * pointsPerUnit;

                        console.log(`Match Found: "${match.product}" -> "${productConfig.name}" | Qty: ${quantity} | Pts/Unit: ${pointsPerUnit} | Total: ${points}`);

                        totalPoints += points;
                        matchedDetails.push({
                            product: productConfig.name, // Use the official DB name
                            quantity: quantity,
                            points: points,
                            unitPoints: pointsPerUnit
                        });
                    } else {
                        console.warn(`No DB match for AI product: "${match.product}"`);
                    }
                });
            }

            // 5. Update Scan Document
            await db.collection('scans').doc(scanId).update({
                status: 'processed',
                pointsEarned: totalPoints,
                productsFound: matchedDetails,
                aiResponse: aiData,
                processedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // 6. Update User Wallet
            if (totalPoints > 0) {
                await db.collection('users').doc(newData.userId).update({
                    points: admin.firestore.FieldValue.increment(totalPoints)
                });
            }

            return { success: true, points: totalPoints };

        } catch (error) {
            console.error("Error processing invoice:", error);
            await db.collection('scans').doc(scanId).update({
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return null;
        }
    });

export const processIdentity = functions.firestore
    .document('identity_scans/{scanId}')
    .onUpdate(async (change: functions.Change<functions.firestore.QueryDocumentSnapshot>, context: functions.EventContext) => {
        const newData = change.after.data();
        const previousData = change.before.data();

        if (!newData || newData.status !== 'uploaded' || previousData?.status === 'uploaded') {
            return null;
        }

        const scanId = context.params.scanId;
        console.log(`Processing ID scan ${scanId}`);

        try {
            const bucketName = admin.storage().bucket().name;
            const storagePath = newData.storagePath;

            const filePart = {
                fileData: {
                    fileUri: `gs://${bucketName}/${storagePath}`,
                    mimeType: 'image/jpeg',
                },
            };

            const prompt = `
                Analyze this Dominican Republic ID Card (Cédula).
                Extract the Name and ID Number (Cédula).
                Return a valid JSON object ONLY:
                {
                    "name": "Full Name",
                    "idNumber": "000-0000000-0",
                    "confidence": "high/medium/low"
                }
            `;

            const textPart = { text: prompt };

            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [filePart, textPart] }],
            });

            const response = result.response;
            const textResponse = response.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!textResponse) throw new Error("Empty AI response");

            const jsonStr = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            const aiData = JSON.parse(jsonStr);

            await db.collection('identity_scans').doc(scanId).update({
                status: 'processed',
                data: aiData,
                processedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            return { success: true, data: aiData };

        } catch (error) {
            console.error("Error processing ID:", error);
            await db.collection('identity_scans').doc(scanId).update({
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return null;
        }
    });
