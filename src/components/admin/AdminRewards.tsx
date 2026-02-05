import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; // Added Tabs
import { Checkbox } from "@/components/ui/checkbox"; // Added Checkbox
import { useToast } from "@/hooks/use-toast";
import { getRewards, createReward, deleteReward, getRedemptionRequests, updateRedemptionStatus, getUserProfile } from '@/lib/db';
import { Reward, RedemptionRequest, User } from '@/lib/types';
import { Gift, PlusCircle, Trash2, Loader2, CheckCircle, XCircle, Eye, Phone } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function AdminRewards() {
    const { toast } = useToast();
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [requests, setRequests] = useState<RedemptionRequest[]>([]); // New State
    const [isLoading, setIsLoading] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // User Profile View State
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isUserDetailOpen, setIsUserDetailOpen] = useState(false);

    // New Reward State
    const [newReward, setNewReward] = useState<Partial<Reward>>({
        name: '',
        description: '',
        pointsCost: 0,
        category: 'prize',
        image: '🎁',
        requiresBankDetails: false // Default false
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [rewardsData, requestsData] = await Promise.all([
                getRewards(),
                getRedemptionRequests()
            ]);
            setRewards(rewardsData);
            setRequests(requestsData);
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "No se pudieron cargar los datos.",
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newReward.name || !newReward.pointsCost) return;

        setIsLoading(true);
        try {
            await createReward(newReward as Omit<Reward, 'id'>);
            toast({ title: "Premio Creado", description: "El premio ha sido agregado al catálogo." });
            setIsDialogOpen(false);
            setNewReward({ name: '', description: '', pointsCost: 0, category: 'prize', image: '🎁', requiresBankDetails: false });
            loadData();
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "No se pudo crear el premio.", variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de que deseas eliminar este premio?")) return;

        try {
            await deleteReward(id);
            toast({ title: "Premio Eliminado", description: "El premio ha sido removido." });
            loadData();
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "No se pudo eliminar el premio.", variant: 'destructive' });
        }
    };

    const handleApproveRequest = async (request: RedemptionRequest) => {
        if (!confirm(`¿Confirmas que has entregado/pagado el premio a ${request.clerkName}?`)) return;
        try {
            await updateRedemptionStatus(request.id, 'approved');
            toast({ title: "Canje Aplicado", description: "La solicitud ha sido marcada como aprobada." });
            loadData();
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "No se pudo actualizar la solicitud.", variant: 'destructive' });
        }
    };

    const handleViewProfile = async (clerkId: string) => {
        setIsLoading(true);
        try {
            const user = await getUserProfile(clerkId);
            if (user) {
                setSelectedUser(user);
                setIsUserDetailOpen(true);
            } else {
                toast({ title: "Error", description: "Usuario no encontrado", variant: 'destructive' });
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Error al cargar perfil", variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    // Optional: Reject logic could also be added here (refunding points if implementing robust transaction)

    return (
        <Card className="h-full">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Gift className="h-5 w-5 text-primary" />
                            Gestión de Premios
                        </CardTitle>
                        <CardDescription>Administra los premios y solicitudes de canje.</CardDescription>
                    </div>
                    {/* Add Button logic moved inside TabsContent for Catalog, or keep global if it only applies to catalog */}
                </div>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="catalog">
                    <TabsList className="mb-4">
                        <TabsTrigger value="catalog">Catálogo</TabsTrigger>
                        <TabsTrigger value="requests">Solicitudes de Canje</TabsTrigger>
                    </TabsList>

                    <TabsContent value="catalog">
                        <div className="flex justify-end mb-4">
                            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button>
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Agregar Premio
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Nuevo Premio</DialogTitle>
                                        <DialogDescription>Agrega un nuevo artículo al catálogo.</DialogDescription>
                                    </DialogHeader>
                                    <form onSubmit={handleCreate} className="space-y-4">
                                        {/* Inputs... */}
                                        <div className="space-y-2">
                                            <Label>Nombre</Label>
                                            <Input value={newReward.name} onChange={e => setNewReward({ ...newReward, name: e.target.value })} required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Descripción</Label>
                                            <Input value={newReward.description} onChange={e => setNewReward({ ...newReward, description: e.target.value })} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Costo (Pts)</Label>
                                                <Input type="number" value={newReward.pointsCost} onChange={e => setNewReward({ ...newReward, pointsCost: parseInt(e.target.value) || 0 })} required />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Categoría</Label>
                                                <select className="w-full p-2 border rounded-md" value={newReward.category} onChange={e => setNewReward({ ...newReward, category: e.target.value as any })}>
                                                    <option value="prize">Premio Físico</option>
                                                    <option value="voucher">Vale / Bono</option>
                                                    <option value="topup">Recarga</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Emoji</Label>
                                            <Input value={newReward.image} onChange={e => setNewReward({ ...newReward, image: e.target.value })} />
                                        </div>
                                        {/* Checkbox for Bank Details */}
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="bankDetails"
                                                checked={newReward.requiresBankDetails}
                                                onCheckedChange={(checked) => setNewReward({ ...newReward, requiresBankDetails: checked as boolean })}
                                            />
                                            <Label htmlFor="bankDetails">Requiere Datos Bancarios (Efectivo)</Label>
                                        </div>

                                        <DialogFooter>
                                            <Button type="submit" disabled={isLoading}>Crear</Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </div>

                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Img</TableHead>
                                        <TableHead>Nombre</TableHead>
                                        <TableHead>Costo</TableHead>
                                        <TableHead>Efectivo?</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rewards.map((reward) => (
                                        <TableRow key={reward.id}>
                                            <TableCell className="text-2xl">{reward.image}</TableCell>
                                            <TableCell>{reward.name} <p className="text-xs text-muted-foreground">{reward.description}</p></TableCell>
                                            <TableCell className="font-bold">{reward.pointsCost.toLocaleString()}</TableCell>
                                            <TableCell>{reward.requiresBankDetails ? <CheckCircle className="w-4 h-4 text-green-500" /> : '-'}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(reward.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    <TabsContent value="requests">
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Dependiente</TableHead>
                                        <TableHead>Premio</TableHead>
                                        <TableHead>Datos Bancarios</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {requests.length === 0 ? (
                                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No hay solicitudes pendientes.</TableCell></TableRow>
                                    ) : (
                                        requests.map(req => (
                                            <TableRow key={req.id}>
                                                <TableCell>{format(req.timestamp, "dd MMM HH:mm", { locale: es })}</TableCell>
                                                <TableCell>{req.clerkName}</TableCell>
                                                <TableCell>{req.rewardName} ({req.pointsCost} pts)</TableCell>
                                                <TableCell>
                                                    {req.bankDetails ? (
                                                        <div className="text-xs">
                                                            <p className="font-bold">{req.bankDetails.bankName}</p>
                                                            <p>{req.bankDetails.accountNumber}</p>
                                                            <p className="text-muted-foreground capitalize">{req.bankDetails.accountType}</p>
                                                        </div>
                                                    ) : <span className="text-muted-foreground text-xs">N/A</span>}
                                                    {req.targetPhoneNumber && (
                                                        <div className="mt-1 text-xs bg-primary/10 p-1 rounded text-primary font-medium flex items-center gap-1">
                                                            <Phone className="w-3 h-3" />
                                                            {req.targetPhoneNumber}
                                                            {req.isOwnPhone && <span className="text-[10px] text-muted-foreground">(Propio)</span>}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${req.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                        req.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                            'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                        {req.status === 'approved' ? 'Aplicado' : req.status === 'pending' ? 'Pendiente' : 'Rechazado'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button variant="outline" size="icon" onClick={() => handleViewProfile(req.clerkId)} title="Ver Perfil">
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        {req.status === 'pending' && (
                                                            <Button size="sm" onClick={() => handleApproveRequest(req)} className="bg-green-600 hover:bg-green-700 text-white">
                                                                Aplicar
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                </Tabs>

                {/* User Details Dialog */}
                <Dialog open={isUserDetailOpen} onOpenChange={setIsUserDetailOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Perfil del Dependiente</DialogTitle>
                            <DialogDescription>Información detallada del usuario.</DialogDescription>
                        </DialogHeader>
                        {selectedUser && (
                            <div className="space-y-4 py-2">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-2xl overflow-hidden">
                                        {selectedUser.avatar?.startsWith('http') ? (
                                            <img src={selectedUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            selectedUser.avatar || '👤'
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">{selectedUser.name} {selectedUser.lastName}</h3>
                                        <p className="text-sm text-muted-foreground capitalize">{selectedUser.role}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="space-y-1">
                                        <Label>Email</Label>
                                        <div className="text-muted-foreground">{selectedUser.email || 'N/A'}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Teléfono</Label>
                                        <div className="text-muted-foreground">{selectedUser.phone || 'N/A'}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Cédula</Label>
                                        <div className="text-muted-foreground">{selectedUser.cedula || 'N/A'}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Estado</Label>
                                        <div className="capitalize">{selectedUser.status || 'Active'}</div>
                                    </div>
                                </div>
                                {/* Can add more details if needed, e.g. Pharmacy */}
                            </div>
                        )}
                        <DialogFooter>
                            <Button onClick={() => setIsUserDetailOpen(false)}>Cerrar</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardContent >
        </Card >
    );
}
