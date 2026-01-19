import * as functions from 'firebase-functions';
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
    model: 'gemini-1.5-flash-001',
    generationConfig: {
        'maxOutputTokens': 2048,
        'temperature': 0.4,
        'topP': 1,
        'topK': 32,
    },
});

export const processInvoice = functions.firestore
    .document('scans/{scanId}')
    .onUpdate(async (change, context) => {
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
                    const productConfig = products.find((p: any) => p.name.toLowerCase() === match.product.toLowerCase());
                    if (productConfig) {
                        const points = (match.quantity || 1) * (productConfig.points || 0);
                        totalPoints += points;
                        matchedDetails.push({
                            product: match.product,
                            quantity: match.quantity,
                            points: points
                        });
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
