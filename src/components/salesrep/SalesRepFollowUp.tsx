import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/context/AppContext';
import { getTeamMembers } from '@/lib/db';
import { RegisteredClerk } from '@/lib/types';
import { UserPlus, CheckCircle2, Clock, MessageCircle, Loader2, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function SalesRepFollowUp() {
    const { currentUser } = useApp();
    const { toast } = useToast();
    const [clerks, setClerks] = useState<RegisteredClerk[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            if (currentUser?.id) {
                try {
                    // Correct: use repId
                    const data = await getTeamMembers(currentUser.id);
                    setClerks(data as RegisteredClerk[]);
                } catch (err) {
                    console.error('Error loading team:', err);
                }
            }
            setLoading(false);
        };
        load();
    }, [currentUser?.id]);

    const pending = clerks.filter(c => c.status === 'pending');
    const approved = clerks.filter(c => c.status === 'active' && (!c.pointsGenerated || c.pointsGenerated === 0));
    const active = clerks.filter(c => c.status === 'active' && c.pointsGenerated > 0);

    const handleWhatsApp = (clerk: RegisteredClerk, type: 'welcome' | 'activate' | 'engage') => {
        let msg = '';
        if (type === 'welcome') msg = `Hola ${clerk.name}, veo que te registraste en Alfa Rewards. ¿Necesitas ayuda para completar tu perfil?`;
        if (type === 'activate') msg = `Hola ${clerk.name}, ¡tu cuenta está activa! ¿Ya escaneaste tu primera factura para ganar puntos?`;
        if (type === 'engage') msg = `Hola ${clerk.name}, ¿cómo vas con los puntos? ¡Hay premios esperando!`;

        const phone = clerk.phone.replace(/\D/g, '');
        window.open(`https://wa.me/1${phone}?text=${encodeURIComponent(msg)}`, '_blank');
        toast({ title: '📱 WhatsApp abierto', description: `Mensaje listo para ${clerk.name}` });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center gap-3 py-20 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Cargando seguimiento...
            </div>
        );
    }

    const funnelSteps = [
        {
            step: '1',
            title: 'Registrados',
            subtitle: 'Pendientes de aprobación',
            count: pending.length,
            icon: Clock,
            gradient: 'linear-gradient(135deg,#64748b,#475569)',
            bg: 'rgba(100,116,139,0.06)',
            border: 'rgba(100,116,139,0.2)',
            textColor: '#475569',
        },
        {
            step: '2',
            title: 'Aprobados',
            subtitle: 'Listos para escanear (0 pts)',
            count: approved.length,
            icon: UserPlus,
            gradient: 'linear-gradient(135deg,#3b82f6,#6366f1)',
            bg: 'rgba(59,130,246,0.06)',
            border: 'rgba(59,130,246,0.2)',
            textColor: '#3b82f6',
        },
        {
            step: '🎯',
            title: 'Activos',
            subtitle: 'Generando puntos',
            count: active.length,
            icon: CheckCircle2,
            gradient: 'linear-gradient(135deg,#10b981,#059669)',
            bg: 'rgba(16,185,129,0.06)',
            border: 'rgba(16,185,129,0.2)',
            textColor: '#10b981',
        },
    ];

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">Seguimiento Inteligente</h1>
                <p className="text-muted-foreground mt-1">Embudo de conversión de dependientes</p>
            </div>

            {/* Funnel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {funnelSteps.map((step, i) => {
                    const Icon = step.icon;
                    return (
                        <div key={i} className="relative">
                            <div
                                className="rounded-2xl border p-5 transition-all"
                                style={{ background: step.bg, borderColor: step.border }}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center shadow"
                                        style={{ background: step.gradient }}
                                    >
                                        <Icon className="h-5 w-5 text-white" />
                                    </div>
                                    <span
                                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                                        style={{ background: step.bg, color: step.textColor, border: `1px solid ${step.border}` }}
                                    >
                                        Paso {step.step}
                                    </span>
                                </div>
                                <p className="text-4xl font-bold mb-1" style={{ color: step.textColor }}>{step.count}</p>
                                <p className="font-semibold text-sm text-foreground">{step.title}</p>
                                <p className="text-xs text-muted-foreground">{step.subtitle}</p>
                            </div>
                            {i < funnelSteps.length - 1 && (
                                <div className="hidden md:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 w-4 h-4 items-center justify-center">
                                    <ArrowRight className="h-4 w-4 text-slate-400" />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Action Lists */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Por Activar */}
                <Card className="rounded-2xl border shadow-sm overflow-hidden" style={{ borderColor: 'hsl(210 20% 92%)' }}>
                    <CardHeader className="border-b pb-4" style={{ borderColor: 'hsl(210 20% 92%)' }}>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.1)' }}>
                                <UserPlus className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                                <CardTitle className="text-base">Por Activar</CardTitle>
                                <CardDescription className="text-xs">Aprobados que aún no han escaneado</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="max-h-72 overflow-auto divide-y" style={{ borderColor: 'hsl(210 20% 94%)' }}>
                            {approved.map(c => (
                                <div key={c.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                                            {c.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm">{c.name}</p>
                                            <p className="text-xs text-muted-foreground">{c.pharmacyName}</p>
                                        </div>
                                    </div>
                                    <Button size="sm" variant="outline" onClick={() => handleWhatsApp(c, 'activate')}
                                        className="text-xs gap-1.5 text-green-700 border-green-200 hover:bg-green-50">
                                        <MessageCircle className="w-3.5 h-3.5" /> Motivar
                                    </Button>
                                </div>
                            ))}
                            {approved.length === 0 && (
                                <div className="p-8 text-center text-muted-foreground">
                                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-400" />
                                    <p className="text-sm font-medium text-emerald-700">¡Todos los aprobados están activos!</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Pendientes de Aprobación */}
                <Card className="rounded-2xl border shadow-sm overflow-hidden" style={{ borderColor: 'hsl(210 20% 92%)' }}>
                    <CardHeader className="border-b pb-4" style={{ borderColor: 'hsl(210 20% 92%)' }}>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(100,116,139,0.1)' }}>
                                <Clock className="h-4 w-4 text-slate-600" />
                            </div>
                            <div>
                                <CardTitle className="text-base">Pendientes de Aprobación</CardTitle>
                                <CardDescription className="text-xs">Usuarios esperando validación</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="max-h-72 overflow-auto divide-y" style={{ borderColor: 'hsl(210 20% 94%)' }}>
                            {pending.map(c => (
                                <div key={c.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xs">
                                            {c.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm">{c.name}</p>
                                            <p className="text-xs text-muted-foreground">{c.pharmacyName}</p>
                                        </div>
                                    </div>
                                    <Button size="sm" variant="outline" onClick={() => handleWhatsApp(c, 'welcome')}
                                        className="text-xs gap-1.5 text-blue-700 border-blue-200 hover:bg-blue-50">
                                        <MessageCircle className="w-3.5 h-3.5" /> Saludar
                                    </Button>
                                </div>
                            ))}
                            {pending.length === 0 && (
                                <div className="p-8 text-center text-muted-foreground">
                                    <p className="text-sm">No hay registros pendientes.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
