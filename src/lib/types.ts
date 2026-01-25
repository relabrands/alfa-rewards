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
    assignedPharmacies?: string[]; // List of pharmacy IDs this user works at
    status?: 'active' | 'pending' | 'disabled';
}

export interface Pharmacy {
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    sector?: string;
    clientCode?: string;
    isActive?: boolean;
    monthlyPoints?: number;
    scanCount?: number;
}

export interface ScanRecord {
    id: string;
    clerkId: string;
    pharmacyId: string;
    invoiceAmount: number;
    pointsEarned: number;
    timestamp: Date;
    status: 'approved' | 'pending' | 'flagged' | 'processed' | 'error' | 'uploaded';
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

export interface Product {
    id: string;
    name: string;
    keywords: string[]; // e.g., ["aspirina", "bayer"]
    points: number;
    image?: string;
}

// Stats Interfaces
export interface DashboardStats {
    totalSalesToday: number;
    totalSalesTodayFormatted: string;
    activeClerks: number;
    totalPharmacies: number;
    roi: string;
    salesChart?: any[];
    topClerks?: any[];
    recentActivity?: any[];
}
