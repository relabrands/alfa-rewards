import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
    Users, Building2, ShoppingBag, ArrowLeft, ChevronRight, Search,
    TrendingUp, Activity, User, Package, Calendar
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// --- Types ---
interface Pharmacy {
    id: string;
    name: string;
    city?: string;
    zone?: string;
    monthlySales: number;
    scanCount?: number;
    image?: string;
    monthlyPoints?: number;
}

interface Clerk {
    id: string;
    name: string;
    pharmacyId: string;
    assignedPharmacies: string[]; // Added support for multi-pharmacy
    points: number;
    scans: number;
    lastActive?: any;
}

interface ProductScan {
    product: string;
    quantity: number;
    timestamp: Date;
}

export default function DirectorMapAnalytics() {
    // Data State
    const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
    const [allClerks, setAllClerks] = useState<Clerk[]>([]);

    // Navigation State
    const [view, setView] = useState<'list' | 'pharmacy' | 'clerk'>('list');
    const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null);
    const [selectedClerk, setSelectedClerk] = useState<Clerk | null>(null);
    const [clerkScans, setClerkScans] = useState<ProductScan[]>([]);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');

    // 1. Fetch Pharmacies Realtime
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "pharmacies"), (snapshot) => {
            const loaded = snapshot.docs.map(doc => ({
                id: doc.id,
                name: doc.data().name,
                city: doc.data().city || 'Desconocido',
                zone: doc.data().zone || doc.data().sector,
                monthlySales: doc.data().monthlySales || 0,
                scanCount: doc.data().scanCount || 0,
                image: doc.data().image
            } as Pharmacy));
            setPharmacies(loaded);
        });
        return () => unsubscribe();
    }, []);
    useEffect(() => {
        const q = query(collection(db, "users"), where("role", "==", "clerk"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loaded = snapshot.docs.map(doc => ({
                id: doc.id,
                name: `${doc.data().name} ${doc.data().lastName || ''}`.trim(),
                pharmacyId: doc.data().pharmacyId,
                assignedPharmacies: doc.data().assignedPharmacies || (doc.data().pharmacyId ? [doc.data().pharmacyId] : []),
                points: doc.data().points || 0,
                scans: doc.data().scanCount || 0, // scanCount should be updated by backend
                lastActive: doc.data().lastActive
            } as Clerk));
            setAllClerks(loaded);
        });
        return () => unsubscribe();
    }, []);

    // 3. Fetch Clerk Scans (When viewing a clerk)
    useEffect(() => {
        if (view === 'clerk' && selectedClerk) {
            console.log("Fetching scans for clerk:", selectedClerk.id);
            const q = query(
                collection(db, "scans"),
                where("userId", "==", selectedClerk.id),
                where("status", "==", "processed"),
                orderBy("timestamp", "desc"),
                limit(100)
            );

            const unsubscribe = onSnapshot(q, (snapshot) => {
                console.log("Scans Snapshot Size:", snapshot.size);
                const products: ProductScan[] = [];
                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    if (data.productsFound) {
                        data.productsFound.forEach((p: any) => {
                            products.push({
                                product: p.product,
                                quantity: p.quantity || 1,
                                timestamp: data.timestamp?.toDate()
                            });
                        });
                    }
                });
                console.log("Aggregated Products Count:", products.length);
                setClerkScans(products);
            });
            return () => unsubscribe();
        } else {
            setClerkScans([]);
        }
    }, [view, selectedClerk]);

    // Navigation Handlers
    const handleSelectPharmacy = (p: Pharmacy) => {
        setSelectedPharmacy(p);
        setView('pharmacy');
    };

    const handleSelectClerk = (c: Clerk) => {
        setSelectedClerk(c);
        setView('clerk');
    };

    const goBack = () => {
        if (view === 'clerk') setView('pharmacy');
        else if (view === 'pharmacy') setView('list');
    };

    // Computations
    const filteredPharmacies = pharmacies.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.city?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const pharmacyClerks = useMemo(() => {
        if (!selectedPharmacy) return [];
        return allClerks
            .filter(c => {
                // Check if pharmacy is in the assigned list OR matches the legacy ID
                return (c.assignedPharmacies && c.assignedPharmacies.includes(selectedPharmacy.id)) ||
                    c.pharmacyId === selectedPharmacy.id;
            })
            .sort((a, b) => b.points - a.points);
    }, [allClerks, selectedPharmacy]);

    const aggregatedProducts = useMemo(() => {
        const stats: Record<string, number> = {};
        clerkScans.forEach(s => {
            stats[s.product] = (stats[s.product] || 0) + s.quantity;
        });
        return Object.entries(stats)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }, [clerkScans]);



    return (
        <div className="h-[calc(100vh-6rem)] w-full flex flex-col gap-4 animate-in fade-in duration-300">
            {/* Header / Breadcrumbs */}
            <div className="flex items-center gap-2 pb-2 border-b">
                {view !== 'list' && (
                    <Button variant="ghost" size="icon" onClick={goBack}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                )}
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <span className={view === 'list' ? 'text-primary font-bold' : ''}>Analytics</span>
                    {selectedPharmacy && (
                        <>
                            <ChevronRight className="h-4 w-4" />
                            <span className={view === 'pharmacy' ? 'text-primary font-bold' : ''}>
                                {selectedPharmacy.name}
                            </span>
                        </>
                    )}
                    {selectedClerk && (
                        <>
                            <ChevronRight className="h-4 w-4" />
                            <span className={view === 'clerk' ? 'text-primary font-bold' : ''}>
                                {selectedClerk.name}
                            </span>
                        </>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <ScrollArea className="flex-1">
                {view === 'list' && (
                    <div className="space-y-6 p-1">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Building2 className="text-primary" /> Farmacias Activas
                            </h2>
                            <div className="relative w-64">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar farmacia..."
                                    className="pl-8"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredPharmacies.map(pharmacy => (
                                <Card
                                    key={pharmacy.id}
                                    className="cursor-pointer hover:shadow-lg transition-all border-none bg-white/50 hover:bg-white"
                                    onClick={() => handleSelectPharmacy(pharmacy)}
                                >
                                    <CardContent className="p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-md">
                                                <Building2 className="h-6 w-6" />
                                            </div>
                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                Activa
                                            </Badge>
                                        </div>
                                        <h3 className="font-bold text-lg mb-1">{pharmacy.name}</h3>
                                        <p className="text-sm text-muted-foreground flex items-center gap-1 mb-4">
                                            <TrendingUp className="h-3 w-3" />
                                            {pharmacy.city || pharmacy.zone}
                                        </p>

                                        <div className="grid grid-cols-2 gap-2 pt-4 border-t">
                                            <div>
                                                <p className="text-xs text-muted-foreground uppercase">Puntos Mes</p>
                                                <p className="font-bold text-lg text-primary">{pharmacy.monthlyPoints?.toLocaleString() || 0}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-muted-foreground uppercase">Escaneos</p>
                                                <p className="font-bold text-lg">{pharmacy.scanCount || 0}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {view === 'pharmacy' && selectedPharmacy && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 p-1">
                        <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-none shadow-lg">
                            <CardContent className="p-8">
                                <h1 className="text-3xl font-bold mb-2">{selectedPharmacy.name}</h1>
                                <div className="flex gap-6 mt-4">
                                    <div>
                                        <p className="text-blue-100 text-sm">Ciudad / Zona</p>
                                        <p className="font-bold">{selectedPharmacy.city} - {selectedPharmacy.zone}</p>
                                    </div>
                                    <div>
                                        <p className="text-blue-100 text-sm">Puntos Mensuales</p>
                                        <p className="font-bold text-xl">{selectedPharmacy.monthlyPoints?.toLocaleString() || 0} pts</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div>
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <Users className="h-5 w-5 text-primary" />
                                Dependientes Asignados ({pharmacyClerks.length})
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {pharmacyClerks.map((clerk, index) => (
                                    <Card
                                        key={clerk.id}
                                        className="cursor-pointer hover:border-primary transition-colors group relative overflow-hidden"
                                        onClick={() => handleSelectClerk(clerk)}
                                    >
                                        <div className="absolute top-0 left-0 w-1 h-full bg-slate-200 group-hover:bg-primary transition-colors" />
                                        <CardContent className="p-5 pl-7">
                                            <div className="flex items-center gap-3 mb-3">
                                                <Avatar>
                                                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                                        {clerk.name.substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-bold text-sm truncate">{clerk.name}</p>
                                                    <Badge variant="secondary" className="text-[10px] h-5">Rank #{index + 1}</Badge>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Puntos</p>
                                                    <p className="font-bold text-xl text-primary">{clerk.points.toLocaleString()}</p>
                                                </div>
                                                <Button size="icon" variant="ghost" className="rounded-full shadow-none group-hover:bg-primary group-hover:text-white transition-colors">
                                                    <ChevronRight className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                                {pharmacyClerks.length === 0 && (
                                    <div className="col-span-full py-12 text-center text-muted-foreground bg-slate-50 border border-dashed rounded-xl">
                                        No hay dependientes registrados en esta farmacia.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {view === 'clerk' && selectedClerk && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 p-1">
                        <div className="flex gap-4">
                            <Card className="w-1/3 min-w-[300px] h-fit sticky top-0">
                                <CardHeader className="text-center pb-2">
                                    <div className="w-24 h-24 bg-slate-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                                        <User className="w-12 h-12 text-slate-400" />
                                    </div>
                                    <CardTitle>{selectedClerk.name}</CardTitle>
                                    <CardDescription>Dependiente</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4 text-center py-4 border-y">
                                        <div>
                                            <p className="text-2xl font-bold text-primary">{selectedClerk.points}</p>
                                            <p className="text-xs text-muted-foreground uppercase">Puntos Total</p>
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold">{selectedClerk.scans}</p>
                                            <p className="text-xs text-muted-foreground uppercase">Escaneos</p>
                                        </div>
                                    </div>
                                    <div className="text-sm space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Farmacia:</span>
                                            <span className="font-medium">{selectedPharmacy?.name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Última Actividad:</span>
                                            <span className="font-medium">Hace 2 horas</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="flex-1 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <Card className="bg-emerald-50 border-emerald-100">
                                        <CardContent className="p-6 flex items-center gap-4">
                                            <div className="p-3 bg-emerald-100 rounded-full text-emerald-600">
                                                <Package className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-emerald-700 font-medium">Productos Vendidos</p>
                                                <p className="text-2xl font-bold text-emerald-900">{aggregatedProducts.reduce((a, b) => a + b.count, 0)}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-purple-50 border-purple-100">
                                        <CardContent className="p-6 flex items-center gap-4">
                                            <div className="p-3 bg-purple-100 rounded-full text-purple-600">
                                                <Activity className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-purple-700 font-medium">Tasa de Aprobación</p>
                                                <p className="text-2xl font-bold text-purple-900">98%</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <ShoppingBag className="w-5 h-5 text-primary" />
                                            Desglose de Productos
                                        </CardTitle>
                                        <CardDescription>Productos validados a través de escaneos de facturas</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {aggregatedProducts.map((prod, i) => (
                                                <div key={i} className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <span className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded text-slate-500 font-bold text-sm">
                                                            {i + 1}
                                                        </span>
                                                        <span className="font-medium">{prod.name}</span>
                                                    </div>
                                                    <Badge variant="outline" className="text-md px-3 py-1">
                                                        {prod.count} unid.
                                                    </Badge>
                                                </div>
                                            ))}
                                            {aggregatedProducts.length === 0 && (
                                                <div className="text-center py-8 text-muted-foreground">
                                                    No se han detectado productos en los escaneos recientes.
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}


