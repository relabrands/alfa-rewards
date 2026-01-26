import { useState, useEffect, useMemo } from 'react';
import { X, ArrowUpRight, ArrowDownLeft, Calendar, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScanRecord, RedemptionRequest } from '@/lib/types';
import { getAllUserScans, getUserRedemptionRequests } from '@/lib/db';
import { useApp } from '@/context/AppContext';
import { format, isToday, isYesterday, isSameWeek, isSameMonth, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface ClerkHistoryViewProps {
    isOpen: boolean;
    onClose: () => void;
}

type HISTORY_FILTER = 'all' | 'earned' | 'redeemed';
type TIME_FILTER = 'all' | 'month' | 'week';

export function ClerkHistoryView({ isOpen, onClose }: ClerkHistoryViewProps) {
    const { currentUser } = useApp();
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState<(ScanRecord | RedemptionRequest)[]>([]);
    const [filterType, setFilterType] = useState<HISTORY_FILTER>('all');
    const [timeFilter, setTimeFilter] = useState<TIME_FILTER>('all');

    // Analytics State
    const [stats, setStats] = useState({
        today: 0,
        week: 0,
        month: 0,
        totalEarned: 0,
        totalRedeemed: 0
    });

    useEffect(() => {
        if (isOpen && currentUser?.id) {
            loadFullHistory();
        }
    }, [isOpen, currentUser?.id]);

    const loadFullHistory = async () => {
        setLoading(true);
        try {
            if (!currentUser?.id) return;

            const [scans, redemptions] = await Promise.all([
                getAllUserScans(currentUser.id),
                getUserRedemptionRequests(currentUser.id)
            ]);

            // Calculate Stats
            const today = new Date();
            let earnedToday = 0;
            let earnedWeek = 0;
            let earnedMonth = 0;
            let totalEarned = 0;

            scans.forEach(scan => {
                const points = scan.pointsEarned || 0;
                const date = scan.timestamp instanceof Date ? scan.timestamp : new Date(scan.timestamp);

                totalEarned += points;

                if (isToday(date)) earnedToday += points;
                if (isSameWeek(date, today, { locale: es })) earnedWeek += points;
                if (isSameMonth(date, today)) earnedMonth += points;
            });

            const totalRedeemed = redemptions.reduce((acc, r) => acc + (r.pointsCost || 0), 0);

            setStats({
                today: earnedToday,
                week: earnedWeek,
                month: earnedMonth,
                totalEarned,
                totalRedeemed
            });

            // Merge and Sort
            const merged = [...scans, ...redemptions].sort((a, b) => {
                const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                return tB - tA;
            });

            setHistory(merged);
        } catch (error) {
            console.error("Error loading full history", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredHistory = useMemo(() => {
        let filtered = history;

        // Type Filter
        if (filterType === 'earned') {
            filtered = filtered.filter(item => !('rewardName' in item));
        } else if (filterType === 'redeemed') {
            filtered = filtered.filter(item => 'rewardName' in item);
        }

        // Time Filter
        const now = new Date();
        if (timeFilter === 'week') {
            filtered = filtered.filter(item => isSameWeek(new Date(item.timestamp), now, { locale: es }));
        } else if (timeFilter === 'month') {
            filtered = filtered.filter(item => isSameMonth(new Date(item.timestamp), now));
        }

        return filtered;
    }, [history, filterType, timeFilter]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="flex flex-col h-full max-w-md mx-auto bg-background shadow-2xl relative">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-10">
                    <h2 className="text-lg font-bold">Historial de Puntos</h2>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-3 gap-2">
                        <Card className="bg-primary/5 border-none shadow-none">
                            <CardContent className="p-3 flex flex-col items-center justify-center text-center">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground">Hoy</span>
                                <span className="text-xl font-black text-primary">+{stats.today}</span>
                            </CardContent>
                        </Card>
                        <Card className="bg-primary/5 border-none shadow-none">
                            <CardContent className="p-3 flex flex-col items-center justify-center text-center">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground">Semana</span>
                                <span className="text-xl font-black text-primary">+{stats.week}</span>
                            </CardContent>
                        </Card>
                        <Card className="bg-primary/5 border-none shadow-none">
                            <CardContent className="p-3 flex flex-col items-center justify-center text-center">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground">Mes</span>
                                <span className="text-xl font-black text-primary">+{stats.month}</span>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Detailed Stats */}
                    <div className="bg-slate-50 rounded-2xl p-4 flex justify-between items-center">
                        <div>
                            <p className="text-xs text-muted-foreground font-medium">Total Ganado</p>
                            <p className="text-lg font-bold text-green-600 flex items-center gap-1">
                                <ArrowUpRight className="w-4 h-4" />
                                {stats.totalEarned.toLocaleString()}
                            </p>
                        </div>
                        <div className="h-8 w-px bg-slate-200"></div>
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground font-medium">Total Canjeado</p>
                            <p className="text-lg font-bold text-red-500 flex items-center gap-1 justify-end">
                                <ArrowDownLeft className="w-4 h-4" />
                                {stats.totalRedeemed.toLocaleString()}
                            </p>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        <Button
                            variant={filterType === 'all' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilterType('all')}
                            className="rounded-full text-xs"
                        >
                            Todos
                        </Button>
                        <Button
                            variant={filterType === 'earned' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilterType('earned')}
                            className="rounded-full text-xs"
                        >
                            Ganados
                        </Button>
                        <Button
                            variant={filterType === 'redeemed' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilterType('redeemed')}
                            className="rounded-full text-xs"
                        >
                            Canjeados
                        </Button>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Actividad Reciente
                        </h3>

                        {loading ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
                                ))}
                            </div>
                        ) : filteredHistory.length > 0 ? (
                            <div className="space-y-3">
                                {filteredHistory.map((item) => {
                                    const isRedemption = 'rewardName' in item;
                                    const itemPoints = isRedemption ? (item as RedemptionRequest).pointsCost : (item as ScanRecord).pointsEarned;
                                    const date = new Date(item.timestamp);

                                    return (
                                        <div key={item.id} className="bg-white border border-slate-100 rounded-xl p-3 flex items-center justify-between shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isRedemption ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
                                                    {isRedemption ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-foreground">
                                                        {isRedemption ? 'Canje de Recompensa' : 'Escaneo de Factura'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {format(date, "d MMM, yyyy • h:mm a", { locale: es })}
                                                    </p>
                                                    {isRedemption && (
                                                        <p className="text-xs text-slate-500 mt-0.5">
                                                            {(item as RedemptionRequest).rewardName}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <span className={`font-black text-sm ${isRedemption ? 'text-red-500' : 'text-green-600'}`}>
                                                {isRedemption ? '-' : '+'}{itemPoints}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-10 text-muted-foreground text-sm">
                                No hay registros para este filtro.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
