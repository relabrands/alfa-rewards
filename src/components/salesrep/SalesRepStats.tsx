import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useApp } from '@/context/AppContext';
import { getPharmaciesByZone, getTeamMembers } from '@/lib/db';
import { Building2, Users, Trophy, TrendingUp } from 'lucide-react';

export function SalesRepStats() {
    const { currentUser } = useApp();
    const [stats, setStats] = useState({
        pharmacies: 0,
        clerks: 0,
        points: 0,
        weeklyGrowth: 0
    });

    useEffect(() => {
        const loadStats = async () => {
            if (currentUser?.zone && currentUser.zone.length > 0) {
                // 1. Pharmacies
                const phs = await getPharmaciesByZone(currentUser.zone);

                // 2. Clerks
                const clerks = await getTeamMembers(currentUser.zone);

                // 3. Points (Sum of all clerks in zone)
                const totalPoints = clerks.reduce((acc, c) => acc + (c.pointsGenerated || 0), 0);

                // 4. Growth (Mocked for now or calc from history if available)
                // In a real app, we'd query last week's snapshots. 
                // For now, let's assume 12% growth to show the UI.

                setStats({
                    pharmacies: phs.length,
                    clerks: clerks.length,
                    points: totalPoints,
                    weeklyGrowth: 12
                });
            }
        };
        loadStats();
    }, [currentUser]);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
                <p className="text-muted-foreground">Resumen de rendimiento en tu zona</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Banks of Cards */}
                <Card className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground uppercase">Farmacias Asignadas</p>
                                <h3 className="text-3xl font-bold mt-2">{stats.pharmacies}</h3>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                <Building2 className="w-6 h-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow border-l-4 border-l-emerald-500">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground uppercase">Dependientes Activos</p>
                                <h3 className="text-3xl font-bold mt-2">{stats.clerks}</h3>
                            </div>
                            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                                <Users className="w-6 h-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow border-l-4 border-l-amber-500">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground uppercase">Puntos Generados</p>
                                <h3 className="text-3xl font-bold mt-2 text-amber-600">{stats.points.toLocaleString()}</h3>
                            </div>
                            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                                <Trophy className="w-6 h-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow border-l-4 border-l-purple-500">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground uppercase">Tendencia Semanal</p>
                                <div className="flex items-baseline gap-2 mt-2">
                                    <h3 className="text-3xl font-bold">+{stats.weeklyGrowth}%</h3>
                                </div>
                            </div>
                            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Placeholder for charts or lists */}
                <div className="bg-slate-50 border border-dashed rounded-xl h-64 flex items-center justify-center text-muted-foreground">
                    Gráfico de Tendencia (Próximamente)
                </div>
                <div className="bg-slate-50 border border-dashed rounded-xl h-64 flex items-center justify-center text-muted-foreground">
                    Mapa de Calor Zona (Próximamente)
                </div>
            </div>
        </div>
    );
}
