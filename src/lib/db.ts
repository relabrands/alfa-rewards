import { db } from "./firebase";
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    addDoc,
    query,
    where,
    getDocs,
    orderBy,
    limit,
    Timestamp,
    serverTimestamp,
    deleteDoc,
    writeBatch,
    increment
} from "firebase/firestore";
import { User, Pharmacy, ScanRecord, Reward, Product, LevelConfig, RedemptionRequest, ProductLineConfig } from "./types";

// Users
export const getUserProfile = async (uid: string): Promise<User | null> => {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as User;
    } else {
        return null;
    }
};

export const createUserProfile = async (uid: string, data: Partial<User>) => {
    const docRef = doc(db, "users", uid);
    await setDoc(docRef, data, { merge: true });
};

export const updateUserPoints = async (uid: string, newPoints: number) => {
    const docRef = doc(db, "users", uid);
    await updateDoc(docRef, { points: newPoints });
};

export const deleteUser = async (uid: string) => {
    await deleteDoc(doc(db, "users", uid));
};

// Pharmacies
export const getPharmacies = async (): Promise<Pharmacy[]> => {
    const q = query(collection(db, "pharmacies"), orderBy("name"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pharmacy));
};

export const createPharmacy = async (data: Omit<Pharmacy, 'id'>) => {
    const docRef = await addDoc(collection(db, "pharmacies"), {
        ...data,
        isActive: true
    });
    return docRef.id;
};

export const updatePharmacy = async (id: string, data: Partial<Pharmacy>) => {
    const docRef = doc(db, "pharmacies", id);
    await updateDoc(docRef, data);
};

export const deletePharmacy = async (id: string) => {
    await deleteDoc(doc(db, "pharmacies", id));
};

// Deprecated: Moving to direct assignment
export const getPharmaciesByZone = async (zones: string[]): Promise<Pharmacy[]> => {
    if (!zones || zones.length === 0) return [];
    const q = query(collection(db, "pharmacies"));
    const querySnapshot = await getDocs(q);
    const all = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pharmacy));

    return all.filter(p => zones.some(z =>
        (p.sector && p.sector.toLowerCase().includes(z.toLowerCase())) ||
        (p.address && p.address.toLowerCase().includes(z.toLowerCase()))
    ));
};

export const getPharmaciesForRep = async (repId: string): Promise<Pharmacy[]> => {
    // 1. Try to fetch by new assignedRepIds field
    const q = query(collection(db, "pharmacies"), where("assignedRepIds", "array-contains", repId));
    const snapshot = await getDocs(q);
    const assigned = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pharmacy));

    // 2. Fallback: Fetch by legacy assigned_rep_id if not found in array (migration support)
    const qLegacy = query(collection(db, "pharmacies"), where("assigned_rep_id", "==", repId));
    const snapshotLegacy = await getDocs(qLegacy);
    const legacy = snapshotLegacy.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pharmacy));

    // Merge and Deduplicate
    const combined = [...assigned, ...legacy];
    const unique = Array.from(new Map(combined.map(p => [p.id, p])).values());

    return unique.sort((a, b) => a.name.localeCompare(b.name));
};

// Scans
export const addScanRecord = async (scanData: Omit<ScanRecord, "id" | "timestamp">) => {
    const docRef = await addDoc(collection(db, "scans"), {
        ...scanData,
        timestamp: serverTimestamp(),
    });
    return docRef.id;
};

export const getScanHistory = async (userId: string): Promise<ScanRecord[]> => {
    const q = query(
        collection(db, "scans"),
        where("userId", "==", userId),
        orderBy("timestamp", "desc"),
        limit(50)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            // Convert Firestore Timestamp to Date
            timestamp: data.timestamp?.toDate() || new Date()
        } as ScanRecord;
    });
};

export const getAllUserScans = async (userId: string): Promise<ScanRecord[]> => {
    const q = query(
        collection(db, "scans"),
        where("userId", "==", userId),
        orderBy("timestamp", "desc")
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toDate() || new Date()
        } as ScanRecord;
    });
};

export const getAllScans = async (): Promise<ScanRecord[]> => {
    const q = query(
        collection(db, "scans"),
        orderBy("timestamp", "desc"),
        limit(500)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toDate() || new Date()
        } as ScanRecord;
    });
};

// Registered Clerks (Leads/Team)
export const addRegisteredClerk = async (data: any) => {
    const docRef = await addDoc(collection(db, "registered_clerks"), {
        ...data,
        registeredAt: serverTimestamp(),
        pointsGenerated: 0,
        status: 'active' // Default to active for now
    });
    return docRef.id;
};

// Get Team Members (Clerks in Sales Rep's Pharmacies)
export const getTeamMembers = async (repId: string): Promise<any[]> => {
    // 1. Get Rep Profile to find assigned pharmacies
    const repDoc = await getDoc(doc(db, "users", repId));
    if (!repDoc.exists()) return [];

    const repData = repDoc.data() as User;
    const assignedPharmacies = repData.assignedPharmacies || [];

    if (assignedPharmacies.length === 0) return [];

    // 2. Resolve Pharmacy Names for display
    const pharmacyDocs = await Promise.all(assignedPharmacies.map(id => getDoc(doc(db, "pharmacies", id))));
    const phMap = new Map();
    pharmacyDocs.forEach(d => {
        if (d.exists()) phMap.set(d.id, d.data().name);
    });

    // 3. Get Clerks in these pharmacies
    // Firestore 'in' query supports up to 10 items. If a rep has > 10 pharmacies, we need to batch or split.
    // For now, let's assume < 30. We can do multiple queries or fetch all clerks and filter (client-side filter is fine for small scale).
    // Let's fetch all active clerks and filter in memory to avoid limit issues for now (safer for < 1000 clerks).

    const q = query(collection(db, "users"), where("role", "==", "clerk"));
    const snapshot = await getDocs(q);
    const allClerks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));

    const myClerks = allClerks.filter(clerk => {
        // Clerk must be in one of the Rep's pharmacies
        // Clerk might have 'pharmacyId' (legacy/primary) or 'assignedPharmacies' (if they work at multiple?)
        // Usually clerk has 1 pharmacyId.
        if (!clerk.pharmacyId) return false;
        return assignedPharmacies.includes(clerk.pharmacyId);
    });

    // 4. Map to RegisteredClerk interface
    return myClerks.map(clerk => {
        return {
            id: clerk.id,
            name: `${clerk.name} ${clerk.lastName || ''}`.trim(),
            cedula: clerk.cedula || 'N/A',
            phone: clerk.phone || 'N/A',
            pharmacyId: clerk.pharmacyId || '',
            pharmacyName: phMap.get(clerk.pharmacyId) || 'Desconocida',
            registeredBy: 'system',
            registeredAt: new Date(), // Fallback
            status: clerk.status || 'pending',
            pointsGenerated: clerk.points || 0
        };
    });
};

// Admin Stats
export const getAllRedemptionRequests = async () => {
    const q = query(collection(db, "redemption_requests"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RedemptionRequest));
};

// Admin Stats
export const getAdminStats = async () => {
    // 1. Total Pharmacies & Active Clerks
    const pharmaciesSnapshot = await getDocs(collection(db, "pharmacies"));
    const totalPharmacies = pharmaciesSnapshot.size;

    const clerksSnapshot = await getDocs(query(collection(db, "users"), where("role", "==", "clerk"), where("status", "==", "active")));
    const activeClerks = clerksSnapshot.size;

    // 2. Sales Analytics (Points)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    // Fetch scans from last 7 days
    const scansQ = query(
        collection(db, "scans"),
        where("timestamp", ">=", Timestamp.fromDate(sevenDaysAgo)),
        orderBy("timestamp", "asc")
    );

    const scansSnapshot = await getDocs(scansQ);
    const scans = scansSnapshot.docs.map(d => ({ ...d.data(), id: d.id }));

    // Points Today vs Yesterday
    let totalPointsToday = 0;
    let totalPointsYesterday = 0;

    scans.forEach((s: any) => {
        const sDate = s.timestamp?.toDate();
        if (!sDate) return;

        // Check for Today
        if (sDate >= today) {
            totalPointsToday += (Number(s.pointsEarned) || 0);
        }
        // Check for Yesterday (strictly between yesterday start and today start)
        else if (sDate >= yesterday && sDate < today) {
            totalPointsYesterday += (Number(s.pointsEarned) || 0);
        }
    });

    // Calculate Growth
    let growth = 0;
    if (totalPointsYesterday > 0) {
        growth = ((totalPointsToday - totalPointsYesterday) / totalPointsYesterday) * 100;
    } else if (totalPointsToday > 0) {
        growth = 100;
    }

    // Chart Data
    const pointsChart = [];
    for (let d = 0; d < 7; d++) {
        const date = new Date(sevenDaysAgo);
        date.setDate(date.getDate() + d);

        // Normalize comparison date
        const compDateStart = new Date(date);
        compDateStart.setHours(0, 0, 0, 0);
        const compDateEnd = new Date(date);
        compDateEnd.setHours(23, 59, 59, 999);

        const dayStr = date.toLocaleDateString('es-DO', { weekday: 'short', day: 'numeric' });

        const dayTotal = scans
            .filter((s: any) => {
                const sDate = s.timestamp?.toDate();
                return sDate && sDate >= compDateStart && sDate <= compDateEnd;
            })
            .reduce((sum: number, s: any) => sum + (Number(s.pointsEarned) || 0), 0);

        pointsChart.push({ name: dayStr, points: dayTotal });
    }

    // 3. Top Performers (Lifetime Points)
    // Fetch all redemption requests to calculate lifetime points
    const allRedemptions = await getAllRedemptionRequests();
    const redemptionMap = new Map<string, number>();

    allRedemptions.forEach(r => {
        const cost = r.pointsCost || 0;
        const cid = r.clerkId;
        if (cid) {
            redemptionMap.set(cid, (redemptionMap.get(cid) || 0) + cost);
        }
    });

    const clerksData = clerksSnapshot.docs.map(doc => {
        const data = doc.data();
        const currentPoints = data.points || 0;
        const redeemed = redemptionMap.get(doc.id) || 0;
        return {
            id: doc.id,
            name: data.name || 'Unknown',
            points: currentPoints,
            lifetimePoints: currentPoints + redeemed,
            pharmacyId: data.pharmacyId
        };
    });

    // Sort by LIFETIME points
    const topClerks = clerksData.sort((a, b) => b.lifetimePoints - a.lifetimePoints).slice(0, 5);

    // 4. Recent Activity
    const recentActivity = scans.reverse().slice(0, 5).map((s: any) => ({
        id: s.id,
        description: s.status === 'processed' ? 'Factura Aprobada' : 'Scan Recibido',
        points: s.pointsEarned || 0,
        timestamp: s.timestamp?.toDate().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }),
        status: s.status
    }));

    return {
        totalPharmacies,
        activeClerks,
        totalPointsToday,
        totalPointsTodayFormatted: `${totalPointsToday.toLocaleString()} pts`,
        roi: `${growth > 0 ? '+' : ''}${growth.toFixed(1)}% vs ayer`,
        pointsChart,
        topClerks,
        recentActivity
    };
};

export const getFlaggedScans = async () => {
    const q = query(collection(db, "scans"), where("status", "==", "flagged"));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toDate() || new Date()
        } as ScanRecord;
    });
};
// Admin: Get All Users
export const getAllUsers = async () => {
    const querySnapshot = await getDocs(collection(db, "users"));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
};

// Admin: Get All Pharmacies
export const getAllPharmacies = async () => {
    const querySnapshot = await getDocs(collection(db, "pharmacies"));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pharmacy));
};
// User Management
export const updateUserStatus = async (uid: string, status: 'active' | 'pending' | 'disabled') => {
    const docRef = doc(db, "users", uid);
    await updateDoc(docRef, { status });
};

export const updateUserProfile = async (uid: string, data: Partial<User>) => {
    const docRef = doc(db, "users", uid);
    await updateDoc(docRef, data);
};

export const getPendingUsers = async (pharmacyId?: string) => {
    let q;
    if (pharmacyId) {
        q = query(
            collection(db, "users"),
            where("role", "==", "clerk"),
            where("status", "==", "pending"),
            where("pharmacyId", "==", pharmacyId)
        );
    } else {
        q = query(
            collection(db, "users"),
            where("role", "==", "clerk"),
            where("status", "==", "pending")
        );
    }
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as User));
};

// Rewards Management
export const getRewards = async () => {
    const q = query(collection(db, "rewards"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reward));
};

export const createReward = async (data: Omit<Reward, 'id'>) => {
    const docRef = await addDoc(collection(db, "rewards"), data);
    return docRef.id;
};

export const deleteReward = async (id: string) => {
    await deleteDoc(doc(db, "rewards", id));
};

// --- Redemption Requests ---
export const createRedemptionRequest = async (request: Omit<RedemptionRequest, 'id'>) => {
    await addDoc(collection(db, "redemption_requests"), request);
};

export const getRedemptionRequests = async () => {
    const q = query(collection(db, "redemption_requests"), orderBy("timestamp", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toDate() || new Date()
        } as RedemptionRequest;
    });
};

export const updateRedemptionStatus = async (id: string, status: 'approved' | 'rejected') => {
    const docRef = doc(db, "redemption_requests", id);
    await updateDoc(docRef, { status });
};

export const getUserRedemptionRequests = async (userId: string) => {
    const q = query(
        collection(db, "redemption_requests"),
        where("clerkId", "==", userId)
    );
    const snapshot = await getDocs(q);
    const requests = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toDate() || new Date()
        } as RedemptionRequest;
    });

    // Sort in memory (descending)
    return requests.sort((a, b) => {
        const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return tB - tA;
    });
};

// --- Levels (Gamification) ---
export const getLevels = async () => {
    const q = query(collection(db, "levels"), orderBy("minPoints", "asc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LevelConfig));
};

export const createLevel = async (level: Omit<LevelConfig, "id">) => {
    await addDoc(collection(db, "levels"), level);
};

export const updateLevel = async (id: string, data: Partial<LevelConfig>) => {
    const docRef = doc(db, "levels", id);
    await updateDoc(docRef, data);
};

export const deleteLevel = async (id: string) => {
    await deleteDoc(doc(db, "levels", id));
};

// Product Management (For AI Scan)
export const getProducts = async () => {
    const q = query(collection(db, "products"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
};

export const createProduct = async (data: Omit<Product, 'id'>) => {
    const docRef = await addDoc(collection(db, "products"), data);
    return docRef.id;
};

export const updateProduct = async (id: string, data: Partial<Product>) => {
    const docRef = doc(db, "products", id);
    await updateDoc(docRef, data);
};

export const deleteProduct = async (id: string) => {
    await deleteDoc(doc(db, "products", id));
};

// Product Lines (Categories)
export const getProductLines = async () => {
    const q = query(collection(db, "product_lines"), orderBy("name"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductLineConfig));
};

export const createProductLine = async (data: Omit<ProductLineConfig, 'id'>) => {
    const docRef = await addDoc(collection(db, "product_lines"), data);
    return docRef.id;
};

export const updateProductLine = async (id: string, data: Partial<ProductLineConfig>) => {
    const docRef = doc(db, "product_lines", id);
    await updateDoc(docRef, data);
};

export const deleteProductLine = async (id: string) => {
    await deleteDoc(doc(db, "product_lines", id));
};

// Admin System Reset
// Helper to commit batches
const commitBatches = async (batches: any[]) => {
    await Promise.all(batches.map(b => b.commit()));
};

export const resetSystemDatabase = async () => {
    // We need to use batches because Promise.all with thousands of writes might fail or timeout.
    // Firestore batch limit is 500 operations.

    const allOps: Promise<any>[] = [];
    let batch = writeBatch(db);
    let count = 0;
    const batches = [batch];

    const addOp = () => {
        count++;
        if (count >= 500) {
            batch = writeBatch(db);
            batches.push(batch);
            count = 0;
        }
    };

    // 1. Reset all Users' points and stats
    const usersSnapshot = await getDocs(collection(db, "users"));
    usersSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
            points: 0,
            scanCount: 0,
            monthlyPoints: 0,
            monthlySales: 0
        });
        addOp();
    });

    // 2. Delete all Scans
    const scansSnapshot = await getDocs(collection(db, "scans"));
    scansSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
        addOp();
    });

    // 3. Delete all Registered Clerks
    const clerksSnapshot = await getDocs(collection(db, "registered_clerks"));
    clerksSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
        addOp();
    });

    // 4. Delete all Redemption Requests
    const redemptionsSnapshot = await getDocs(collection(db, "redemption_requests"));
    redemptionsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
        addOp();
    });

    // 5. Reset Pharmacy Stats
    const pharmaciesSnapshot = await getDocs(collection(db, "pharmacies"));
    pharmaciesSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
            scanCount: 0,
            monthlyPoints: 0,
            lifetimePoints: 0,
            monthlySales: 0
        });
        addOp();
    });

    // Commit all batches
    await Promise.all(batches.map(b => b.commit()));
};

// Advanced Analytics
export const getClerkPerformance = async () => {
    // 1. Get all active clerks
    const clerksSnapshot = await getDocs(query(collection(db, "users"), where("role", "==", "clerk"), where("status", "==", "active")));
    const clerks = clerksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));

    // 2. Get Pharmacy Map
    const pharmacies = await getPharmacies();
    const phMap = new Map(pharmacies.map(p => [p.id, p.name]));

    // 3. Get Redemptions for Lifetime Points Calculation
    const allRedemptions = await getAllRedemptionRequests();
    const redemptionMap = new Map<string, number>();

    allRedemptions.forEach(r => {
        const cost = r.pointsCost || 0;
        const cid = r.clerkId;
        if (cid) {
            redemptionMap.set(cid, (redemptionMap.get(cid) || 0) + cost);
        }
    });

    // 4. Transform to performance metrics
    return clerks.map(clerk => {
        const currentPoints = clerk.points || 0;
        const redeemed = redemptionMap.get(clerk.id) || 0;
        const lifetime = currentPoints + redeemed;

        return {
            id: clerk.id,
            name: `${clerk.name} ${clerk.lastName || ''}`.trim(),
            pharmacyName: clerk.pharmacyId ? phMap.get(clerk.pharmacyId) || 'Sin Farmacia' : 'Sin Farmacia',
            points: currentPoints,
            lifetimePoints: lifetime,
            scanCount: clerk.scanCount || 0, // Using the aggregated field from User document (which we reset correctly now)
            status: clerk.status || 'active',
            // Detailed info (mocked or from fields)
            email: clerk.email,
            phone: clerk.phone,
            cedula: clerk.cedula
        };
    }).sort((a, b) => b.lifetimePoints - a.lifetimePoints); // Sort by lifetime points
};
// Invoices rejection
export const rejectInvoice = async (scanId: string, reason: string) => {
    const scanRef = doc(db, "scans", scanId);
    const scanSnap = await getDoc(scanRef);

    if (!scanSnap.exists()) {
        throw new Error("Factura no encontrada");
    }

    const scanData = scanSnap.data() as ScanRecord;
    const { userId, pointsEarned, pharmacyId } = scanData;

    const batch = writeBatch(db);

    // 1. Update Scan Status
    batch.update(scanRef, {
        status: 'rejected',
        rejectionReason: reason
    });

    // 2. Reverse User Points (if user exists and points were > 0)
    if (userId && pointsEarned > 0) {
        const userRef = doc(db, "users", userId);
        batch.update(userRef, {
            points: increment(-pointsEarned),
            scanCount: increment(-1),
            monthlyPoints: increment(-pointsEarned),
            monthlySales: increment(-pointsEarned * 10)
        });
    }

    // 3. Reverse Pharmacy Stats (if pharmacy exists)
    if (pharmacyId && pointsEarned > 0) {
        const pharmacyRef = doc(db, "pharmacies", pharmacyId);
        batch.update(pharmacyRef, {
            scanCount: increment(-1),
            monthlyPoints: increment(-pointsEarned),
            lifetimePoints: increment(-pointsEarned)
        });
    }

    await batch.commit();
};
