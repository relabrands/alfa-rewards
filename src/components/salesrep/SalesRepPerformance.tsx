import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/context/AppContext';
import { getPharmaciesForRep, getTeamMembers } from '@/lib/db';
import { Trophy, Medal, Building2, Users, Loader2 } from 'lucide-react';
import { RegisteredClerk, Pharmacy } from '@/lib/types';

const RANK_STYLES = [
    { bg: 'linear-gradient(135deg,#f59e0b,#d97706)', text: '#fff', label: '🥇' },
    { bg: 'linear-gradient(135deg,#9ca3af,#6b7280)', text: '#fff', label: '🥈' },
    { bg: 'linear-gradient(135deg,#d97706,#b45309)', text: '#fff', label: '🥉' },
];

export function SalesRepPerformance() {
    const { currentUser } = useApp();
    const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
    const [clerks, setClerks] = useState<RegisteredClerk[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            if (currentUser?.id) {
                try {
                    const [phs, cls] = await Promise.all([
                        getPharmaciesForRep(currentUser.id),
                        getTeamMembers(currentUser.id),
                    ]);
                    setPharmacies(phs.sort((a, b) => (b.monthlyPoints || 0) - (a.monthlyPoints || 0)));
                    setClerks((cls as RegisteredClerk[]).sort((a, b) => (b.pointsGenerated || 0) - (a.pointsGenerated || 0)));
                } catch (err) {
                    console.error('Error loading performance:', err);
                }
            }
            setLoading(false);
        };
        load();
    }, [currentUser?.id]);

    const RankingItem = ({ rank, name, subtitle, value, unit }: {
        rank: number; name: string; subtitle: string; value: number | string; unit: string;
    }) => {
        const style = RANK_STYLES[rank] || { bg: 'hsl(210 20% 92%)', text: '#64748b', label: `${rank + 1}` };
        return (
            <div className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors rounded-xl group">
                <div
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold shadow"
                    style={{ background: style.bg, color: style.text }}
                >
                    {style.label}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{name}</p>
                    <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
                </div>
                <Badge
                    variant="outline"
                    className="font-mono text-xs shrink-0 bg-white"
                >
                    {typeof value === 'number' ? value.toLocaleString() : value} {unit}
                </Badge>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Rendimiento</h1>
                <p className="text-muted-foreground mt-1">Rankings de tu zona</p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center gap-3 py-20 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Cargando rankings...
                </div>
            ) : (
                <Tabs defaultValue="clerks" className="w-full">
                    <TabsList className="h-10 bg-slate-100 rounded-xl p-1">
                        <TabsTrigger value="clerks" className="rounded-lg text-sm">
                            <Users className="h-4 w-4 mr-2" /> Top Dependientes
                        </TabsTrigger>
                        <TabsTrigger value="pharmacies" className="rounded-lg text-sm">
                            <Building2 className="h-4 w-4 mr-2" /> Top Farmacias
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="clerks" className="mt-5">
                        <Card className="rounded-2xl border shadow-sm overflow-hidden" style={{ borderColor: 'hsl(210 20% 92%)' }}>
                            <CardHeader className="border-b pb-4" style={{ borderColor: 'hsl(210 20% 92%)' }}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
                                        <Trophy className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base">Ranking de Dependientes</CardTitle>
                                        <CardDescription className="text-xs">Basado en puntos generados (total histórico)</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-2">
                                {clerks.length === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground">
                                        <Users className="h-8 w-8 mx-auto mb-3 opacity-30" />
                                        <p className="text-sm">No hay datos de dependientes.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        {clerks.slice(0, 10).map((clerk, index) => (
                                            <RankingItem
                                                key={clerk.id}
                                                rank={index}
                                                name={clerk.name}
                                                subtitle={clerk.pharmacyName || ''}
                                                value={clerk.pointsGenerated || 0}
                                                unit="pts"
                                            />
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="pharmacies" className="mt-5">
                        <Card className="rounded-2xl border shadow-sm overflow-hidden" style={{ borderColor: 'hsl(210 20% 92%)' }}>
                            <CardHeader className="border-b pb-4" style={{ borderColor: 'hsl(210 20% 92%)' }}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
                                        <Building2 className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base">Ranking de Farmacias</CardTitle>
                                        <CardDescription className="text-xs">Basado en puntos acumulados este mes</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-2">
                                {pharmacies.length === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground">
                                        <Building2 className="h-8 w-8 mx-auto mb-3 opacity-30" />
                                        <p className="text-sm">No hay datos de farmacias.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        {pharmacies.slice(0, 10).map((ph, index) => (
                                            <RankingItem
                                                key={ph.id}
                                                rank={index}
                                                name={ph.name}
                                                subtitle={ph.sector || ph.address || ''}
                                                value={ph.monthlyPoints || 0}
                                                unit="pts/mes"
                                            />
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}
