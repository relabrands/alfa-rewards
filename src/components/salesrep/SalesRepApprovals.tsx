import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getPendingUsers, updateUserStatus } from "@/lib/db";
import { User } from "@/lib/types";
import { CheckCircle2, XCircle, Clock, UserCheck, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useApp } from "@/context/AppContext";

export function SalesRepApprovals() {
    const { toast } = useToast();
    const { currentUser } = useApp();
    const [pendingUsers, setPendingUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState("");

    useEffect(() => {
        if (currentUser) {
            loadPendingUsers();
        }
    }, [currentUser]);

    const loadPendingUsers = async () => {
        try {
            const allPending = await getPendingUsers();

            // Zone Filtering Logic
            let filteredByZone = allPending;

            // If the Sales Rep has specific zones assigned, filter users
            if (currentUser?.zone && currentUser.zone.length > 0) {
                filteredByZone = allPending.filter(user => {
                    // Check if user has a sector (stored in user.zone logic we added)
                    // And if that sector matches any of the sales rep's zones
                    const userSector = user.zone?.[0]; // We stored sector in zone[0]
                    if (!userSector) return false; // Or true if we want to show unzoned? Better false for security
                    return currentUser.zone?.includes(userSector);
                });
            }

            setPendingUsers(filteredByZone);
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "No se pudieron cargar los usuarios pendientes",
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
                    ) : filteredUsers.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                            <Clock className="mx-auto h-12 w-12 opacity-50 mb-4" />
                            <p>No hay solicitudes pendientes en este momento.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredUsers.map((user) => (
                                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 font-bold">
                                            {user.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold">{user.name} {user.lastName}</h4>
                                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                                <Badge variant="outline">{user.cedula || 'Sin cédula'}</Badge>
                                                <span>{user.phone || 'Sin teléfono'}</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">Farmacia: {user.pharmacyId}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => handleReject(user.id)}>
                                            <XCircle className="h-4 w-4 mr-2" />
                                            Rechazar
                                        </Button>
                                        <Button size="sm" className="bg-success hover:bg-success/90 text-white" onClick={() => handleApprove(user.id)}>
                                            <CheckCircle2 className="h-4 w-4 mr-2" />
                                            Aprobar
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
