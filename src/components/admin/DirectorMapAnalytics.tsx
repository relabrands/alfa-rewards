import { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { AlertCircle, Crown, Filter, Sparkles } from 'lucide-react';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { DR_LOCATIONS } from '@/lib/locations';

// --- Types ---
interface Pharmacy {
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    zone: string;
    city?: string; // Add city support
    assigned_rep_id: string;
    status: 'active' | 'inactive';
    image?: string;
    performanceStatus?: 'high' | 'avg' | 'low';
}

interface Clerk {
    id: string;
    name: string;
    pharmacyId: string;
    totalPoints: number;
    lastActive: string; // Formatted date or "active"
    scans: number;
    status: string;
}

interface Scan {
    productsFound: any[];
    invoiceAmount: number;
}

interface SalesRep {
    id: string;
    name: string;
}

// --- Icons ---
const createIcon = (color: string) => new Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/markers/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const icons = {
    green: createIcon('green'),
    gold: createIcon('gold'),
    red: createIcon('red'),
    grey: createIcon('grey'),
    blue: createIcon('blue')
};

// --- Map Controller ---
function MapController({ bounds }: { bounds: any }) {
    const map = useMap();
    useEffect(() => {
        if (bounds && bounds.length > 0) {
            try {
                map.fitBounds(bounds, { padding: [50, 50], duration: 1.5 });
            } catch (e) { console.warn("Map bounds error:", e); }
        }
    }, [bounds, map]);
    return null;
}

export default function DirectorMapAnalytics() {
    // Data State
    const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
    const [clerks, setClerks] = useState<Clerk[]>([]);
    const [reps, setReps] = useState<SalesRep[]>([]);

    // Filter State
    const [selectedCity, setSelectedCity] = useState<string>("all");
    const [selectedRepId, setSelectedRepId] = useState<string>("all");
    const [selectedStatus, setSelectedStatus] = useState<string>("all");

    // UI State
    const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    // Insight State
    const [stats, setStats] = useState({
        summary: "Analizando datos...",
        trend: "Calculando...",
        topProducts: "Cargando...",
        alert: ""
    });

    // 1. Fetch Pharmacies Realtime
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "pharmacies"), (snapshot) => {
            const loaded: Pharmacy[] = snapshot.docs.map(doc => {
                const data = doc.data();
                const lat = data.coordinates?.lat || data.lat || 18.48;
                const lng = data.coordinates?.lng || data.lng || -69.93;
                const performanceStatus = data.status === 'inactive' ? 'low' :
                    (data.monthlySales > 50000 ? 'high' : 'avg');

                return {
                    id: doc.id,
                    name: data.name,
                    address: data.address || 'Dirección no disponible',
                    zone: data.zone || data.sector || 'Sin Zona',
                    city: data.city || 'Desconocido', // Map new city field
                    assigned_rep_id: data.assigned_rep_id || '',
                    status: data.status || 'active',
                    image: data.image || 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=300&q=80',
                    lat,
                    lng,
                    performanceStatus: data.performanceStatus || performanceStatus
                } as Pharmacy;
            });
            setPharmacies(loaded);
        });
        return () => unsubscribe();
    }, []);

    // 2. Fetch Real Sales Reps
    useEffect(() => {
        const q = query(collection(db, "users"), where("role", "==", "salesRep"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loadedReps = snapshot.docs.map(doc => ({
                id: doc.id,
                name: `${doc.data().name} ${doc.data().lastName || ''}`.trim()
            }));
            setReps(loadedReps);
        });
        return () => unsubscribe();
    }, []);

    // 3. Filtered Data
    const filteredPharmacies = useMemo(() => {
        return pharmacies.filter(p => {
            // Filter by City instead of Zone (match AdminPharmacies creation logic)
            const matchCity = selectedCity === "all" || p.city === selectedCity || p.zone === selectedCity; // Fallback to zone check for old data
            const matchRep = selectedRepId === "all" || p.assigned_rep_id === selectedRepId;
            const matchStatus = selectedStatus === "all" ||
                (selectedStatus === 'high' && p.performanceStatus === 'high') ||
                (selectedStatus === 'low' && p.performanceStatus === 'low');
            return matchCity && matchRep && matchStatus;
        });
    }, [pharmacies, selectedCity, selectedRepId, selectedStatus]);

    // 4. Calculate Bounds for Auto-Zoom
    const mapBounds = useMemo(() => {
        if (filteredPharmacies.length === 0) return null;
        return filteredPharmacies.map(p => [p.lat, p.lng] as [number, number]);
    }, [filteredPharmacies]);

    // Handlers
    const handlePharmacyClick = async (pharmacy: Pharmacy) => {
        setSelectedPharmacy(pharmacy);
        setIsSheetOpen(true);
        setStats({ summary: "Cargando...", trend: "...", topProducts: "...", alert: "" });

        // 1. Fetch Real Clerks
        try {
            const clerksQ = query(
                collection(db, "users"),
                where("pharmacyId", "==", pharmacy.id),
                where("role", "==", "clerk")
            );
            const clerksSnap = await getDocs(clerksQ);
            const realClerks: Clerk[] = clerksSnap.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    name: `${data.name} ${data.lastName || ''}`.trim(),
                    pharmacyId: pharmacy.id,
                    totalPoints: data.points || 0,
                    lastActive: data.lastActive ? new Date(data.lastActive.toDate()).toLocaleDateString() : 'N/A',
                    scans: 0, // Need to count scans if important, skipping for speed
                    status: data.status || 'pending'
                };
            }).sort((a, b) => b.totalPoints - a.totalPoints);
            setClerks(realClerks);

            // 2. Fetch Recent Scans for "AI Insight"
            const scansQ = query(
                collection(db, "scans"),
                where("pharmacyCode", "==", pharmacy.id), // Assuming pharmacyId is stored as pharmacyId or pharmacyCode?
                // Note: scans usually store 'userId'. Getting scans by pharmacy requires 'pharmacyId' on scan or map user->pharmacy.
                // Let's try filtering by users we just found.
                // Or assuming scans have pharmacyId. If not, this might return empty.
                orderBy("timestamp", "desc"),
                limit(50)
            );

            // Correction: Scans might not have pharmacyId directly indexed or stored.
            // But we have the list of clerk IDs. 
            // Querying scans where userId IN [clerkIds] is better.
            let recentScans: any[] = [];
            if (realClerks.length > 0) {
                const clerkIds = realClerks.map(c => c.id).slice(0, 10); // Firestore 'in' limit is 10
                const scansByUsersQ = query(
                    collection(db, "scans"),
                    where("userId", "in", clerkIds),
                    orderBy("timestamp", "desc"),
                    limit(20)
                );
                const scansSnap = await getDocs(scansByUsersQ);
                recentScans = scansSnap.docs.map(d => d.data());
            }

            // 3. Generate "Insight"
            const totalSales = recentScans.reduce((sum, s) => sum + (s.invoiceAmount || 0), 0);
            const scanCount = recentScans.length;

            // Top Products
            const productCounts: Record<string, number> = {};
            recentScans.forEach(s => {
                if (s.productsFound && Array.isArray(s.productsFound)) {
                    s.productsFound.forEach((p: any) => {
                        productCounts[p.product] = (productCounts[p.product] || 0) + (p.quantity || 1);
                    });
                }
            });
            const topProducts = Object.entries(productCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(e => e[0])
                .join(", ");

            setStats({
                summary: scanCount > 5 ? "Farmacia con actividad regular." : "Baja actividad reciente.",
                trend: totalSales > 0 ? `💰 RD$ ${(totalSales / 1000).toFixed(1)}k en ventas recientes` : "Sin ventas recientes",
                topProducts: topProducts || "Sin datos de productos",
                alert: realClerks.length === 0 ? "⚠️ Sin dependientes registrados" : "Todo en orden"
            });

        } catch (error) {
            console.error("Error fetching pharmacy details:", error);
            setClerks([]);
            setStats({ summary: "Error cargando datos", trend: "-", topProducts: "-", alert: "Error de conexión" });
        }
    };

    return (
        <div className="h-[calc(100vh-8rem)] relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-slate-200 shadow-sm isolate">

            {/* Top Floating Filter Panel - High Z-Index & Isolate */}
            <div className="absolute top-4 left-4 z-[5000] w-72 flex flex-col gap-2 pointer-events-auto">
                <Card className="bg-white/95 backdrop-blur-sm shadow-xl border-white/50">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                            <Filter className="w-4 h-4 text-primary" /> Filtros del Mapa
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 flex flex-col gap-3">
                        {/* City Filter */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ciudad / Zona</label>
                            <Select value={selectedCity} onValueChange={setSelectedCity}>
                                <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200 w-full">
                                    <SelectValue placeholder="Todas las Ciudades" />
                                </SelectTrigger>
                                <SelectContent className="z-[5002] max-h-60">
                                    <SelectItem value="all">Todas las Ciudades</SelectItem>
                                    {Object.keys(DR_LOCATIONS).sort().map(city => (
                                        <SelectItem key={city} value={city}>{city}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Rep Filter */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Vendedor Asignado</label>
                            <Select value={selectedRepId} onValueChange={setSelectedRepId}>
                                <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200 w-full">
                                    <SelectValue placeholder={reps.length > 0 ? "Todos" : "Cargando..."} />
                                </SelectTrigger>
                                <SelectContent className="z-[5002] max-h-60">
                                    <SelectItem value="all">Todos los Vendedores</SelectItem>
                                    {reps.length === 0 ? (
                                        <SelectItem value="none" disabled>No se encontraron vendedores</SelectItem>
                                    ) : (
                                        reps.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-6 text-slate-500 hover:text-red-600 hover:bg-red-50 w-full mt-1"
                            onClick={() => { setSelectedCity('all'); setSelectedRepId('all'); setSelectedStatus('all'); }}
                        >
                            Limpiar Filtros
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <MapContainer center={[18.7357, -70.1627]} zoom={8} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    attribution='&copy; CARTO'
                />

                <MapController bounds={mapBounds} />

                <MarkerClusterGroup chunkedLoading>
                    {filteredPharmacies.map(pharmacy => (
                        <Marker
                            key={pharmacy.id}
                            position={[pharmacy.lat, pharmacy.lng]}
                            icon={pharmacy.performanceStatus === 'high' ? icons.green : pharmacy.performanceStatus === 'low' ? icons.red : icons.gold}
                            eventHandlers={{
                                click: () => handlePharmacyClick(pharmacy)
                            }}
                        >
                            <Popup>
                                <div className="text-center">
                                    <h3 className="font-bold text-sm text-slate-800">{pharmacy.name}</h3>
                                    <p className="text-[10px] text-muted-foreground">{pharmacy.zone}</p>
                                    <Button size="sm" className="mt-2 text-xs w-full h-7" onClick={() => handlePharmacyClick(pharmacy)}>
                                        Ver Detalles
                                    </Button>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MarkerClusterGroup>
            </MapContainer>

            {/* Sheet Detail View */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent className="sm:max-w-md w-full overflow-y-auto">
                    {selectedPharmacy && (
                        <div className="space-y-6">
                            <SheetHeader>
                                <div className="relative h-40 w-full rounded-2xl overflow-hidden mb-4 shadow-md">
                                    <img src={selectedPharmacy.image} className="w-full h-full object-cover" alt="Pharmacy" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                                    <div className="absolute bottom-4 left-4 text-white">
                                        <Badge className="mb-2 bg-white/20 hover:bg-white/30 backdrop-blur text-white border-none">
                                            {selectedPharmacy.zone}
                                        </Badge>
                                        <SheetTitle className="text-white text-2xl font-bold">{selectedPharmacy.name}</SheetTitle>
                                    </div>
                                </div>
                                <SheetDescription className="text-slate-600 font-medium">
                                    📍 {selectedPharmacy.address}
                                </SheetDescription>
                            </SheetHeader>

                            {/* AI Analysis Section */}
                            <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-2xl p-5 relative overflow-hidden shadow-sm">
                                <div className="absolute top-3 right-3">
                                    <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
                                </div>
                                <h3 className="font-bold text-indigo-900 text-sm mb-4 flex items-center gap-2">
                                    ✨ AI Market Analysis
                                </h3>
                                <div className="space-y-3 text-sm text-slate-700">
                                    <div className="flex gap-2">
                                        <div className="min-w-[4px] h-full rounded-full bg-indigo-200"></div>
                                        <p><span className="font-bold text-indigo-700">Resumen:</span> {stats.summary}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="min-w-[4px] h-full rounded-full bg-indigo-200"></div>
                                        <p><span className="font-bold text-indigo-700">Tendencia:</span> {stats.trend}</p>
                                    </div>
                                    <div className="p-3 bg-white/60 rounded-xl border border-indigo-50">
                                        <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Productos Top (Recientes)</p>
                                        <p className="font-medium text-slate-800">{stats.topProducts}</p>
                                    </div>
                                    {selectedPharmacy.performanceStatus === 'low' && (
                                        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">
                                            <AlertCircle className="w-4 h-4 shrink-0" />
                                            <span className="text-xs font-bold">{stats.alert}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Clerks List */}
                            <div>
                                <h3 className="font-bold text-lg mb-4 flex items-center justify-between text-slate-800">
                                    Dependientes
                                    <Badge variant="secondary" className="bg-slate-100 text-slate-600">{clerks.length}</Badge>
                                </h3>
                                <div className="space-y-3">
                                    {clerks.map((clerk, idx) => (
                                        <div key={clerk.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all group">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-inner ${idx === 0 ? 'bg-gradient-to-br from-yellow-300 to-yellow-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                    {idx === 0 ? <Crown className="w-5 h-5" /> : clerk.name.substring(0, 2)}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-sm text-slate-800 group-hover:text-primary transition-colors">{clerk.name}</h4>
                                                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                        <span className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                                                        Activo: {clerk.lastActive}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="block font-bold text-primary text-base">{clerk.totalPoints.toLocaleString()}</span>
                                                <span className="text-[10px] text-muted-foreground">puntos</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
