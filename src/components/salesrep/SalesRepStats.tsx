import { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { getPharmaciesForRep, getTeamMembers } from '@/lib/db';
import { Building2, Users, Trophy, TrendingUp, ArrowUpRight } from 'lucide-react';

export function SalesRepStats() {
    const { currentUser } = useApp();
    const [stats, setStats] = useState({
        pharmacies: 0,
        clerks: 0,
        points: 0,
        weeklyGrowth: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadStats = async () => {
            if (!currentUser?.id) return;
            try {
                // Use repId-based functions (correct approach)
                const phs = await getPharmaciesForRep(currentUser.id);
                const clerks = await getTeamMembers(currentUser.id);
                const totalPoints = clerks.reduce((acc: number, c: any) => acc + (c.pointsGenerated || 0), 0);

                setStats({
                    pharmacies: phs.length,
                    clerks: clerks.length,
                    points: totalPoints,
                    weeklyGrowth: 12
                });
            } catch (err) {
                console.error('Error loading stats:', err);
            } finally {
                setLoading(false);
            }
        };
        loadStats();
    }, [currentUser?.id]);

    const statCards = [
        {
            label: 'Farmacias Asignadas',
            value: stats.pharmacies,
            icon: Building2,
            gradient: 'linear-gradient(135deg, #3b82f6, #6366f1)',
            glow: 'rgba(99,102,241,0.25)',
            textColor: '#6366f1',
            bg: 'rgba(99,102,241,0.06)',
        },
        {
            label: 'Dependientes Activos',
            value: stats.clerks,
            icon: Users,
            gradient: 'linear-gradient(135deg, #10b981, #059669)',
            glow: 'rgba(16,185,129,0.25)',
            textColor: '#10b981',
            bg: 'rgba(16,185,129,0.06)',
        },
        {
            label: 'Puntos Generados',
            value: stats.points.toLocaleString(),
            icon: Trophy,
            gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
            glow: 'rgba(245,158,11,0.25)',
            textColor: '#d97706',
            bg: 'rgba(245,158,11,0.06)',
        },
        {
            label: 'Tendencia Semanal',
            value: `+${stats.weeklyGrowth}%`,
            icon: TrendingUp,
            gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
            glow: 'rgba(139,92,246,0.25)',
            textColor: '#8b5cf6',
            bg: 'rgba(139,92,246,0.06)',
        },
    ];

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">Bienvenido, {currentUser?.name?.split(' ')[0]} 👋</h1>
                <p className="text-muted-foreground mt-1">Resumen de rendimiento en tu zona</p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {statCards.map((card, i) => {
                    const Icon = card.icon;
                    return (
                        <div
                            key={i}
                            className="rounded-2xl p-5 border transition-all duration-300 hover:-translate-y-0.5"
                            style={{
                                background: '#fff',
                                borderColor: 'hsl(210 20% 92%)',
                                boxShadow: `0 4px 20px ${card.glow}`,
                            }}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div
                                    className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md"
                                    style={{ background: card.gradient }}
                                >
                                    <Icon className="h-5 w-5 text-white" />
                                </div>
                                <span
                                    className="text-xs font-medium flex items-center gap-0.5"
                                    style={{ color: card.textColor }}
                                >
                                    <ArrowUpRight className="h-3 w-3" />
                                    Live
                                </span>
                            </div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                                {card.label}
                            </p>
                            {loading ? (
                                <div className="h-8 w-20 bg-slate-100 rounded animate-pulse" />
                            ) : (
                                <p className="text-3xl font-bold" style={{ color: card.textColor }}>
                                    {card.value}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Placeholder Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div
                    className="rounded-2xl border-2 border-dashed h-64 flex flex-col items-center justify-center gap-3"
                    style={{ borderColor: 'hsl(210 20% 88%)', background: 'hsl(210 20% 98%)' }}
                >
                    <TrendingUp className="h-8 w-8 text-slate-300" />
                    <p className="text-sm font-medium text-muted-foreground">Gráfico de Tendencia</p>
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Próximamente</span>
                </div>
                <div
                    className="rounded-2xl border-2 border-dashed h-64 flex flex-col items-center justify-center gap-3"
                    style={{ borderColor: 'hsl(210 20% 88%)', background: 'hsl(210 20% 98%)' }}
                >
                    <Building2 className="h-8 w-8 text-slate-300" />
                    <p className="text-sm font-medium text-muted-foreground">Mapa de Calor por Zona</p>
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Próximamente</span>
                </div>
            </div>
        </div>
    );
}
