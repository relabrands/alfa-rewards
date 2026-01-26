import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/context/AppContext';
import { getPharmaciesByZone, getTeamMembers } from '@/lib/db';
import { Trophy, Medal, Building2, Users } from 'lucide-react';
import { RegisteredClerk, Pharmacy } from '@/lib/types';

export function SalesRepPerformance() {
    const { currentUser } = useApp();
    const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
    const [clerks, setClerks] = useState<RegisteredClerk[]>([]);

    useEffect(() => {
        const load = async () => {
            if (currentUser?.zone) {
                const phs = await getPharmaciesByZone(currentUser.zone);
                // Sort by monthly points (assuming monthlyPoints exists)
                setPharmacies(phs.sort((a, b) => (b.monthlyPoints || 0) - (a.monthlyPoints || 0)));

                const cls = await getTeamMembers(currentUser.zone);
                setClerks((cls as RegisteredClerk[]).sort((a, b) => (b.pointsGenerated || 0) - (a.pointsGenerated || 0)));
            }
        };
        load();
    }, [currentUser]);

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Rendimiento</h1>
                <p className="text-muted-foreground">Rankings de tu zona</p>
            </div>

            <Tabs defaultValue="clerks" className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                    <TabsTrigger value="clerks">Top Dependientes</TabsTrigger>
                    <TabsTrigger value="pharmacies">Top Farmacias</TabsTrigger>
                </TabsList>

                <TabsContent value="clerks" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-primary" /> Ranking de Dependientes
                            </CardTitle>
                            <CardDescription>Basado en puntos generados (Total Histórico)</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y">
                                {clerks.slice(0, 10).map((clerk, index) => (
                                    <div key={clerk.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                                        <div className={`
                                            w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                                            ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                index === 1 ? 'bg-slate-200 text-slate-700' :
                                                    index === 2 ? 'bg-orange-100 text-orange-800' : 'bg-slate-100 text-slate-500'}
                                        `}>
                                            {index + 1}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-sm">{clerk.name}</p>
                                            <p className="text-xs text-muted-foreground">{clerk.pharmacyName}</p>
                                        </div>
                                        <div className="text-right">
                                            <Badge variant="outline" className="font-mono">
                                                {clerk.pointsGenerated.toLocaleString()} pts
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                                {clerks.length === 0 && <div className="p-8 text-center text-muted-foreground">Cargando datos...</div>}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="pharmacies" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-primary" /> Ranking de Farmacias
                            </CardTitle>
                            <CardDescription>Basado en puntos acumulados este mes</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y">
                                {pharmacies.slice(0, 10).map((ph, index) => (
                                    <div key={ph.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                                        <div className={`
                                            w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                                            ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                index === 1 ? 'bg-slate-200 text-slate-700' :
                                                    index === 2 ? 'bg-orange-100 text-orange-800' : 'bg-slate-100 text-slate-500'}
                                        `}>
                                            {index + 1}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-sm">{ph.name}</p>
                                            <p className="text-xs text-muted-foreground">{ph.sector}</p>
                                        </div>
                                        <div className="text-right">
                                            <Badge variant="secondary" className="font-mono">
                                                {ph.monthlyPoints?.toLocaleString() || 0} pts
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                                {pharmacies.length === 0 && <div className="p-8 text-center text-muted-foreground">Cargando datos...</div>}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
