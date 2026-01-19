export type UserRole = 'clerk' | 'salesRep' | 'manager' | 'director';

export interface User {
    id: string;
    name: string;
    lastName?: string;
    role: UserRole;
    points?: number;
    pharmacyId?: string;
    phone?: string;
    avatar?: string;
    email?: string;
    cedula?: string;
    zone?: string[];
    status?: 'active' | 'pending' | 'disabled';
}

export interface Pharmacy {
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
}

export interface ScanRecord {
    id: string;
    clerkId: string;
    pharmacyId: string;
    invoiceAmount: number;
    pointsEarned: number;
    timestamp: Date;
    status: 'approved' | 'pending' | 'flagged';
}

export interface Reward {
    id: string;
    name: string;
    description: string;
    pointsCost: number;
    category: 'topup' | 'voucher' | 'prize';
    image: string;
}

export interface RegisteredClerk {
    id: string;
    name: string;
    cedula: string;
    phone: string;
    pharmacyId: string;
    pharmacyName: string;
    registeredBy: string;
    registeredAt: Date;
    status: 'active' | 'pending';
    pointsGenerated: number;
}

// Stats Interfaces
export interface DashboardStats {
    totalSalesToday: string | number;
    activeClerks: number;
    totalPharmacies: number;
    roi: string;
}
