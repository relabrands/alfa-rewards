import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Building2, Search, MapPin, TrendingUp, ArrowLeft, ChevronRight, Users, User, Package, Activity, ShoppingBag } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { getPharmaciesByZone, getTeamMembers } from '@/lib/db';
import { Pharmacy, RegisteredClerk } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore';

// Types specific to this view
interface ProductScan {
    product: string;
    quantity: number;
    timestamp: Date;
}

export function SalesRepPharmacies() {
    const { currentUser } = useApp();

    // Data State
    const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
    const [loading, setLoading] = useState(true);
    const [pharmacyClerks, setPharmacyClerks] = useState<RegisteredClerk[]>([]);

    // Navigation State
    const [view, setView] = useState<'list' | 'pharmacy' | 'clerk'>('list');
    const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null);
    const [selectedClerk, setSelectedClerk] = useState<RegisteredClerk | null>(null);

    // Analytics State
    const [clerkScans, setClerkScans] = useState<ProductScan[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // 1. Fetch Pharmacies
    useEffect(() => {
        const loadPharmacies = async () => {
            if (currentUser?.zone && currentUser.zone.length > 0) {
                const data = await getPharmaciesByZone(currentUser.zone);
                setPharmacies(data);
            }
            setLoading(false);
        };
        loadPharmacies();
    }, [currentUser?.zone]);

    // 2. Fetch Clerks when Pharmacy Selected
    useEffect(() => {
        const loadClerks = async () => {
            if (!selectedPharmacy) return;

            // Fetch all clerks in the zone (we already have a helper for this)
            // Then filter by the selected pharmacy ID
            if (currentUser?.zone) {
                const allZoneClerks = await getTeamMembers(currentUser.zone);

                const filtered = allZoneClerks.filter((c: any) => {
                    // Check primary pharmacy
                    if (c.pharmacyId === selectedPharmacy.id) return true;
                    // Check assigned pharmacies (if fetched - getTeamMembers returns simplified RegisteredClerk, might need to enhance it)
                    // Limitation: getTeamMembers currently maps to RegisteredClerk which might not have assignedPharmacies.
                    // Let's check logic. If strict, we might need a direct query here.
                    return false;
                });

                // Better approach: Direct query for this pharmacy to ensure we get everyone assigned here
                // We need to query users where assignedPharmacies array-contains ID OR pharmacyId == ID
                // Firestore OR is not native, so we do two queries or client filter.
                // Let's do client filter on all zone clerks if getTeamMembers returns raw data, but it returns structured data.

                // Let's do a direct fetch for accuracy
                // Let's do a direct fetch for accuracy
                const q = query(
                    collection(db, "users"),
                    where("role", "==", "clerk"),
                    where("assignedPharmacies", "array-contains", selectedPharmacy.id)
                );
                const snapshot = await getDocs(q);
                const assignedClerks = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        name: `${data.name} ${data.lastName || ''}`.trim(),
                        pharmacyName: selectedPharmacy.name,
                        pointsGenerated: data.points || 0
                    } as unknown as RegisteredClerk;
                });

                // Also fetch legacy pharmacyId matches (if not already in assigned)
                const qLegacy = query(
                    collection(db, "users"),
                    where("role", "==", "clerk"),
                    where("pharmacyId", "==", selectedPharmacy.id)
                );
                const snapshotLegacy = await getDocs(qLegacy);
                const legacyClerks = snapshotLegacy.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        name: `${data.name} ${data.lastName || ''}`.trim(),
                        pharmacyName: selectedPharmacy.name,
                        pointsGenerated: data.points || 0
                    } as unknown as RegisteredClerk;
                });

                // Merge and dedup
                const combined = [...assignedClerks, ...legacyClerks];
                const unique = Array.from(new Map(combined.map(c => [c.id, c])).values());

                setPharmacyClerks(unique.sort((a, b) => (b.pointsGenerated || 0) - (a.pointsGenerated || 0)));
            }
        };

        if (view === 'pharmacy' && selectedPharmacy) {
            loadClerks();
        }
    }, [selectedPharmacy, view, currentUser]);

    // 3. Fetch Scans when Clerk Selected
    useEffect(() => {
        if (view === 'clerk' && selectedClerk) {
            const q = query(
                collection(db, "scans"),
                where("userId", "==", selectedClerk.id),
                where("status", "==", "processed"),
                orderBy("timestamp", "desc"),
                limit(100)
            );

            const unsubscribe = onSnapshot(q, (snapshot) => {
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
                setClerkScans(products);
            });
            return () => unsubscribe();
        } else {
            setClerkScans([]);
        }
    }, [view, selectedClerk]);

    // Helpers
    const goBack = () => {
        if (view === 'clerk') setView('pharmacy');
        else if (view === 'pharmacy') setView('list');
    };

    const aggregatedProducts = useMemo(() => {
        const stats: Record<string, number> = {};
        clerkScans.forEach(s => {
            stats[s.product] = (stats[s.product] || 0) + s.quantity;
        });
        return Object.entries(stats)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }, [clerkScans]);

    const filteredPharmacies = pharmacies.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.sector && p.sector.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-fade-in h-[calc(100vh-6rem)] flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-4 pb-2 border-b shrink-0">
                {view !== 'list' && (
                    <Button variant="ghost" size="icon" onClick={goBack}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                )}
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Mis Farmacias</h1>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <span className={view === 'list' ? 'text-primary font-medium' : ''}>Lista</span>
                        {selectedPharmacy && (
                            <>
                                <ChevronRight className="h-4 w-4" />
                                <span className={view === 'pharmacy' ? 'text-primary font-medium' : ''}>{selectedPharmacy.name}</span>
                            </>
                        )}
                        {selectedClerk && (
                            <>
                                <ChevronRight className="h-4 w-4" />
                                <span className={view === 'clerk' ? 'text-primary font-medium' : ''}>{selectedClerk.name}</span>
                            </>
                        )}
                    </div>
                </div>

                {view === 'list' && (
                    <div className="ml-auto relative w-full md:w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar farmacia..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                )}
            </div>

            <ScrollArea className="flex-1 -mx-4 px-4">
                {/* VIEW: List */}
                {view === 'list' && (
                    <>
                        {loading ? (
                            <div className="text-center py-12 text-muted-foreground">Cargando farmacias...</div>
                        ) : filteredPharmacies.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Building2 className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-medium">No se encontraron farmacias</h3>
                                <p className="text-muted-foreground">No hay farmacias asignadas a tu zona.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
                                {filteredPharmacies.map((pharmacy) => (
                                    <Card
                                        key={pharmacy.id}
                                        className="hover:shadow-md transition-all cursor-pointer group hover:bg-slate-50 border-transparent hover:border-blue-100"
                                        onClick={() => {
                                            setSelectedPharmacy(pharmacy);
                                            setView('pharmacy');
                                        }}
                                    >
                                        <CardContent className="p-6">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                                                    <Building2 className="h-5 w-5" />
                                                </div>
                                                <Badge variant={pharmacy.isActive ? 'default' : 'secondary'} className={pharmacy.isActive ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}>
                                                    {pharmacy.isActive ? 'Activa' : 'Inactiva'}
                                                </Badge>
                                            </div>

                                            <h3 className="font-bold text-lg mb-1 truncate">{pharmacy.name}</h3>
                                            <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                                                <MapPin className="h-3 w-3" />
                                                {pharmacy.sector || pharmacy.address}
                                            </p>

                                            <div className="grid grid-cols-2 gap-2 pt-4 border-t mt-4">
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
                        )}
                    </>
                )}

                {/* VIEW: Pharmacy Detail */}
                {view === 'pharmacy' && selectedPharmacy && (
                    <div className="space-y-6 pb-6 animate-in slide-in-from-right-4">
                        <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-none shadow-lg">
                            <CardContent className="p-8">
                                <h1 className="text-3xl font-bold mb-2">{selectedPharmacy.name}</h1>
                                <div className="flex flex-wrap gap-6 mt-4">
                                    <div>
                                        <p className="text-blue-100 text-sm">Zona</p>
                                        <p className="font-bold">{selectedPharmacy.sector || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-blue-100 text-sm">Puntos Mensuales</p>
                                        <p className="font-bold text-xl">{selectedPharmacy.monthlyPoints?.toLocaleString() || 0} pts</p>
                                    </div>
                                    <div>
                                        <p className="text-blue-100 text-sm">Escaneos Total</p>
                                        <p className="font-bold text-xl">{selectedPharmacy.scanCount || 0}</p>
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
                                        onClick={() => {
                                            setSelectedClerk(clerk);
                                            setView('clerk');
                                        }}
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
                                                    <p className="font-bold text-xl text-primary">{clerk.pointsGenerated.toLocaleString()}</p>
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

                {/* VIEW: Clerk Detail */}
                {view === 'clerk' && selectedClerk && (
                    <div className="space-y-6 pb-6 animate-in slide-in-from-right-4">
                        <div className="flex flex-col md:flex-row gap-6">
                            {/* Clerk Profile Card */}
                            <Card className="md:w-1/3 h-fit sticky top-0">
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
                                            <p className="text-2xl font-bold text-primary">{selectedClerk.pointsGenerated?.toLocaleString()}</p>
                                            <p className="text-xs text-muted-foreground uppercase">Puntos</p>
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold">{clerkScans.length}</p>
                                            <p className="text-xs text-muted-foreground uppercase">Escaneos</p>
                                        </div>
                                    </div>
                                    <div className="text-sm space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Cedula:</span>
                                            <span className="font-medium">{selectedClerk.cedula || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Farmacia:</span>
                                            <span className="font-medium text-right max-w-[150px] truncate" title={selectedPharmacy?.name}>{selectedPharmacy?.name}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Clerk Stats & Products */}
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
