import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Building2, Search, MapPin, TrendingUp, ArrowLeft, ChevronRight, Users, User, Package, Activity, ShoppingBag, Share2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { getPharmaciesForRep, getTeamMembers, getProducts } from '@/lib/db';
import { Pharmacy, RegisteredClerk, Product, ProductLine } from '@/lib/types';
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
    const [allProducts, setAllProducts] = useState<Product[]>([]);

    // Navigation State
    const [view, setView] = useState<'list' | 'pharmacy' | 'clerk'>('list');
    const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null);
    const [selectedClerk, setSelectedClerk] = useState<RegisteredClerk | null>(null);

    // Analytics State
    const [clerkScans, setClerkScans] = useState<ProductScan[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // 1. Fetch Pharmacies for Rep
    useEffect(() => {
        const loadData = async () => {
            if (currentUser?.id) {
                const data = await getPharmaciesForRep(currentUser.id);
                setPharmacies(data);
            }
            // Load products global definition for line mapping
            const products = await getProducts();
            setAllProducts(products);

            setLoading(false);
        };
        loadData();
    }, [currentUser?.id]);

    // 2. Fetch Clerks when Pharmacy Selected
    useEffect(() => {
        const loadClerks = async () => {
            if (!selectedPharmacy) return;

            // Direct fetch for this pharmacy
            // We need to query users where assignedPharmacies array-contains ID OR pharmacyId == ID

            // 1. Fetch by assignedPharmacies
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

            // 2. Fetch by legacy pharmacyId
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
        };

        if (view === 'pharmacy' && selectedPharmacy) {
            loadClerks();
        }
    }, [selectedPharmacy, view]);

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

    // Aggregate products, filtering by assigned lines if applicable
    const aggregatedProducts = useMemo(() => {
        if (!selectedPharmacy || !currentUser) return [];

        const assignedLines = selectedPharmacy.repAssignments?.[currentUser.id];
        // If no explicit assignments (legacy), assume all or default logic.
        // If assignments exist, filter.

        const stats: Record<string, number> = {};
        clerkScans.forEach(s => {
            // Check if product belongs to assigned line
            if (assignedLines && assignedLines.length > 0) {
                // Find product definition
                // We match by name (fuzzy) or exact?
                // The scan record stores 'product' name.
                // We look it up in allProducts.
                const productDef = allProducts.find(p => p.name.toLowerCase() === s.product.toLowerCase() || p.keywords.includes(s.product.toLowerCase()));
                if (productDef && productDef.line) {
                    if (!assignedLines.includes(productDef.line)) return; // Skip if not in assigned lines
                } else {
                    // If product not found or has no line, defaulting to OTC or showing it?
                    // Let's show it if we are unsure, or hide it? 
                    // Better to hide strictly if assigned lines are present to avoid noise.
                    // But 'Varios' might cover it. 
                    // Let's assume default is OTC if undefined.
                    if (!assignedLines.includes('OTC')) return;
                }
            }

            stats[s.product] = (stats[s.product] || 0) + s.quantity;
        });

        return Object.entries(stats)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }, [clerkScans, selectedPharmacy, currentUser, allProducts]);

    const filteredPharmacies = pharmacies.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.sector && p.sector.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getMyLines = (pharmacy: Pharmacy) => {
        if (!currentUser || !pharmacy.repAssignments) return [];
        return pharmacy.repAssignments[currentUser.id] || [];
    };

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
                                <p className="text-muted-foreground">No tienes farmacias asignadas.</p>
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
                                                <div className="flex flex-col items-end gap-1">
                                                    <Badge variant={pharmacy.isActive ? 'default' : 'secondary'} className={pharmacy.isActive ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}>
                                                        {pharmacy.isActive ? 'Activa' : 'Inactiva'}
                                                    </Badge>
                                                    {/* Show assigned lines if any */}
                                                    {getMyLines(pharmacy).length > 0 && (
                                                        <div className="flex gap-1">
                                                            {getMyLines(pharmacy).map(l => (
                                                                <span key={l} className="text-[10px] bg-slate-100 px-1 rounded text-slate-600 border border-slate-200">
                                                                    {l}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
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
                                <div className="flex flex-col md:flex-row justify-between md:items-start gap-6">
                                    <div>
                                        <h1 className="text-3xl font-bold mb-2">{selectedPharmacy.name}</h1>
                                        <div className="flex items-center gap-2 text-blue-100">
                                            <MapPin className="h-4 w-4" />
                                            <p>{selectedPharmacy.sector || 'N/A'} • {selectedPharmacy.address}</p>
                                        </div>
                                        {getMyLines(selectedPharmacy).length > 0 && (
                                            <div className="mt-2 flex gap-2">
                                                {getMyLines(selectedPharmacy).map(l => (
                                                    <Badge key={l} className="bg-white/20 hover:bg-white/30 text-white border-0">
                                                        Línea: {l}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}

                                        <div className="flex gap-6 mt-6">
                                            <div>
                                                <p className="text-blue-200 text-xs uppercase font-bold">Puntos Mensuales</p>
                                                <p className="font-bold text-2xl">{selectedPharmacy.monthlyPoints?.toLocaleString() || 0}</p>
                                            </div>
                                            <div>
                                                <p className="text-blue-200 text-xs uppercase font-bold">Escaneos Total</p>
                                                <p className="font-bold text-2xl">{selectedPharmacy.scanCount || 0}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3 min-w-[200px]">
                                        <Button
                                            variant="secondary"
                                            className="w-full bg-white text-blue-600 hover:bg-blue-50 font-bold"
                                            onClick={() => {
                                                const url = `${window.location.origin}/register?pharmacy=${selectedPharmacy.id}`;
                                                if (navigator.share) {
                                                    navigator.share({
                                                        title: 'Registro Alfa Rewards',
                                                        text: `Regístrate en Alfa Rewards bajo ${selectedPharmacy.name}`,
                                                        url: url
                                                    }).catch(console.error);
                                                } else {
                                                    navigator.clipboard.writeText(url);
                                                    alert("Link copiado al portapapeles: " + url);
                                                }
                                            }}
                                        >
                                            <Share2 className="w-4 h-4 mr-2" /> Link Invitación Dependiente
                                        </Button>
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
                                        <CardDescription>
                                            Productos validados a través de escaneos de facturas
                                            {getMyLines(selectedPharmacy!).length > 0 && (
                                                <span className="ml-1 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">
                                                    Filtrado por: {getMyLines(selectedPharmacy!).join(', ')}
                                                </span>
                                            )}
                                        </CardDescription>
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
                                                    No se han detectado productos en los escaneos recientes
                                                    {getMyLines(selectedPharmacy!).length > 0 ? " para tus líneas asignadas." : "."}
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
