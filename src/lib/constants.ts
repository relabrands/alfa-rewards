import { Reward } from './types';

// Mock Pharmacies (Keep as fallback or for dropdowns if needed)
export const pharmacies = [
    { id: 'ph1', name: 'Farmacia Carol', address: 'Av. Winston Churchill #45, Santo Domingo', lat: 18.4861, lng: -69.9312 },
    { id: 'ph2', name: 'Farmacia Los Hidalgos', address: 'Av. 27 de Febrero #123, Santiago', lat: 19.4517, lng: -70.6970 },
    { id: 'ph3', name: 'Farmacia La Fe', address: 'C/ El Conde #78, Zona Colonial', lat: 18.4735, lng: -69.8862 },
    { id: 'ph4', name: 'Farmacia Popular', address: 'Av. Independencia #200, San Cristóbal', lat: 18.4165, lng: -70.1067 },
    { id: 'ph5', name: 'Farmacia San Juan', address: 'C/ Principal #15, La Romana', lat: 18.4273, lng: -68.9728 },
];

// Rewards List
export const rewards: Reward[] = [
    { id: 'r1', name: 'Claro RD$100', description: 'Recarga móvil Claro', pointsCost: 500, category: 'topup', image: '📱' },
    { id: 'r2', name: 'Altice RD$200', description: 'Recarga móvil Altice', pointsCost: 1000, category: 'topup', image: '📲' },
    { id: 'r3', name: 'Supermercado RD$500', description: 'Vale para Nacional', pointsCost: 2500, category: 'voucher', image: '🛒' },
    { id: 'r4', name: 'Gasolina RD$1000', description: 'Vale combustible', pointsCost: 5000, category: 'voucher', image: '⛽' },
    { id: 'r5', name: 'Auriculares Bluetooth', description: 'Premium sound', pointsCost: 8000, category: 'prize', image: '🎧' },
    { id: 'r6', name: 'Tablet Samsung', description: 'Galaxy Tab A8', pointsCost: 25000, category: 'prize', image: '📱' },
];

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

// Live scan locations for map (Mock)
export const liveScanLocations = [
    { id: 'l1', lat: 18.4861, lng: -69.9312, pharmacyName: 'Farmacia Carol', clerkName: 'María G.', amount: 2500 },
    { id: 'l2', lat: 19.4517, lng: -70.6970, pharmacyName: 'Farmacia Los Hidalgos', clerkName: 'Juan P.', amount: 1200 },
    { id: 'l3', lat: 18.4735, lng: -69.8862, pharmacyName: 'Farmacia La Fe', clerkName: 'Carmen L.', amount: 3400 },
    { id: 'l4', lat: 18.4273, lng: -68.9728, pharmacyName: 'Farmacia San Juan', clerkName: 'Pedro M.', amount: 890 },
    { id: 'l5', lat: 18.5001, lng: -69.8500, pharmacyName: 'Farmacia Central', clerkName: 'Rosa D.', amount: 5600 },
];

export const SECTORS = [
    "Distrito Nacional",
    "Santo Domingo Este",
    "Santo Domingo Oeste",
    "Santo Domingo Norte",
    "Piantini",
    "Naco",
    "Evaristo Morales",
    "Bella Vista",
    "Cacicazgos",
    "Mirador Sur",
    "Mirador Norte",
    "Los Prados",
    "Julieta Morales",
    "Paraíso",
    "Ensanche Quisqueya",
    "La Julia",
    "Zona Colonial",
    "Gascue",
    "Ciudad Universitaria",
    "Ensanche La Fe",
    "Villa Juana",
    "Villa Consuelo",
    "Arroyo Hondo",
    "Los Ríos",
    "Herrera",
    "Santiago",
    "Punta Cana",
    "La Romana",
    "Puerto Plata",
    "San Francisco de Macorís",
    "San Pedro de Macorís",
    "La Vega",
    "San Cristóbal",
    "Bani"
].sort();
