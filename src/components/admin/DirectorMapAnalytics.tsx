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
import { collection, onSnapshot } from 'firebase/firestore';

// --- Types ---
interface Pharmacy {
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    zone: string;
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
    lastActive: string;
    scans: number;
}

interface SalesRep {
    id: string;
    name: string;
}

// --- Icons ---
// Using reliable CDN for markers to avoid broken images in Vercel
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
    const [reps, setReps] = useState<SalesRep[]>([
        { id: '1', name: 'Carlos Gomez' },
        { id: '2', name: 'Ana Reyes' },
        { id: '3', name: 'Luis Diaz' }
    ]);

    // Filter State
    const [selectedZone, setSelectedZone] = useState<string>("all");
    const [selectedRepId, setSelectedRepId] = useState<string>("all");
    const [selectedStatus, setSelectedStatus] = useState<string>("all");

    // UI State
    const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    // 1. Fetch Pharmacies Realtime
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "pharmacies"), (snapshot) => {
            const loaded: Pharmacy[] = snapshot.docs.map(doc => {
                const data = doc.data();
                const lat = data.coordinates?.lat || data.lat || 18.48;
                const lng = data.coordinates?.lng || data.lng || -69.93;
                // Determine status securely
                const performanceStatus = data.status === 'inactive' ? 'low' :
                    (data.monthlySales > 50000 ? 'high' : 'avg'); // simple heuristic if available

                return {
                    id: doc.id,
                    name: data.name,
                    address: data.address || 'Dirección no disponible',
                    zone: data.zone || 'Sin Zona',
                    assigned_rep_id: data.assigned_rep_id || '1',
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

    // 2. Derive Filters
    const zones = useMemo(() => Array.from(new Set(pharmacies.map(p => p.zone).filter(Boolean))), [pharmacies]);

    // 3. Filtered Data
    const filteredPharmacies = useMemo(() => {
        return pharmacies.filter(p => {
            const matchZone = selectedZone === "all" || p.zone === selectedZone;
            const matchRep = selectedRepId === "all" || p.assigned_rep_id === selectedRepId;
            const matchStatus = selectedStatus === "all" ||
                (selectedStatus === 'high' && p.performanceStatus === 'high') ||
                (selectedStatus === 'low' && p.performanceStatus === 'low');
            return matchZone && matchRep && matchStatus;
        });
    }, [pharmacies, selectedZone, selectedRepId, selectedStatus]);

    // 4. Calculate Bounds for Auto-Zoom
    const mapBounds = useMemo(() => {
        if (filteredPharmacies.length === 0) return null;
        return filteredPharmacies.map(p => [p.lat, p.lng] as [number, number]);
    }, [filteredPharmacies]);

    // Handlers
    const handlePharmacyClick = (pharmacy: Pharmacy) => {
        setSelectedPharmacy(pharmacy);
        setIsSheetOpen(true);
        // Mock clerks generator based on pharmacy ID seed
        const seed = pharmacy.id.charCodeAt(0);
        const pClerks = [
            { id: `c${seed}1`, name: 'Maria Perez', pharmacyId: pharmacy.id, totalPoints: 1200 + seed * 10, lastActive: '5 min', scans: 40 + (seed % 10) },
            { id: `c${seed}2`, name: 'Jose Santos', pharmacyId: pharmacy.id, totalPoints: 800 + seed * 5, lastActive: '1 hora', scans: 25 + (seed % 5) },
        ].sort((a, b) => b.totalPoints - a.totalPoints);
        setClerks(pClerks);
    };

    // AI Insight (Mocked)
    const aiInsight = useMemo(() => {
        if (!selectedPharmacy) return null;
        const isHigh = selectedPharmacy.performanceStatus === 'high';
        return {
            summary: isHigh ? "Farmacia con excelente rotación." : "Rendimiento por debajo del promedio.",
            trend: isHigh ? "📈 Ventas subiendo +12%" : "📉 Tráfico bajo en fin de semana",
            topProducts: "Broncochen, Neurobión",
            alert: isHigh ? "Todo en orden" : "⚠️ Stock bajo reportado"
        };
    }, [selectedPharmacy]);

    return (
        <div className="h-[calc(100vh-8rem)] relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-slate-200 shadow-sm">

            {/* Top Floating Filter Panel */}
            <div className="absolute top-4 left-4 z-[1000] w-72 flex flex-col gap-2">
                <Card className="bg-white/95 backdrop-blur-sm shadow-xl border-white/50">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                            <Filter className="w-4 h-4 text-primary" /> Filtros del Mapa
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 flex flex-col gap-3">
                        {/* Zone Filter */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Zona Geográfica</label>
                            <Select value={selectedZone} onValueChange={setSelectedZone}>
                                <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
                                    <SelectValue placeholder="Todas las Zonas" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas las Zonas</SelectItem>
                                    {zones.map(z => <SelectItem key={z} value={z}>{z}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Rep Filter */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Vendedor Asignado</label>
                            <Select value={selectedRepId} onValueChange={setSelectedRepId}>
                                <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos los Vendedores</SelectItem>
                                    {reps.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-6 text-slate-500 hover:text-red-600 hover:bg-red-50 w-full mt-1"
                            onClick={() => { setSelectedZone('all'); setSelectedRepId('all'); setSelectedStatus('all'); }}
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
                                        <p><span className="font-bold text-indigo-700">Resumen:</span> {aiInsight?.summary}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="min-w-[4px] h-full rounded-full bg-indigo-200"></div>
                                        <p><span className="font-bold text-indigo-700">Tendencia:</span> {aiInsight?.trend}</p>
                                    </div>
                                    <div className="p-3 bg-white/60 rounded-xl border border-indigo-50">
                                        <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Productos Top</p>
                                        <p className="font-medium text-slate-800">{aiInsight?.topProducts}</p>
                                    </div>
                                    {selectedPharmacy.performanceStatus === 'low' && (
                                        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">
                                            <AlertCircle className="w-4 h-4 shrink-0" />
                                            <span className="text-xs font-bold">{aiInsight?.alert}</span>
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
