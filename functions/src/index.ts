import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { VertexAI } from '@google-cloud/vertexai';

admin.initializeApp();
const db = admin.firestore();

// Initialize Vertex AI
const project = process.env.GCLOUD_PROJECT || 'lab-alfa-rewards';
const location = 'us-central1';
const vertexAI = new VertexAI({ project: project, location: location });

// Instantiate Gemini model
const model = vertexAI.preview.getGenerativeModel({
    model: 'gemini-2.5-flash', // User specified model
    generationConfig: {
        'maxOutputTokens': 2048,
        'temperature': 0.2, // Lower temperature for more deterministic/strict output
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
            // 1. Fetch Active Products & Pharmacies
            const productsSnapshot = await db.collection('products').get();
            const products = productsSnapshot.docs.map(doc => doc.data());
            const productNames = products.map((p: any) => p.name).join(', ');

            const pharmaciesSnapshot = await db.collection('pharmacies').get();
            const pharmacies = pharmaciesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const pharmacyNames = pharmacies.map((p: any) => p.name).join(', ');

            console.log(`Context: ${products.length} products, ${pharmacies.length} pharmacies.`);

            // 2. Strict Prompt Construction
            const prompt = `
                Analyze this invoice image STRICTLY.
                
                You must extract and validate the following information against my provided lists:

                1. PHARMACY MATCHING:
                   - Extract the pharmacy name from the header.
                   - Check if it matches ANY of these registered pharmacies: [${pharmacyNames}].
                   - If it matches (even with slight variation), return the EXACT registered name.
                   - If it does NOT match any, return null for pharmacyName.

                2. NCF (Comprobante Fiscal):
                   - Extract the NCF code (e.g. B0100000001, E4500000001). 
                   - It MUST start with 'B01', 'B02', or 'E'.
                   - If not found or invalid format, return null.

                3. DATE:
                   - Extract invoice date (YYYY-MM-DD).
                   - If invalid or not found, return null.

                4. PRODUCTS:
                   - Look for these specific active products: [${productNames}].
                   - Return ONLY products that appear in this list.
                   - for each match, extract quantity.

                5. TOTAL AMOUNT:
                   - Extract the total invoice amount.

                Return a JSON object ONLY (no markdown):
                {
                    "pharmacyName": "Registered Name" | null,
                    "ncf": "String" | null,
                    "invoiceDate": "YYYY-MM-DD" | null,
                    "products": [ { "name": "Registered Product Name", "quantity": number } ],
                    "totalAmount": number,
                    "rawPharmacyName": "What you actually saw",
                    "confidence": "high" | "medium" | "low"
                }
            `;

            // 3. Call Vertex AI
            const bucketName = admin.storage().bucket().name;
            const storagePath = newData.storagePath;
            if (!storagePath) throw new Error('Storage path not found.');

            const filePart = {
                fileData: {
                    fileUri: `gs://${bucketName}/${storagePath}`,
                    mimeType: 'image/jpeg',
                }
            };

            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [filePart, { text: prompt }] }],
            });

            const textResponse = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!textResponse) throw new Error("Empty response from AI");

            // 4. Parse & Validate
            const jsonStr = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            const aiData = JSON.parse(jsonStr);
            console.log("AI Analysis Result:", JSON.stringify(aiData));

            const updates: any = {
                aiResponse: aiData,
                processedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            // --- STRICT VALIDATION CHAIN ---

            // Check 1: Pharmacy
            if (!aiData.pharmacyName) {
                updates.status = 'rejected';
                updates.rejectionReason = `Farmacia no registrada o no identificada: "${aiData.rawPharmacyName || 'Desconocida'}"`;
                console.log(`Scan ${scanId} rejected: Invalid Pharmacy`);
                await db.collection('scans').doc(scanId).update(updates);
                return null;
            }

            // Check 2: Products
            if (!aiData.products || aiData.products.length === 0) {
                updates.status = 'rejected';
                updates.rejectionReason = 'No se encontraron productos participantes';
                console.log(`Scan ${scanId} rejected: No products`);
                await db.collection('scans').doc(scanId).update(updates);
                return null;
            }

            // Check 3: NCF Validity & Duplication
            if (!aiData.ncf || !/^(B01|B02|E)/i.test(aiData.ncf)) {
                updates.status = 'pending_review'; // Or rejected? User said "PENDIENTE DE REVISIÓN" for Date/Coherence, but NCF usually strict. Let's start strictly.
                // Actually user said: "Si el NCF ya existe... DUPLICADA". "Si fecha no valida... PENDIENTE".
                // Doesn't explicitly say what to do if NCF invalid format, but implies strictness.
                updates.status = 'rejected';
                updates.rejectionReason = `NCF Inválido o no legible: ${aiData.ncf}`;
                await db.collection('scans').doc(scanId).update(updates);
                return null;
            }

            // Check Duplication
            const duplicateCheck = await db.collection('scans')
                .where('ncf', '==', aiData.ncf)
                .get();

            // Filter out current doc (in case of re-run, unlikely but safe)
            const isDuplicate = duplicateCheck.docs.some(d => d.id !== scanId);

            if (isDuplicate) {
                updates.status = 'rejected';
                updates.rejectionReason = `Factura Duplicada (NCF: ${aiData.ncf})`;
                console.log(`Scan ${scanId} rejected: Duplicate NCF`);
                await db.collection('scans').doc(scanId).update(updates);
                return null;
            }

            // Check 4: Date
            const today = new Date();
            const invDate = aiData.invoiceDate ? new Date(aiData.invoiceDate) : null;

            if (!invDate || isNaN(invDate.getTime())) {
                updates.status = 'pending_review';
                updates.rejectionReason = 'Fecha ilegible';
            } else if (invDate > today) {
                updates.status = 'pending_review';
                updates.rejectionReason = `Fecha futura detectada: ${aiData.invoiceDate}`;
            } else {
                // Date is OK
            }

            // Check 5: Coherence (Simple check)
            if (!aiData.totalAmount || aiData.totalAmount < 10) { // arbitrary sanity check
                updates.status = updates.status === 'pending_review' ? updates.status : 'pending_review';
                updates.rejectionReason = updates.rejectionReason || 'Monto total sospechosamente bajo';
            }

            // Stop if pending review
            if (updates.status === 'pending_review') {
                console.log(`Scan ${scanId} flagged for review: ${updates.rejectionReason}`);
                await db.collection('scans').doc(scanId).update(updates);
                return null;
            }

            // 5. Strict Pharmacy Assignment Validation
            const userRef = db.collection('users').doc(newData.userId);
            const userSnap = await userRef.get();
            if (!userSnap.exists) {
                // Should not happen, but safe fail
                throw new Error("User not found");
            }
            const userData = userSnap.data();

            // Get detected pharmacy configuration
            const matchedPharmacy = pharmacies.find((p: any) => p.name === aiData.pharmacyName);
            if (!matchedPharmacy) {
                // Already checked in Check 1, but double safety
                return null;
            }

            // Allowed Pharmacy IDs
            const allowedPharmacies = userData?.assignedPharmacies || [];
            if (userData?.pharmacyId) allowedPharmacies.push(userData.pharmacyId);

            // Strict Check
            if (!allowedPharmacies.includes(matchedPharmacy.id)) {
                updates.status = 'rejected';
                updates.rejectionReason = `Farmacia no autorizada para este usuario. (Detectada: ${aiData.pharmacyName})`;
                console.log(`Scan ${scanId} rejected: Pharmacy ${matchedPharmacy.id} not in user's assigned list [${allowedPharmacies.join(', ')}]`);
                await db.collection('scans').doc(scanId).update(updates);
                return null;
            }

            // If we are here, everything is VALID
            let totalPoints = 0;
            const validProducts: any[] = [];

            aiData.products.forEach((match: any) => {
                const productConfig = products.find((p: any) => p.name === match.name);
                if (productConfig) {
                    const pointsPerUnit = Number(productConfig.points) || 0;
                    const quantity = Number(match.quantity) || 1;
                    const points = quantity * pointsPerUnit;
                    totalPoints += points;
                    validProducts.push({
                        product: match.name,
                        quantity,
                        points
                    });
                }
            });

            updates.status = 'processed';
            updates.pointsEarned = totalPoints;
            updates.productsFound = validProducts;
            updates.ncf = aiData.ncf;
            updates.invoiceDate = aiData.invoiceDate;
            updates.pharmacyId = matchedPharmacy.id; // Link pharmacy ID

            await db.collection('scans').doc(scanId).update(updates);

            // Update User Wallet & Stats
            const userUpdatePromise = totalPoints > 0 ?
                db.collection('users').doc(newData.userId).update({
                    points: admin.firestore.FieldValue.increment(totalPoints),
                    scanCount: admin.firestore.FieldValue.increment(1)
                }) :
                db.collection('users').doc(newData.userId).update({
                    scanCount: admin.firestore.FieldValue.increment(1)
                });

            // Update Pharmacy Stats (Scan Count & Sales)
            const pharmacyUpdatePromise = db.collection('pharmacies').doc(matchedPharmacy.id).update({
                scanCount: admin.firestore.FieldValue.increment(1),
                monthlySales: admin.firestore.FieldValue.increment(aiData.totalAmount || 0)
            });

            await Promise.all([userUpdatePromise, pharmacyUpdatePromise]);

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
