import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getPendingUsers, updateUserStatus, getPharmacies } from "@/lib/db";
import { User, Pharmacy } from "@/lib/types";
import { CheckCircle2, XCircle, Clock, UserCheck, Search, Eye, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useApp } from "@/context/AppContext";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export function SalesRepApprovals() {
    const { toast } = useToast();
    const { currentUser } = useApp();
    const [pendingUsers, setPendingUsers] = useState<User[]>([]);
    const [pharmacies, setPharmacies] = useState<Record<string, Pharmacy>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState("");

    useEffect(() => {
        if (currentUser) {
            loadData();
        }
    }, [currentUser]);

    const loadData = async () => {
        try {
            const phList = await getPharmacies();
            const phMap: Record<string, Pharmacy> = {};
            phList.forEach(p => phMap[p.id] = p);
            setPharmacies(phMap);

            const allPending = await getPendingUsers();

            let filteredByZone: User[] = [];
            if (currentUser?.zone && currentUser.zone.length > 0) {
                filteredByZone = allPending.filter(user => {
                    const userSector = user.zone?.[0];
                    if (!userSector) return false;
                    return currentUser.zone?.some(z => z.toLowerCase() === userSector.toLowerCase());
                });
            } else {
                filteredByZone = [];
            }

            setPendingUsers(filteredByZone);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "No se pudieron cargar los datos", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async (userId: string) => {
        try {
            await updateUserStatus(userId, 'active');
            setPendingUsers(prev => prev.filter(u => u.id !== userId));
            toast({ title: "✅ Usuario Aprobado", description: "El dependiente ya puede acceder al sistema." });
        } catch {
            toast({ title: "Error", description: "No se pudo aprobar el usuario.", variant: "destructive" });
        }
    };

    const handleReject = async (userId: string) => {
        try {
            await updateUserStatus(userId, 'disabled');
            setPendingUsers(prev => prev.filter(u => u.id !== userId));
            toast({ title: "Usuario Rechazado", description: "Se ha denegado el acceso.", variant: "destructive" });
        } catch {
            toast({ title: "Error", description: "No se pudo rechazar el usuario.", variant: "destructive" });
        }
    };

    const filteredUsers = pendingUsers.filter(u =>
        u.name.toLowerCase().includes(filter.toLowerCase()) ||
        u.cedula?.includes(filter) ||
        u.email?.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Aprobaciones</h1>
                    <p className="text-muted-foreground mt-1">Gestiona las solicitudes de registro de nuevos dependientes.</p>
                </div>
                <div
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium"
                    style={{
                        background: pendingUsers.length > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)',
                        borderColor: pendingUsers.length > 0 ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)',
                        color: pendingUsers.length > 0 ? '#d97706' : '#059669',
                    }}
                >
                    <Clock className="h-4 w-4" />
                    {pendingUsers.length} pendientes
                </div>
            </div>

            <Card className="rounded-2xl border shadow-sm overflow-hidden" style={{ borderColor: 'hsl(210 20% 92%)' }}>
                <CardHeader className="border-b pb-4" style={{ borderColor: 'hsl(210 20% 92%)' }}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
                                <UserCheck className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-base">Solicitudes Pendientes</CardTitle>
                                <CardDescription className="text-xs">{pendingUsers.length} usuarios esperando aprobación</CardDescription>
                            </div>
                        </div>
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nombre o cédula..."
                                className="pl-9 h-9 rounded-xl text-sm"
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center gap-3 py-12 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Cargando solicitudes...
                        </div>
                    ) : (!currentUser?.zone || currentUser.zone.length === 0) ? (
                        <div className="text-center py-14 rounded-2xl border-2 border-dashed" style={{ borderColor: 'hsl(210 20% 88%)' }}>
                            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Clock className="h-8 w-8 text-amber-500" />
                            </div>
                            <h3 className="text-lg font-semibold">Sin Zonas Asignadas</h3>
                            <p className="text-muted-foreground text-sm mt-1">Contacta a tu gerente para que te asigne tus zonas de cobertura.</p>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="text-center py-14 rounded-2xl border-2 border-dashed" style={{ borderColor: 'hsl(210 20% 88%)' }}>
                            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                            </div>
                            <h3 className="text-lg font-semibold">¡Todo al día!</h3>
                            <p className="text-muted-foreground text-sm mt-1">No hay solicitudes pendientes en tus zonas.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredUsers.map((user) => {
                                const pharmacy = user.pharmacyId ? pharmacies[user.pharmacyId] : null;
                                return (
                                    <div
                                        key={user.id}
                                        className="flex items-center justify-between p-4 rounded-xl border transition-all hover:shadow-sm"
                                        style={{ borderColor: 'hsl(210 20% 92%)', background: '#fff' }}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div
                                                className="h-11 w-11 rounded-full flex items-center justify-center text-white font-bold text-base shadow"
                                                style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}
                                            >
                                                {user.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-sm">{user.name} {user.lastName}</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant="outline" className="text-xs h-5 px-2">{user.cedula || 'Sin cédula'}</Badge>
                                                    <Badge className="text-xs h-5 px-2 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50">
                                                        {user.zone?.[0] || 'Sin Zona'}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    📍 {pharmacy ? pharmacy.name : (user.pharmacyId || 'N/A')}
                                                </p>
                                            </div>
                                        </div>

                                        <UserDetailsDialog
                                            user={user}
                                            pharmacy={user.pharmacyId ? pharmacies[user.pharmacyId] : undefined}
                                            onApprove={() => handleApprove(user.id)}
                                            onReject={() => handleReject(user.id)}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function UserDetailsDialog({ user, pharmacy, onApprove, onReject }: {
    user: User; pharmacy?: Pharmacy; onApprove: () => void; onReject: () => void;
}) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="rounded-xl text-xs gap-1.5">
                    <Eye className="h-3.5 w-3.5" /> Ver Detalles
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-2xl">
                <DialogHeader>
                    <DialogTitle>Detalles del Solicitante</DialogTitle>
                    <DialogDescription>Revisa la información antes de aprobar</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Avatar row */}
                    <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: 'hsl(210 20% 97%)' }}>
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow"
                            style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
                            {user.name.charAt(0)}
                        </div>
                        <div>
                            <p className="font-bold">{user.name} {user.lastName}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1 p-3 rounded-xl bg-slate-50">
                            <Label className="text-muted-foreground text-xs">Cédula</Label>
                            <p className="font-mono font-semibold text-sm">{user.cedula}</p>
                        </div>
                        <div className="space-y-1 p-3 rounded-xl bg-slate-50">
                            <Label className="text-muted-foreground text-xs">Teléfono</Label>
                            <p className="font-semibold text-sm">{user.phone}</p>
                        </div>
                        <div className="space-y-1 p-3 rounded-xl bg-slate-50 col-span-2">
                            <Label className="text-muted-foreground text-xs">Farmacia</Label>
                            <p className="font-semibold text-sm">{pharmacy?.name || user.pharmacyId || 'N/A'}</p>
                            {pharmacy?.address && <p className="text-xs text-muted-foreground">{pharmacy.address}</p>}
                        </div>
                        <div className="space-y-1 p-3 rounded-xl bg-slate-50 col-span-2">
                            <Label className="text-muted-foreground text-xs">Sector / Zona</Label>
                            <p className="font-semibold text-sm">{user.zone?.[0] || pharmacy?.sector || 'N/A'}</p>
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex gap-3 sm:justify-between">
                    <Button
                        variant="outline"
                        className="flex-1 rounded-xl text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => { onReject(); setIsOpen(false); }}
                    >
                        <XCircle className="h-4 w-4 mr-2" /> Rechazar
                    </Button>
                    <Button
                        className="flex-1 rounded-xl text-white"
                        style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}
                        onClick={() => { onApprove(); setIsOpen(false); }}
                    >
                        <CheckCircle2 className="h-4 w-4 mr-2" /> Aprobar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
