import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/context/AppContext';
import { getTeamMembers } from '@/lib/db';
import { RegisteredClerk } from '@/lib/types';
import { UserPlus, CheckCircle2, AlertCircle, Clock, ArrowRight, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function SalesRepFollowUp() {
    const { currentUser } = useApp();
    const { toast } = useToast();
    const [clerks, setClerks] = useState<RegisteredClerk[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            if (currentUser?.zone) {
                const data = await getTeamMembers(currentUser.zone);
                setClerks(data as RegisteredClerk[]);
            }
            setLoading(false);
        };
        load();
    }, [currentUser]);

    // Funnel Logic
    const pending = clerks.filter(c => c.status === 'pending');
    const approved = clerks.filter(c => c.status === 'active' && (!c.pointsGenerated || c.pointsGenerated === 0));
    const active = clerks.filter(c => c.status === 'active' && c.pointsGenerated > 0);
    // Inactive logic would require 'lastActivity' timestamp, which we don't strictly have in RegisteredClerk yet, 
    // assuming 'active' with > 0 points is 'Active' for now. 
    // If we had lastActivity > 14 days, we'd put them in a separate bucket.
    // For now, let's use a mock split or just the 3 buckets we can be sure of.
    // Let's assume we can fetch lastActivity in the future.

    const handleWhatsApp = (clerk: RegisteredClerk, type: 'welcome' | 'activate' | 'engage') => {
        let msg = '';
        if (type === 'welcome') msg = `Hola ${clerk.name}, veo que te registraste en Alfa Rewards. ¿Necesitas ayuda para completar tu perfil?`;
        if (type === 'activate') msg = `Hola ${clerk.name}, ¡tu cuenta está activa! ¿Ya escaneaste tu primera factura para ganar puntos?`;
        if (type === 'engage') msg = `Hola ${clerk.name}, ¿cómo vas con los puntos? ¡Hay premios esperando!`;

        const phone = clerk.phone.replace(/\D/g, '');
        window.open(`https://wa.me/1${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Seguimiento Inteligente</h1>
                <p className="text-muted-foreground">Embudo de conversión de dependientes</p>
            </div>

            {/* Funnel Visual */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-slate-50 border-dashed border-slate-300">
                    <CardHeader className="pb-2">
                        <Badge variant="secondary" className="w-fit mb-2">Paso 1</Badge>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Clock className="w-5 h-5 text-slate-500" /> Registrados
                        </CardTitle>
                        <CardDescription>Pendientes de aprobación</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold text-slate-700">{pending.length}</p>
                    </CardContent>
                </Card>

                <Card className="bg-blue-50 border-dashed border-blue-200">
                    <CardHeader className="pb-2">
                        <Badge className="w-fit mb-2 bg-blue-500">Paso 2</Badge>
                        <CardTitle className="text-lg flex items-center gap-2 text-blue-900">
                            <UserPlus className="w-5 h-5" /> Aprobados
                        </CardTitle>
                        <CardDescription className="text-blue-700/70">Listos para escanear (0 pts)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold text-blue-700">{approved.length}</p>
                    </CardContent>
                </Card>

                <Card className="bg-green-50 border-dashed border-green-200">
                    <CardHeader className="pb-2">
                        <Badge className="w-fit mb-2 bg-green-600">Meta</Badge>
                        <CardTitle className="text-lg flex items-center gap-2 text-green-900">
                            <CheckCircle2 className="w-5 h-5" /> Activos
                        </CardTitle>
                        <CardDescription className="text-green-700/70">Generando puntos</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold text-green-700">{active.length}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Action Lists */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Activation List */}
                <Card>
                    <CardHeader>
                        <CardTitle>Por Activar (0 Puntos)</CardTitle>
                        <CardDescription>Estos usuarios ya pueden usar la app pero no han empezado.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="max-h-80 overflow-auto divide-y">
                            {approved.map(c => (
                                <div key={c.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                                    <div>
                                        <p className="font-bold">{c.name}</p>
                                        <p className="text-xs text-muted-foreground">{c.pharmacyName}</p>
                                    </div>
                                    <Button size="sm" variant="outline" onClick={() => handleWhatsApp(c, 'activate')}>
                                        <MessageCircle className="w-4 h-4 mr-2 text-green-600" /> Motivar
                                    </Button>
                                </div>
                            ))}
                            {approved.length === 0 && <div className="p-4 text-center text-muted-foreground">¡Excelente! Todos los aprobados están activos.</div>}
                        </div>
                    </CardContent>
                </Card>

                {/* Validation Pending List (Using Pending status) */}
                <Card>
                    <CardHeader>
                        <CardTitle>Pendientes de Aprobación</CardTitle>
                        <CardDescription>Usuarios que esperan validación de registro.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="max-h-80 overflow-auto divide-y">
                            {pending.map(c => (
                                <div key={c.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                                    <div>
                                        <p className="font-bold">{c.name}</p>
                                        <p className="text-xs text-muted-foreground">{c.pharmacyName}</p>
                                    </div>
                                    <Button size="sm" variant="outline" onClick={() => handleWhatsApp(c, 'welcome')}>
                                        <MessageCircle className="w-4 h-4 mr-2 text-blue-600" /> Saludar
                                    </Button>
                                </div>
                            ))}
                            {pending.length === 0 && <div className="p-4 text-center text-muted-foreground">No hay registros pendientes.</div>}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
