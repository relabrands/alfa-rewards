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
    serverTimestamp
} from "firebase/firestore";
import { User, Pharmacy, ScanRecord } from "./types";

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
    const q = query(collection(db, "pharmacies"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pharmacy));
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
        where("clerkId", "==", userId),
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

export const getRegisteredClerks = async (salesRepId: string) => {
    // In a real app we would query where("registeredBy", "==", salesRepId)
    // For now getting all or filtering client side if needed, but let's try to query
    // We assume the data saved includes registeredBy
    const q = query(
        collection(db, "registered_clerks"),
        where("registeredBy", "==", salesRepId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as User));
};
