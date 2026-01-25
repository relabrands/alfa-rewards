"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processIdentity = exports.processInvoice = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const vertexai_1 = require("@google-cloud/vertexai");
admin.initializeApp();
const db = admin.firestore();
// Initialize Vertex AI
const project = process.env.GCLOUD_PROJECT || 'lab-alfa-rewards';
const location = 'us-central1';
const vertexAI = new vertexai_1.VertexAI({ project: project, location: location });
// Instantiate Gemini model
const model = vertexAI.preview.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
        'maxOutputTokens': 2048,
        'temperature': 0.2,
        'topP': 1,
        'topK': 32,
    },
});
exports.processInvoice = functions.firestore
    .document('scans/{scanId}')
    .onUpdate(async (change, context) => {
    var _a, _b, _c, _d, _e, _f;
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
        const productNames = products.map((p) => p.name).join(', ');
        const pharmaciesSnapshot = await db.collection('pharmacies').get();
        const pharmacies = pharmaciesSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        const pharmacyNames = pharmacies.map((p) => p.name).join(', ');
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
        if (!storagePath)
            throw new Error('Storage path not found.');
        const filePart = {
            fileData: {
                fileUri: `gs://${bucketName}/${storagePath}`,
                mimeType: 'image/jpeg',
            }
        };
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [filePart, { text: prompt }] }],
        });
        const textResponse = (_e = (_d = (_c = (_b = (_a = result.response.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.text;
        if (!textResponse)
            throw new Error("Empty response from AI");
        // 4. Parse & Validate
        const jsonStr = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        const aiData = JSON.parse(jsonStr);
        console.log("AI Analysis Result:", JSON.stringify(aiData));
        const updates = {
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
        }
        else if (invDate > today) {
            updates.status = 'pending_review';
            updates.rejectionReason = `Fecha futura detectada: ${aiData.invoiceDate}`;
        }
        else {
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
        // If we are here, everything is VALID
        let totalPoints = 0;
        const validProducts = [];
        aiData.products.forEach((match) => {
            const productConfig = products.find((p) => p.name === match.name);
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
        updates.pharmacyId = (_f = pharmacies.find((p) => p.name === aiData.pharmacyName)) === null || _f === void 0 ? void 0 : _f.id; // Link pharmacy ID
        await db.collection('scans').doc(scanId).update(updates);
        // Update User Wallet
        if (totalPoints > 0) {
            await db.collection('users').doc(newData.userId).update({
                points: admin.firestore.FieldValue.increment(totalPoints)
            });
        }
        return { success: true, points: totalPoints };
    }
    catch (error) {
        console.error("Error processing invoice:", error);
        await db.collection('scans').doc(scanId).update({
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        return null;
    }
});
exports.processIdentity = functions.firestore
    .document('identity_scans/{scanId}')
    .onUpdate(async (change, context) => {
    var _a, _b, _c, _d, _e;
    const newData = change.after.data();
    const previousData = change.before.data();
    if (!newData || newData.status !== 'uploaded' || (previousData === null || previousData === void 0 ? void 0 : previousData.status) === 'uploaded') {
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
        const textResponse = (_e = (_d = (_c = (_b = (_a = response.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.text;
        if (!textResponse)
            throw new Error("Empty AI response");
        const jsonStr = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        const aiData = JSON.parse(jsonStr);
        await db.collection('identity_scans').doc(scanId).update({
            status: 'processed',
            data: aiData,
            processedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return { success: true, data: aiData };
    }
    catch (error) {
        console.error("Error processing ID:", error);
        await db.collection('identity_scans').doc(scanId).update({
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        return null;
    }
});
//# sourceMappingURL=index.js.map