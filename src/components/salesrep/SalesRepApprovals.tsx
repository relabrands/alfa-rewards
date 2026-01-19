import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getPendingUsers, updateUserStatus, getPharmacies } from "@/lib/db";
import { User, Pharmacy } from "@/lib/types";
import { CheckCircle2, XCircle, Clock, UserCheck, Search, Eye } from "lucide-react";
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
            // Load pharmacies for lookup
            const phList = await getPharmacies();
            const phMap: Record<string, Pharmacy> = {};
            phList.forEach(p => phMap[p.id] = p);
            setPharmacies(phMap);

            const allPending = await getPendingUsers();

            // Strict Zone Filtering
            let filteredByZone: User[] = [];

            if (currentUser?.zone && currentUser.zone.length > 0) {
                filteredByZone = allPending.filter(user => {
                    const userSector = user.zone?.[0]; // Sector from user profile
                    if (!userSector) return false;
                    return currentUser.zone?.some(z => z.toLowerCase() === userSector.toLowerCase()); // Case insensitive check
                });
            } else {
                // If Sales Rep has NO zones, they see NOTHING (safety)
                filteredByZone = [];
            }

            setPendingUsers(filteredByZone);
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "No se pudieron cargar los datos",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async (userId: string) => {
        try {
            await updateUserStatus(userId, 'active');
            setPendingUsers(prev => prev.filter(u => u.id !== userId));
            toast({
                title: "Usuario Aprobado",
                description: "El dependiente ya puede acceder al sistema.",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "No se pudo aprobar el usuario.",
                variant: "destructive"
            });
        }
    };

    const handleReject = async (userId: string) => {
        try {
            await updateUserStatus(userId, 'disabled');
            setPendingUsers(prev => prev.filter(u => u.id !== userId));
            toast({
                title: "Usuario Rechazado",
                description: "Se ha denegado el acceso.",
                variant: "destructive"
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "No se pudo rechazar el usuario.",
                variant: "destructive"
            });
        }
    };

    const filteredUsers = pendingUsers.filter(u =>
        u.name.toLowerCase().includes(filter.toLowerCase()) ||
        u.cedula?.includes(filter) ||
        u.email?.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Aprobaciones</h2>
                    <p className="text-muted-foreground">Gestiona las solicitudes de registro de nuevos dependientes.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="flex items-center gap-2">
                                <UserCheck className="h-5 w-5 text-primary" />
                                Solicitudes Pendientes
                            </CardTitle>
                            <CardDescription>
                                {pendingUsers.length} usuarios esperando aprobación
                            </CardDescription>
                        </div>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nombre o cédula..."
                                className="pl-8"
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8">Cargando...</div>
                    ) : (!currentUser?.zone || currentUser.zone.length === 0) ? (
                        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg bg-yellow-50/50">
                            <Clock className="mx-auto h-12 w-12 opacity-50 mb-4 text-yellow-500" />
                            <h3 className="text-lg font-semibold text-foreground">Sin Zonas Asignadas</h3>
                            <p>No tienes zonas asignadas en tu perfil.</p>
                            <p className="text-sm">Contacta a tu gerente para que te asigne tus zonas de cobertura.</p>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                            <Clock className="mx-auto h-12 w-12 opacity-50 mb-4" />
                            <p>No hay solicitudes pendientes en tus zonas ({currentUser.zone.join(', ')}).</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredUsers.map((user) => {
                                const pharmacy = user.pharmacyId ? pharmacies[user.pharmacyId] : null;
                                return (
                                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 font-bold">
                                                {user.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold">{user.name} {user.lastName}</h4>
                                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                                    <Badge variant="outline">{user.cedula || 'Sin cédula'}</Badge>
                                                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50">
                                                        {user.zone?.[0] || 'Sin Zona'}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                                    <span className="font-medium">Farmacia:</span>
                                                    {pharmacy ? pharmacy.name : (user.pharmacyId || 'N/A')}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <UserDetailsDialog
                                                user={user}
                                                pharmacy={user.pharmacyId ? pharmacies[user.pharmacyId] : undefined}
                                                onApprove={() => handleApprove(user.id)}
                                                onReject={() => handleReject(user.id)}
                                            />
                                        </div>
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

function UserDetailsDialog({ user, pharmacy, onApprove, onReject }: { user: User, pharmacy?: Pharmacy, onApprove: () => void, onReject: () => void }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Detalles
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Detalles del Solicitante</DialogTitle>
                    <DialogDescription>Revisa la información antes de aprobar</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label className="text-muted-foreground text-xs">Nombre</Label>
                            <p className="font-medium">{user.name}</p>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-muted-foreground text-xs">Apellido</Label>
                            <p className="font-medium">{user.lastName}</p>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label className="text-muted-foreground text-xs">Cédula</Label>
                        <p className="font-medium font-mono">{user.cedula}</p>
                    </div>

                    <div className="space-y-1">
                        <Label className="text-muted-foreground text-xs">Farmacia</Label>
                        <p className="font-medium">{pharmacy?.name || user.pharmacyId || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">{pharmacy?.address}</p>
                    </div>

                    <div className="space-y-1">
                        <Label className="text-muted-foreground text-xs">Sector / Zona</Label>
                        <p className="font-medium">{user.zone?.[0] || pharmacy?.sector || 'N/A'}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label className="text-muted-foreground text-xs">Teléfono</Label>
                            <p className="font-medium">{user.phone}</p>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-muted-foreground text-xs">Email</Label>
                            <p className="font-medium truncate" title={user.email}>{user.email}</p>
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex gap-2 sm:justify-between">
                    <Button variant="outline" className="text-destructive w-full" onClick={() => { onReject(); setIsOpen(false); }}>
                        <XCircle className="h-4 w-4 mr-2" />
                        Rechazar
                    </Button>
                    <Button className="bg-success text-white w-full hover:bg-success/90" onClick={() => { onApprove(); setIsOpen(false); }}>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Aprobar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
