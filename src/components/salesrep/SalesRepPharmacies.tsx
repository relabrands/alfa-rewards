import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Building2, Search, MapPin, TrendingUp } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { getPharmaciesByZone } from '@/lib/db';
import { Pharmacy } from '@/lib/types';

export function SalesRepPharmacies() {
    const { currentUser } = useApp();
    const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

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

    const filteredPharmacies = pharmacies.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.sector && p.sector.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Mis Farmacias</h1>
                    <p className="text-muted-foreground mt-1">Farmacias asignadas a tu zona ({currentUser.zone?.join(', ') || 'N/A'})</p>
                </div>
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar farmacia..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-muted-foreground">Cargando farmacias...</div>
            ) : filteredPharmacies.length === 0 ? (
                <div className="text-center py-12">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <Building2 className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium">No se encontraron farmacias</h3>
                    <p className="text-muted-foreground">No hay farmacias asignadas a tu zona o que coincidan con la búsqueda.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredPharmacies.map((pharmacy) => (
                        <Card key={pharmacy.id} className="hover:shadow-md transition-all">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                                        <Building2 className="h-5 w-5" />
                                    </div>
                                    <Badge variant={pharmacy.isActive ? 'default' : 'secondary'} className={pharmacy.isActive ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}>
                                        {pharmacy.isActive ? 'Activa' : 'Inactiva'}
                                    </Badge>
                                </div>

                                <h3 className="font-bold text-lg mb-1 truncate" title={pharmacy.name}>{pharmacy.name}</h3>
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
        </div>
    );
}
