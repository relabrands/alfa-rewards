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
            accent: '#00C2E0',
            accentBg: 'rgba(0,194,224,0.08)',
        },
        {
            label: 'Dependientes Activos',
            value: stats.clerks,
            icon: Users,
            accent: '#10b981',
            accentBg: 'rgba(16,185,129,0.08)',
        },
        {
            label: 'Puntos Generados',
            value: stats.points.toLocaleString(),
            icon: Trophy,
            accent: '#00C2E0',
            accentBg: 'rgba(0,194,224,0.08)',
        },
        {
            label: 'Tendencia Semanal',
            value: `+${stats.weeklyGrowth}%`,
            icon: TrendingUp,
            accent: '#10b981',
            accentBg: 'rgba(16,185,129,0.08)',
        },
    ];

    return (
        <div className="space-y-7">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold" style={{ color: '#0d1117' }}>
                        Bienvenido, {currentUser?.name?.split(' ')[0]}
                    </h1>
                    <p className="text-sm mt-0.5" style={{ color: '#94a3b8' }}>Resumen de rendimiento en tu zona</p>
                </div>
                <div
                    className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border"
                    style={{ borderColor: 'rgba(0,194,224,0.3)', color: '#00C2E0', background: 'rgba(0,194,224,0.06)' }}
                >
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00C2E0' }} />
                    En vivo
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((card, i) => {
                    const Icon = card.icon;
                    return (
                        <div
                            key={i}
                            className="rounded-xl p-5 border bg-white transition-all duration-200 hover:shadow-md"
                            style={{ borderColor: '#e8edf2' }}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div
                                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                                    style={{ background: card.accentBg }}
                                >
                                    <Icon style={{ width: '17px', height: '17px', color: card.accent }} />
                                </div>
                                <span
                                    className="text-[11px] font-medium flex items-center gap-0.5"
                                    style={{ color: card.accent }}
                                >
                                    <ArrowUpRight style={{ width: '12px', height: '12px' }} />
                                    Live
                                </span>
                            </div>
                            <p className="text-[11px] font-medium uppercase tracking-wider mb-1" style={{ color: '#94a3b8' }}>
                                {card.label}
                            </p>
                            {loading ? (
                                <div className="h-7 w-16 bg-slate-100 rounded-md animate-pulse" />
                            ) : (
                                <p className="text-2xl font-bold" style={{ color: '#0d1117' }}>
                                    {card.value}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Placeholder Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div
                    className="rounded-xl border-2 border-dashed h-56 flex flex-col items-center justify-center gap-2"
                    style={{ borderColor: '#e8edf2', background: '#f8fafc' }}
                >
                    <TrendingUp style={{ width: '28px', height: '28px', color: '#cbd5e1' }} />
                    <p className="text-sm font-medium" style={{ color: '#94a3b8' }}>Gráfico de Tendencia</p>
                    <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: '#f0f3f6', color: '#94a3b8' }}>Próximamente</span>
                </div>
                <div
                    className="rounded-xl border-2 border-dashed h-56 flex flex-col items-center justify-center gap-2"
                    style={{ borderColor: '#e8edf2', background: '#f8fafc' }}
                >
                    <Building2 style={{ width: '28px', height: '28px', color: '#cbd5e1' }} />
                    <p className="text-sm font-medium" style={{ color: '#94a3b8' }}>Mapa de Calor por Zona</p>
                    <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: '#f0f3f6', color: '#94a3b8' }}>Próximamente</span>
                </div>
            </div>
        </div>
    );
}
