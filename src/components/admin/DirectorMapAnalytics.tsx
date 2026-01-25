import { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Users, Building2, ShoppingBag, MapPin, Award,
    TrendingUp, Activity, Star, Crown, Flame, ChevronRight, Search
} from 'lucide-react';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

// --- Types ---
interface Pharmacy {
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    zone: string;
    city?: string;
    image?: string;
    monthlySales: number;
    scanCount?: number;
    status: 'active' | 'inactive';
}

interface Clerk {
    id: string;
    name: string;
    pharmacyId: string;
    points: number;
    scans: number;
    avatar?: string;
    lastActive?: any;
}

interface ProductStat {
    name: string;
    count: number;
}

interface ZoneStat {
    name: string;
    activity: number; // 1-100 score
    pharmacyCount: number;
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
    const [topProducts, setTopProducts] = useState<ProductStat[]>([]);
    const [hotZones, setHotZones] = useState<ZoneStat[]>([]);

    // UI State
    const [activeTab, setActiveTab] = useState("overview");

    // 1. Fetch Pharmacies Realtime
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "pharmacies"), (snapshot) => {
            const loaded = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    name: data.name,
                    address: data.address || '',
                    lat: data.coordinates?.lat || data.lat || 18.48,
                    lng: data.coordinates?.lng || data.lng || -69.93,
                    zone: data.zone || data.sector || 'Sin Zona',
                    city: data.city || 'Desconocido',
                    image: data.image || 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=300&q=80',
                    monthlySales: data.monthlySales || 0,
                    status: data.status || 'active',
                    scanCount: data.scanCount || 0
                } as Pharmacy;
            });

            setPharmacies(loaded);

            // Calculate Hot Zones
            const zoneMap: Record<string, { count: number, sales: number }> = {};
            loaded.forEach(p => {
                const zoneName = p.city || p.zone;
                if (!zoneMap[zoneName]) zoneMap[zoneName] = { count: 0, sales: 0 };
                zoneMap[zoneName].count += 1;
                zoneMap[zoneName].sales += (p.monthlySales || 0);
            });

            const zones = Object.entries(zoneMap).map(([name, stat]) => ({
                name,
                pharmacyCount: stat.count,
                activity: Math.min(100, Math.floor(stat.sales / 1000)) // Mock activity score
            })).sort((a, b) => b.activity - a.activity).slice(0, 5);

            setHotZones(zones);
        });
        return () => unsubscribe();
    }, []);

    // 2. Fetch Clerks Realtime (for Leaderboards)
    useEffect(() => {
        const q = query(collection(db, "users"), where("role", "==", "clerk"), orderBy("points", "desc"), limit(20));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loadedClerks = snapshot.docs.map(doc => ({
                id: doc.id,
                name: `${doc.data().name} ${doc.data().lastName || ''}`.trim(),
                pharmacyId: doc.data().pharmacyId,
                points: doc.data().points || 0,
                scans: doc.data().scans || 0,
                lastActive: doc.data().lastActive
            } as Clerk));
            setClerks(loadedClerks);
        });
        return () => unsubscribe();
    }, []);

    // 3. Fetch Recent Scans for Product Trends
    useEffect(() => {
        const q = query(collection(db, "scans"), orderBy("timestamp", "desc"), limit(50));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const productCounts: Record<string, number> = {};
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.productsFound && Array.isArray(data.productsFound)) {
                    data.productsFound.forEach((p: any) => {
                        const pName = p.product || "Desconocido";
                        productCounts[pName] = (productCounts[pName] || 0) + (p.quantity || 1);
                    });
                }
            });

            const sortedProducts = Object.entries(productCounts)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);

            setTopProducts(sortedProducts);
        });
        return () => unsubscribe();
    }, []);

    // Derived Data
    const activePharmacies = useMemo(() => {
        return [...pharmacies].sort((a, b) => b.monthlySales - a.monthlySales).slice(0, 5);
    }, [pharmacies]);

    const influencers = useMemo(() => {
        // Clerks with high points are "Influencers"
        return clerks.slice(0, 3);
    }, [clerks]);

    const mapBounds = useMemo(() => {
        if (pharmacies.length === 0) return null;
        return pharmacies.map(p => [p.lat, p.lng] as [number, number]);
    }, [pharmacies]);

    return (
        <div className="h-[calc(100vh-6rem)] w-full gap-4 flex overflow-hidden">
            {/* Left Analytical Panel */}
            <Card className="w-1/3 min-w-[350px] flex flex-col h-full border-none shadow-xl z-10 bg-white/95 backdrop-blur">
                <CardHeader className="pb-2 border-b">
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        Live Analytics
                    </CardTitle>
                    <CardDescription>
                        Vista en tiempo real del rendimiento
                    </CardDescription>
                </CardHeader>
                <div className="flex-1 overflow-hidden">
                    <ScrollArea className="h-full">
                        <div className="p-4 space-y-6">

                            {/* 1. Dependientes Influenciadores (Oro Puro) */}
                            <section>
                                <h3 className="text-xs font-bold uppercase text-muted-foreground mb-3 flex items-center gap-2">
                                    <Crown className="w-4 h-4 text-gold-dark" /> Influenciadores (Oro Puro)
                                </h3>
                                <div className="space-y-3">
                                    {influencers.map((clerk, i) => (
                                        <div key={clerk.id} className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-white border border-amber-100 shadow-sm relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-1 bg-gold text-[10px] font-bold text-white rounded-bl-lg shadow-sm">TOP {i + 1}</div>
                                            <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                                <AvatarFallback className="bg-gold text-white font-bold">{clerk.name.substring(0, 2)}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm truncate text-slate-800">{clerk.name}</p>
                                                <p className="text-xs text-amber-600/80 font-medium flex items-center gap-1">
                                                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                                    {clerk.points.toLocaleString()} pts
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* 2. Top Dependientes Reales */}
                            <section>
                                <h3 className="text-xs font-bold uppercase text-muted-foreground mb-3 flex items-center gap-2">
                                    <Users className="w-4 h-4 text-primary" /> Top Dependientes
                                </h3>
                                <div className="space-y-2">
                                    {clerks.slice(3, 8).map((clerk, i) => (
                                        <div key={clerk.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                                                    {i + 4}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm text-slate-700">{clerk.name}</p>
                                                </div>
                                            </div>
                                            <Badge variant="secondary" className="font-mono text-xs">{clerk.points}</Badge>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* 3. Farmacias Más Activas */}
                            <section>
                                <h3 className="text-xs font-bold uppercase text-muted-foreground mb-3 flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-blue-500" /> Farmacias Más Activas
                                </h3>
                                <div className="space-y-2">
                                    {activePharmacies.map((pharmacy) => (
                                        <div key={pharmacy.id} className="flex items-center gap-3 p-2 rounded-lg border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all cursor-pointer">
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <p className="font-bold text-sm text-slate-800">{pharmacy.name}</p>
                                                    <TrendIndicator value={pharmacy.monthlySales} />
                                                </div>
                                                <p className="text-xs text-muted-foreground truncate">{pharmacy.city || pharmacy.zone}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* 4. Productos Más Recomendados */}
                            <section>
                                <h3 className="text-xs font-bold uppercase text-muted-foreground mb-3 flex items-center gap-2">
                                    <ShoppingBag className="w-4 h-4 text-emerald-500" /> Productos Recomendados
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {topProducts.map((prod, i) => (
                                        <Badge key={i} variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 pl-1 pr-2 py-1 flex items-center gap-1">
                                            <span className="bg-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold text-emerald-600">{prod.count}</span>
                                            {prod.name}
                                        </Badge>
                                    ))}
                                    {topProducts.length === 0 && <span className="text-xs text-muted-foreground italic">Recopilando datos...</span>}
                                </div>
                            </section>

                            {/* 5. Zonas Calientes */}
                            <section>
                                <h3 className="text-xs font-bold uppercase text-muted-foreground mb-3 flex items-center gap-2">
                                    <Flame className="w-4 h-4 text-orange-500" /> Zonas Calientes
                                </h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {hotZones.map((zone, i) => (
                                        <div key={i} className="bg-orange-50/50 p-2 rounded-lg border border-orange-100">
                                            <p className="font-bold text-xs text-orange-800">{zone.name}</p>
                                            <div className="w-full bg-orange-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                                                <div className="bg-orange-500 h-full rounded-full" style={{ width: `${zone.activity}%` }}></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                        </div>
                    </ScrollArea>
                </div>
            </Card>

            {/* Right Map Panel */}
            <div className="flex-1 relative rounded-xl overflow-hidden shadow-inner border border-slate-200 bg-slate-50">
                <MapContainer center={[18.7357, -70.1627]} zoom={9} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                        attribution='&copy; CARTO'
                    />
                    <MapController bounds={mapBounds} />
                    <MarkerClusterGroup chunkedLoading>
                        {pharmacies.map(pharmacy => (
                            <Marker
                                key={pharmacy.id}
                                position={[pharmacy.lat, pharmacy.lng]}
                                icon={pharmacy.monthlySales > 50000 ? icons.green : icons.blue}
                            >
                                <Popup>
                                    <div className="text-center p-1">
                                        <b className="text-sm">{pharmacy.name}</b>
                                        <p className="text-xs text-muted-foreground">{pharmacy.city}</p>
                                        <Badge variant="outline" className="mt-1 text-[10px]">
                                            RD$ {(pharmacy.monthlySales / 1000).toFixed(1)}k
                                        </Badge>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MarkerClusterGroup>
                </MapContainer>

                {/* Floating Map Legend/Info */}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur p-3 rounded-lg shadow-lg border border-white z-[1000] max-w-[200px]">
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Actividad Total</h4>
                    <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center bg-slate-100 p-2 rounded">
                            <span className="text-xs font-medium">Farmacias</span>
                            <span className="font-bold text-sm text-primary">{pharmacies.length}</span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-100 p-2 rounded">
                            <span className="text-xs font-medium">Ventas (Total)</span>
                            <span className="font-bold text-sm text-green-600">RD$ {(pharmacies.reduce((acc, curr) => acc + (curr.monthlySales || 0), 0) / 1000).toFixed(1)}k</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper Component
function TrendIndicator({ value }: { value: number }) {
    if (value > 50000) {
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none text-[10px] gap-1 px-1.5">
            <TrendingUp className="w-3 h-3" /> Alta
        </Badge>;
    }
    if (value > 10000) {
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none text-[10px] gap-1 px-1.5">
            <Activity className="w-3 h-3" /> Media
        </Badge>;
    }
    return <Badge variant="secondary" className="text-[10px] px-1.5">Baja</Badge>;
}
