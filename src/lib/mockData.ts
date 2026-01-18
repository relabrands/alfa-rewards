// Mock Data for Alfa Rewards PWA

export type UserRole = 'clerk' | 'salesRep' | 'manager' | 'director';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  points?: number;
  pharmacyId?: string;
  phone?: string;
  avatar?: string;
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

// Mock Pharmacies
export const pharmacies: Pharmacy[] = [
  { id: 'ph1', name: 'Farmacia Carol', address: 'Av. Winston Churchill #45, Santo Domingo', lat: 18.4861, lng: -69.9312 },
  { id: 'ph2', name: 'Farmacia Los Hidalgos', address: 'Av. 27 de Febrero #123, Santiago', lat: 19.4517, lng: -70.6970 },
  { id: 'ph3', name: 'Farmacia La Fe', address: 'C/ El Conde #78, Zona Colonial', lat: 18.4735, lng: -69.8862 },
  { id: 'ph4', name: 'Farmacia Popular', address: 'Av. Independencia #200, San Cristóbal', lat: 18.4165, lng: -70.1067 },
  { id: 'ph5', name: 'Farmacia San Juan', address: 'C/ Principal #15, La Romana', lat: 18.4273, lng: -68.9728 },
];

// Mock Users
export const mockUsers: User[] = [
  { id: 'u1', name: 'María García', role: 'clerk', points: 5400, pharmacyId: 'ph1', phone: '809-555-1234' },
  { id: 'u2', name: 'Carlos Méndez', role: 'salesRep', phone: '809-555-5678' },
  { id: 'u3', name: 'Ana Rodríguez', role: 'manager', phone: '809-555-9012' },
  { id: 'u4', name: 'Roberto Sánchez', role: 'director', phone: '809-555-3456' },
];

// Mock Registered Clerks (for Sales Rep's "My Team" section)
export const registeredClerks: RegisteredClerk[] = [
  { 
    id: 'rc1', 
    name: 'Rosa María Pérez', 
    cedula: '001-1234567-8', 
    phone: '809-555-1111',
    pharmacyId: 'ph1', 
    pharmacyName: 'Farmacia Carol',
    registeredBy: 'u2',
    registeredAt: new Date('2024-01-10'),
    status: 'active',
    pointsGenerated: 12500
  },
  { 
    id: 'rc2', 
    name: 'Juan Carlos Santos', 
    cedula: '001-2345678-9', 
    phone: '809-555-2222',
    pharmacyId: 'ph2', 
    pharmacyName: 'Farmacia Los Hidalgos',
    registeredBy: 'u2',
    registeredAt: new Date('2024-01-08'),
    status: 'active',
    pointsGenerated: 8700
  },
  { 
    id: 'rc3', 
    name: 'Carmen Luz Díaz', 
    cedula: '001-3456789-0', 
    phone: '809-555-3333',
    pharmacyId: 'ph3', 
    pharmacyName: 'Farmacia La Fe',
    registeredBy: 'u2',
    registeredAt: new Date('2024-01-12'),
    status: 'pending',
    pointsGenerated: 0
  },
  { 
    id: 'rc4', 
    name: 'Pedro Miguel Hernández', 
    cedula: '001-4567890-1', 
    phone: '809-555-4444',
    pharmacyId: 'ph4', 
    pharmacyName: 'Farmacia Popular',
    registeredBy: 'u2',
    registeredAt: new Date('2024-01-05'),
    status: 'active',
    pointsGenerated: 15200
  },
  { 
    id: 'rc5', 
    name: 'Luisa Fernanda Gómez', 
    cedula: '001-5678901-2', 
    phone: '809-555-5555',
    pharmacyId: 'ph5', 
    pharmacyName: 'Farmacia San Juan',
    registeredBy: 'u2',
    registeredAt: new Date('2024-01-14'),
    status: 'active',
    pointsGenerated: 3400
  },
];

// Mock Rewards
export const rewards: Reward[] = [
  { id: 'r1', name: 'Claro RD$100', description: 'Recarga móvil Claro', pointsCost: 500, category: 'topup', image: '📱' },
  { id: 'r2', name: 'Altice RD$200', description: 'Recarga móvil Altice', pointsCost: 1000, category: 'topup', image: '📲' },
  { id: 'r3', name: 'Supermercado RD$500', description: 'Vale para Nacional', pointsCost: 2500, category: 'voucher', image: '🛒' },
  { id: 'r4', name: 'Gasolina RD$1000', description: 'Vale combustible', pointsCost: 5000, category: 'voucher', image: '⛽' },
  { id: 'r5', name: 'Auriculares Bluetooth', description: 'Premium sound', pointsCost: 8000, category: 'prize', image: '🎧' },
  { id: 'r6', name: 'Tablet Samsung', description: 'Galaxy Tab A8', pointsCost: 25000, category: 'prize', image: '📱' },
];

// Mock Scan Records
export const scanRecords: ScanRecord[] = [
  { id: 's1', clerkId: 'u1', pharmacyId: 'ph1', invoiceAmount: 2500, pointsEarned: 250, timestamp: new Date('2024-01-15T10:30:00'), status: 'approved' },
  { id: 's2', clerkId: 'u1', pharmacyId: 'ph1', invoiceAmount: 1800, pointsEarned: 180, timestamp: new Date('2024-01-15T14:20:00'), status: 'approved' },
  { id: 's3', clerkId: 'u1', pharmacyId: 'ph2', invoiceAmount: 15000, pointsEarned: 1500, timestamp: new Date('2024-01-15T16:45:00'), status: 'flagged' },
  { id: 's4', clerkId: 'u1', pharmacyId: 'ph3', invoiceAmount: 3200, pointsEarned: 320, timestamp: new Date('2024-01-15T09:15:00'), status: 'pending' },
  { id: 's5', clerkId: 'u1', pharmacyId: 'ph4', invoiceAmount: 8500, pointsEarned: 850, timestamp: new Date('2024-01-15T11:00:00'), status: 'flagged' },
];

// Clerk scan history for profile
export const clerkScanHistory = [
  { id: 'ch1', date: new Date('2024-01-15'), invoiceNumber: 'FAC-001234', amount: 2500, points: 250, status: 'approved' as const },
  { id: 'ch2', date: new Date('2024-01-14'), invoiceNumber: 'FAC-001233', amount: 1800, points: 180, status: 'approved' as const },
  { id: 'ch3', date: new Date('2024-01-14'), invoiceNumber: 'FAC-001232', amount: 3200, points: 320, status: 'approved' as const },
  { id: 'ch4', date: new Date('2024-01-13'), invoiceNumber: 'FAC-001231', amount: 950, points: 95, status: 'approved' as const },
  { id: 'ch5', date: new Date('2024-01-13'), invoiceNumber: 'FAC-001230', amount: 4100, points: 410, status: 'pending' as const },
];

// Live scan locations for map
export const liveScanLocations = [
  { id: 'l1', lat: 18.4861, lng: -69.9312, pharmacyName: 'Farmacia Carol', clerkName: 'María G.', amount: 2500 },
  { id: 'l2', lat: 19.4517, lng: -70.6970, pharmacyName: 'Farmacia Los Hidalgos', clerkName: 'Juan P.', amount: 1200 },
  { id: 'l3', lat: 18.4735, lng: -69.8862, pharmacyName: 'Farmacia La Fe', clerkName: 'Carmen L.', amount: 3400 },
  { id: 'l4', lat: 18.4273, lng: -68.9728, pharmacyName: 'Farmacia San Juan', clerkName: 'Pedro M.', amount: 890 },
  { id: 'l5', lat: 18.5001, lng: -69.8500, pharmacyName: 'Farmacia Central', clerkName: 'Rosa D.', amount: 5600 },
];

// Dashboard stats
export const dashboardStats = {
  totalSalesToday: 'RD$ 2,450,000',
  activeClerks: 342,
  totalPharmacies: 156,
  roi: '+24.5%',
  pendingApprovals: 12,
  flaggedInvoices: 5,
};

// Roulette prizes
export const roulettePrizes = [
  { id: 'rp1', name: '100 pts', color: '#FFD700' },
  { id: 'rp2', name: '50 pts', color: '#0066CC' },
  { id: 'rp3', name: '200 pts', color: '#FFD700' },
  { id: 'rp4', name: '25 pts', color: '#0066CC' },
  { id: 'rp5', name: '500 pts', color: '#FFD700' },
  { id: 'rp6', name: '10 pts', color: '#0066CC' },
  { id: 'rp7', name: '1000 pts', color: '#FFD700' },
  { id: 'rp8', name: '75 pts', color: '#0066CC' },
];
