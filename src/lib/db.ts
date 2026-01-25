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
    // 1. Total Pharmacies & Active Clerks
    const pharmaciesSnapshot = await getDocs(collection(db, "pharmacies"));
    const totalPharmacies = pharmaciesSnapshot.size;

    const clerksSnapshot = await getDocs(query(collection(db, "users"), where("role", "==", "clerk")));
    const activeClerks = clerksSnapshot.size;

    // 2. Sales Analytics (Last 7 Days)
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const scansQ = query(
        collection(db, "scans"),
        where("timestamp", ">=", Timestamp.fromDate(sevenDaysAgo)),
        orderBy("timestamp", "asc") // Ordered for chart
    );

    const scansSnapshot = await getDocs(scansQ);
    const scans = scansSnapshot.docs.map(d => d.data());

    // Calc Daily Points for Chart
    const pointsChart = [];
    let totalPointsToday = 0;
    const now = new Date();

    for (let d = 0; d < 7; d++) {
        const date = new Date(sevenDaysAgo);
        date.setDate(date.getDate() + d);
        const dayStr = date.toLocaleDateString('es-DO', { weekday: 'short', day: 'numeric' });

        // Filter scans for this day
        const dayTotal = scans
            .filter((s: any) => {
                const sDate = s.timestamp?.toDate();
                return sDate && sDate.getDate() === date.getDate() && sDate.getMonth() === date.getMonth();
            })
            .reduce((sum: number, s: any) => sum + (Number(s.pointsEarned) || 0), 0);

        pointsChart.push({ name: dayStr, points: dayTotal });

        // If it's today (roughly)
        if (date.getDate() === now.getDate()) {
            totalPointsToday = dayTotal;
        }
    }

    // 3. Top Performers (Client-side sort of all clerks for now)
    // In production, maintain a counter in a separate stats doc
    const clerksData = clerksSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || 'Unknown',
        points: doc.data().points || 0,
        pharmacyId: doc.data().pharmacyId
    }));
    const topClerks = clerksData.sort((a, b) => b.points - a.points).slice(0, 5);

    // 4. Recent Activity (Already fetched scans, but let's take last 5 reverse)
    const recentActivity = scans.reverse().slice(0, 5).map((s: any) => ({
        id: s.id || Math.random().toString(),
        description: s.status === 'processed' ? 'Factura Aprobada' : 'Scan Recibido',
        points: s.pointsEarned || 0,
        timestamp: s.timestamp?.toDate().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }),
        status: s.status
    }));

    return {
        totalPharmacies,
        activeClerks,
        totalPointsToday, // Raw number
        totalPointsTodayFormatted: `${totalPointsToday.toLocaleString()} pts`,
        roi: `+15%`, // Hardcoded growth for now
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

// Advanced Analytics
export const getClerkPerformance = async () => {
    // 1. Get all clerks
    const clerksSnapshot = await getDocs(query(collection(db, "users"), where("role", "==", "clerk")));
    const clerks = clerksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));

    // 2. Get Pharmacy Map
    const pharmacies = await getPharmacies();
    const phMap = new Map(pharmacies.map(p => [p.id, p.name]));

    // 3. Transform to performance metrics
    // Note: In a real scaled app, we would use a dedicated 'stats' subcollection or aggregation.
    // For now, we use the live 'points' field on the user document.
    return clerks.map(clerk => ({
        id: clerk.id,
        name: `${clerk.name} ${clerk.lastName || ''}`.trim(),
        pharmacyName: clerk.pharmacyId ? phMap.get(clerk.pharmacyId) || 'Sin Farmacia' : 'Sin Farmacia',
        points: clerk.points || 0,
        // Optional: We could fetch last scan date if we really needed it, but skipping for speed for now.
        status: clerk.status || 'active'
    })).sort((a, b) => b.points - a.points);
};
