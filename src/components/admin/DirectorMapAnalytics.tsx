import { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Building2, TrendingUp, AlertCircle, Crown, Map as MapIcon, ChevronRight, Sparkles, ArrowLeft } from 'lucide-react';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// --- Types ---
interface SalesRep {
    id: string;
    name: string;
    avatar: string; // Initials
    zone: string;
    totalSales: number;
    lat: number;
    lng: number;
    activePharmacies: number;
}

interface Pharmacy {
    id: string;
    name: string;
    repId: string;
    lat: number;
    lng: number;
    status: 'high' | 'avg' | 'low'; // Green, Yellow, Red
    address: string;
    image: string;
}

interface Clerk {
    id: string;
    name: string;
    pharmacyId: string;
    totalPoints: number;
    lastActive: string;
    scans: number;
}

// --- Mock Data ---
const MOCK_REPS: SalesRep[] = [
    { id: '1', name: 'Carlos Gomez', avatar: 'CG', zone: 'Santo Domingo Norte', totalSales: 4500000, lat: 18.520, lng: -69.900, activePharmacies: 12 },
    { id: '2', name: 'Ana Reyes', avatar: 'AR', zone: 'Santiago', totalSales: 3200000, lat: 19.450, lng: -70.700, activePharmacies: 8 },
    { id: '3', name: 'Luis Diaz', avatar: 'LD', zone: 'Zona Este', totalSales: 2100000, lat: 18.450, lng: -69.300, activePharmacies: 15 },
];

const MOCK_PHARMACIES: Pharmacy[] = [
    // Carlos Pharmacies
    { id: 'p1', name: 'Farmacia Carol', repId: '1', lat: 18.525, lng: -69.905, status: 'high', address: 'Av. Charles de Gaulle', image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&q=80&w=200' },
    { id: 'p2', name: 'Farmacia Los Hidalgos', repId: '1', lat: 18.515, lng: -69.895, status: 'avg', address: 'Villa Mella', image: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?auto=format&fit=crop&q=80&w=200' },
    { id: 'p3', name: 'Farmacia GBC', repId: '1', lat: 18.530, lng: -69.910, status: 'low', address: 'Sabana Perdida', image: 'https://images.unsplash.com/photo-1576602976047-174e57a47881?auto=format&fit=crop&q=80&w=200' },
    // Ana Pharmacies
    { id: 'p4', name: 'Farmacia Union', repId: '2', lat: 19.455, lng: -70.705, status: 'high', address: 'Los Jardines', image: 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?auto=format&fit=crop&q=80&w=200' }
];

const MOCK_CLERKS: Clerk[] = [
    { id: 'c1', name: 'Maria Perez', pharmacyId: 'p1', totalPoints: 15000, lastActive: '2 min ago', scans: 142 },
    { id: 'c2', name: 'Jose Santos', pharmacyId: 'p1', totalPoints: 9200, lastActive: '1 hr ago', scans: 85 },
    { id: 'c3', name: 'Pedro Alcantara', pharmacyId: 'p1', totalPoints: 1200, lastActive: '3 days ago', scans: 12 },
    { id: 'c4', name: 'Laura Wes', pharmacyId: 'p2', totalPoints: 18500, lastActive: '5 min ago', scans: 190 },
];

// --- Custom Icons ---
const createIcon = (color: string) => new Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/markers/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const icons = {
    blue: createIcon('blue'),
    green: createIcon('green'),
    gold: createIcon('gold'),
    red: createIcon('red'),
    yellow: createIcon('yellow') // Actually 'gold' or 'orange' usually
};

// --- Components ---

function MapController({ center, zoom }: { center: [number, number], zoom: number }) {
    const map = useMap();
    map.flyTo(center, zoom, { duration: 1.5 });
    return null;
}

export default function DirectorMapAnalytics() {
    const [level, setLevel] = useState<1 | 2 | 3>(1); // 1: Country/Reps, 2: Zone/Pharmacies, 3: Pharmacy/Clerks (Sheet)
    const [selectedRep, setSelectedRep] = useState<SalesRep | null>(null);
    const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null);
    const [mapView, setMapView] = useState<{ center: [number, number], zoom: number }>({ center: [18.7357, -70.1627], zoom: 8 });

    // Computed Data
    const visiblePharmacies = useMemo(() =>
        selectedRep ? MOCK_PHARMACIES.filter(p => p.repId === selectedRep.id) : [],
        [selectedRep]);

    const activeClerks = useMemo(() =>
        selectedPharmacy ? MOCK_CLERKS.filter(c => c.pharmacyId === selectedPharmacy.id).sort((a, b) => b.totalPoints - a.totalPoints) : [],
        [selectedPharmacy]);

    // Handlers
    const handleRepClick = (rep: SalesRep) => {
        setSelectedRep(rep);
        setLevel(2);
        setMapView({ center: [rep.lat, rep.lng], zoom: 13 });
    };

    const handlePharmacyClick = (pharmacy: Pharmacy) => {
        setSelectedPharmacy(pharmacy);
        setLevel(3); // Opens Sheet
        // Keep zoom level but maybe center slightly
        setMapView({ center: [pharmacy.lat, pharmacy.lng], zoom: 15 });
    };

    const handleBackToCountry = () => {
        setLevel(1);
        setSelectedRep(null);
        setSelectedPharmacy(null);
        setMapView({ center: [18.7357, -70.1627], zoom: 8 });
    };

    const handleBackToZone = () => {
        if (selectedRep) {
            setLevel(2);
            setSelectedPharmacy(null);
            setMapView({ center: [selectedRep.lat, selectedRep.lng], zoom: 13 });
        }
    };

    // AI Insight Generator
    const getAiInsight = (pharmacy: Pharmacy) => {
        // Mock logic based on status
        if (pharmacy.status === 'high') {
            return {
                summary: "Excepcional rendimiento en preventa.",
                trend: "📈 Ventas +22% vs mes anterior.",
                topProducts: "Broncochen, Neurobión",
                alert: "Ninguna alerta reciente."
            };
        } else if (pharmacy.status === 'low') {
            return {
                summary: "Baja rotación de inventario clave.",
                trend: "📉 Actividad -15% esta semana.",
                topProducts: "Aspirina",
                alert: "⚠️ 2 Dependientes inactivos por >3 días."
            };
        }
        return {
            summary: "Rendimiento estable y consistente.",
            trend: "➡️ Sin cambios significativos.",
            topProducts: "Complejo B",
            alert: "Revisar stock de temporada."
        }
    };

    const aiInsight = selectedPharmacy ? getAiInsight(selectedPharmacy) : null;

    return (
        <div className="h-[calc(100vh-8rem)] relative flex flex-col gap-4">

            {/* Header / Breadcrumbs */}
            <div className="flex items-center gap-2 bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                <Button variant="ghost" size="sm" onClick={handleBackToCountry} disabled={level === 1} className={level === 1 ? 'font-bold text-primary' : ''}>
                    🇩🇴 País
                </Button>
                {level > 1 && (
                    <>
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                        <Button variant="ghost" size="sm" onClick={handleBackToZone} disabled={level === 2} className={level === 2 ? 'font-bold text-primary' : ''}>
                            📍 {selectedRep?.zone}
                        </Button>
                    </>
                )}
                {level > 2 && (
                    <>
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                        <span className="text-sm font-bold text-slate-800 px-3">
                            🏥 {selectedPharmacy?.name}
                        </span>
                    </>
                )}
            </div>

            {/* Map Container */}
            <div className="flex-1 rounded-2xl overflow-hidden border border-slate-200 shadow-inner relative z-0">
                <MapContainer center={[18.7357, -70.1627]} zoom={8} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    />
                    <MapController center={mapView.center} zoom={mapView.zoom} />

                    {/* Level 1: Sales Reps */}
                    {level === 1 && MOCK_REPS.map(rep => (
                        <Marker
                            key={rep.id}
                            position={[rep.lat, rep.lng]}
                            icon={icons.blue}
                            eventHandlers={{
                                click: () => handleRepClick(rep)
                            }}
                        >
                            <Popup>
                                <div className="text-center">
                                    <div className="font-bold flex items-center gap-2 justify-center">
                                        <div className="bg-primary text-white text-xs w-6 h-6 rounded-full flex items-center justify-center">
                                            {rep.avatar}
                                        </div>
                                        {rep.name}
                                    </div>
                                    <p className="text-xs text-muted-foreground">{rep.zone}</p>
                                    <div className="mt-2 font-bold text-primary">
                                        RD$ {(rep.totalSales / 1000000).toFixed(1)}M
                                    </div>
                                    <Button size="sm" className="w-full mt-2 h-6 text-xs" onClick={() => handleRepClick(rep)}>
                                        Ver Zona
                                    </Button>
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                    {/* Level 2: Pharmacies */}
                    {(level === 2 || level === 3) && visiblePharmacies.map(pharmacy => (
                        <Marker
                            key={pharmacy.id}
                            position={[pharmacy.lat, pharmacy.lng]}
                            icon={pharmacy.status === 'high' ? icons.green : pharmacy.status === 'low' ? icons.red : icons.yellow}
                            eventHandlers={{
                                click: () => handlePharmacyClick(pharmacy)
                            }}
                        >
                            <Popup>
                                <div className="text-center p-1">
                                    <h3 className="font-bold text-sm">{pharmacy.name}</h3>
                                    <p className="text-[10px] text-muted-foreground mb-2">{pharmacy.address}</p>
                                    <Button size="sm" className="w-full h-7 text-xs" onClick={() => handlePharmacyClick(pharmacy)}>
                                        Ver Detalles
                                    </Button>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>

                {/* Legend Overlay */}
                <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur rounded-xl p-4 shadow-lg border border-slate-100 z-[1000]">
                    <h4 className="text-xs font-bold uppercase text-slate-400 mb-2 tracking-wider">Leyenda</h4>
                    <div className="space-y-2">
                        {level === 1 ? (
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 bg-[#2A81CB] rounded-full"></span>
                                <span className="text-xs font-medium">Visitadores (Reps)</span>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 bg-[#2AAD27] rounded-full"></span>
                                    <span className="text-xs font-medium">Alto Rendimiento</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 bg-[#CAC428] rounded-full"></span>
                                    <span className="text-xs font-medium">Promedio</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 bg-[#CB2B3E] rounded-full"></span>
                                    <span className="text-xs font-medium">Baja Actividad</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Level 3: Pharmacy Card (Sheet) */}
            <Sheet open={level === 3} onOpenChange={(open) => !open && handleBackToZone()}>
                <SheetContent className="sm:max-w-md w-full overflow-y-auto">
                    {selectedPharmacy && (
                        <div className="space-y-6">
                            <SheetHeader>
                                <div className="relative h-32 w-full rounded-xl overflow-hidden mb-4">
                                    <img src={selectedPharmacy.image} className="w-full h-full object-cover" alt="Pharmacy" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                    <div className="absolute bottom-3 left-3 text-white">
                                        <Badge variant={selectedPharmacy.status === 'high' ? 'default' : selectedPharmacy.status === 'low' ? 'destructive' : 'secondary'} className="mb-1">
                                            {selectedPharmacy.status === 'high' ? 'Excelente' : selectedPharmacy.status === 'low' ? 'Atención' : 'Normal'}
                                        </Badge>
                                        <SheetTitle className="text-white text-xl">{selectedPharmacy.name}</SheetTitle>
                                    </div>
                                </div>
                                <SheetDescription>
                                    Gestionada por: <span className="font-semibold text-primary">{selectedRep?.name}</span>
                                </SheetDescription>
                            </SheetHeader>

                            {/* AI Analysis Section */}
                            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 relative overflow-hidden">
                                <div className="absolute top-3 right-3">
                                    <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                                </div>
                                <h3 className="font-bold text-indigo-900 text-sm mb-3 flex items-center gap-2">
                                    ✨ AI Market Analysis
                                </h3>
                                <div className="space-y-2 text-sm text-slate-700">
                                    <p><span className="font-semibold">Resumen:</span> {aiInsight?.summary}</p>
                                    <p><span className="font-semibold">Tendencia:</span> {aiInsight?.trend}</p>
                                    <p><span className="font-semibold">Top Productos:</span> {aiInsight?.topProducts}</p>
                                    {selectedPharmacy.status === 'low' && (
                                        <p className="text-red-600 font-medium bg-red-50 p-2 rounded-lg border border-red-100 flex items-center gap-2">
                                            <AlertCircle className="w-3 h-3" /> {aiInsight?.alert}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Clerks List */}
                            <div>
                                <h3 className="font-bold text-lg mb-4 flex items-center justify-between">
                                    Dependientes
                                    <Badge variant="outline">{activeClerks.length}</Badge>
                                </h3>

                                <div className="space-y-3">
                                    {activeClerks.map((clerk, idx) => (
                                        <div key={clerk.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${idx === 0 ? 'bg-yellow-100 text-yellow-700 ring-2 ring-yellow-200' : 'bg-slate-100 text-slate-500'}`}>
                                                    {clerk.name.split(' ').map(n => n[0]).join('')}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-semibold text-sm">{clerk.name}</h4>
                                                        {idx === 0 && <Crown className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground">Activo: {clerk.lastActive}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="block font-bold text-primary text-sm">{clerk.totalPoints.toLocaleString()} pts</span>
                                                <span className="text-[10px] text-muted-foreground">{clerk.scans} escaneos</span>
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
