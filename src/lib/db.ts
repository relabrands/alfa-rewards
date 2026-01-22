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
    deleteDoc
} from "firebase/firestore";
import { User, Pharmacy, ScanRecord, Reward, Product } from "./types";

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

// Get Team Members (Clerks in Sales Rep Zones)
export const getTeamMembers = async (zones: string[]): Promise<any[]> => {
    if (!zones || zones.length === 0) return [];

    // 1. Get all clerks
    const q = query(collection(db, "users"), where("role", "==", "clerk"));
    const snapshot = await getDocs(q);
    const allClerks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));

    // 2. Filter by Zone
    const myClerks = allClerks.filter(clerk => {
        const clerkSector = clerk.zone?.[0]; // Clerk's pharmacy sector
        if (!clerkSector) return false;
        // Case-insensitive match
        return zones.some(z => z.toLowerCase() === clerkSector.toLowerCase());
    });

    // 3. Resolve Pharmacy Names
    const pharmacies = await getPharmacies();
    const phMap = new Map(pharmacies.map(p => [p.id, p]));

    // 4. Map to RegisteredClerk interface
    return myClerks.map(clerk => {
        const ph = clerk.pharmacyId ? phMap.get(clerk.pharmacyId) : undefined;
        return {
            id: clerk.id,
            name: `${clerk.name} ${clerk.lastName || ''}`.trim(),
            cedula: clerk.cedula || 'N/A',
            phone: clerk.phone || 'N/A',
            pharmacyId: clerk.pharmacyId || '',
            pharmacyName: ph ? ph.name : 'Desconocida',
            registeredBy: 'system',
            registeredAt: new Date(), // Fallback
            status: clerk.status || 'pending',
            pointsGenerated: clerk.points || 0
        };
    });
};

// Admin Stats
export const getAdminStats = async () => {
    // 1. Total Pharmacies
    const pharmaciesSnapshot = await getDocs(collection(db, "pharmacies"));
    const totalPharmacies = pharmaciesSnapshot.size;

    // 2. Active Clerks (from registered_clerks)
    const clerksSnapshot = await getDocs(query(collection(db, "registered_clerks"), where("status", "==", "active")));
    const activeClerks = clerksSnapshot.size;

    // 3. Total Sales Today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Note: Creating indexes might be required for this compound query
    // Fallback: fetch recent scans and filter client side if index missing
    const scansQ = query(
        collection(db, "scans"),
        where("timestamp", ">=", Timestamp.fromDate(today))
    );

    const scansSnapshot = await getDocs(scansQ);
    const totalSalesToday = scansSnapshot.docs.reduce((sum, doc) => sum + (doc.data().invoiceAmount || 0), 0);

    return {
        totalPharmacies,
        activeClerks,
        totalSalesToday: `RD$ ${(totalSalesToday / 1000).toFixed(1)}k`, // Formatting
        roi: `${((totalSalesToday * 0.15) / 100).toFixed(1)}%` // Mock ROI calculation
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

export const deleteProduct = async (id: string) => {
    await deleteDoc(doc(db, "products", id));
};

// Admin System Reset
export const resetSystemDatabase = async () => {
    // 1. Reset all Users' points to 0
    const usersSnapshot = await getDocs(collection(db, "users"));
    const userUpdates = usersSnapshot.docs.map(userDoc =>
        updateDoc(doc(db, "users", userDoc.id), { points: 0 })
    );

    // 2. Delete all Scans
    const scansSnapshot = await getDocs(collection(db, "scans"));
    const scanDeletes = scansSnapshot.docs.map(scanDoc =>
        deleteDoc(doc(db, "scans", scanDoc.id))
    );

    // 3. Delete all Registered Clerks (Optional, but keeps things clean)
    const clerksSnapshot = await getDocs(collection(db, "registered_clerks"));
    const clerkDeletes = clerksSnapshot.docs.map(clerkDoc =>
        deleteDoc(doc(db, "registered_clerks", clerkDoc.id))
    );

    await Promise.all([...userUpdates, ...scanDeletes, ...clerkDeletes]);
};
