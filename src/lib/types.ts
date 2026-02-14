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
    zone?: string[]; // Deprecated for Sales Reps, kept for legacy
    assignedPharmacies?: string[]; // List of pharmacy IDs this user works at (Clerks) or covers (Sales Reps)
    productLines?: string[]; // New: For Sales Reps, list of line names they represent (e.g., ['Nutrición', 'Oftalmología'])
    status?: 'active' | 'pending' | 'disabled';
    createdAt?: any;
    scanCount?: number;
}

export interface Pharmacy {
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    sector?: string;
    city?: string; // Explicitly add city
    clientCode?: string;
    isActive?: boolean;
    monthlyPoints?: number;
    scanCount?: number;
    // New Assignment Logic
    assignedRepIds?: string[]; // Array of User IDs for easy querying
    repAssignments?: { [repId: string]: string[] }; // Map repId -> ['OTC', 'Eticos', etc.]
    // Deprecated but kept for backward compatibility if needed temporarily
    assigned_rep_id?: string;
}

export interface ScanRecord {
    id: string;
    clerkId: string;
    pharmacyId: string;
    invoiceAmount: number;
    pointsEarned: number;
    timestamp: Date;
    status: 'approved' | 'pending' | 'flagged' | 'processed' | 'error' | 'uploaded' | 'rejected' | 'pending_review';
    userId?: string; // Optional because legacy scans might use clerkId, but we are moving to userId
    ncf?: string;
    imageUrl?: string;
    rejectionReason?: string;
    productsFound?: { product: string; quantity: number; points: number }[];
    expiresAt?: Date; // Points expiration date (12 months from approval)
}

export interface Reward {
    id: string;
    name: string;
    description: string;
    pointsCost: number;
    category: 'topup' | 'voucher' | 'prize';
    image: string;
    requiresBankDetails?: boolean;
}

export interface RedemptionRequest {
    id: string;
    clerkId: string;
    clerkName: string;
    rewardId: string;
    rewardName: string;
    pointsCost: number;
    status: 'pending' | 'approved' | 'rejected';
    timestamp: Date;
    bankDetails?: {
        bankName: string;
        accountNumber: string;
        accountType: string;
    };
    targetPhoneNumber?: string;
    isOwnPhone?: boolean;
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

export interface ProductLineConfig {
    id: string;
    name: string;
    commission: number; // Percentage (0-100)
}

// Deprecated union type, moving to dynamic strings. Kept for loose typing if needed.
export type ProductLineType = string;

export interface Product {
    id: string;
    name: string;
    keywords: string[]; // e.g., ["aspirina", "bayer"]
    points: number; // Keep for backward compat or display "Avg Points"
    commission?: number; // New: Percentage (0-100) - Denormalized from Line
    image?: string;
    line?: string; // Changed from ProductLine to string to support dynamic lines
}

// Stats Interfaces
export interface DashboardStats {
    totalPointsToday: number;
    totalPointsTodayFormatted: string;
    activeClerks: number;
    totalPharmacies: number;
    roi: string;
    pointsChart?: any[];
    topClerks?: any[];
    recentActivity?: any[];
}

export interface LevelConfig {
    id: string;
    level: number;
    name: string;
    minPoints: number;
    rewardDescription: string;
    rewardImage?: string;
    color?: string; // Hex code or tailwind class
}
