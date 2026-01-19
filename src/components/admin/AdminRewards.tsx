import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from "@/hooks/use-toast";
import { getRewards, createReward, deleteReward } from '@/lib/db';
import { Reward } from '@/lib/types';
import { Gift, PlusCircle, Trash2, Loader2, Image as ImageIcon } from 'lucide-react';

export default function AdminRewards() {
    const { toast } = useToast();
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // New Reward State
    const [newReward, setNewReward] = useState<Partial<Reward>>({
        name: '',
        description: '',
        pointsCost: 0,
        category: 'prize',
        image: '🎁'
    });

    useEffect(() => {
        loadRewards();
    }, []);

    const loadRewards = async () => {
        setIsLoading(true);
        try {
            const data = await getRewards();
            setRewards(data);
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "No se pudieron cargar los premios.",
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
            setNewReward({ name: '', description: '', pointsCost: 0, category: 'prize', image: '🎁' });
            loadRewards();
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
            loadRewards();
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "No se pudo eliminar el premio.", variant: 'destructive' });
        }
    };

    return (
        <Card className="h-full">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Gift className="h-5 w-5 text-primary" />
                            Gestión de Premios
                        </CardTitle>
                        <CardDescription>Administra los premios disponibles para canje</CardDescription>
                    </div>
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
                                <DialogDescription>Agrega un nuevo artículo al catálogo de premios.</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Nombre del Premio</Label>
                                    <Input
                                        value={newReward.name}
                                        onChange={e => setNewReward({ ...newReward, name: e.target.value })}
                                        placeholder="Ej. Tarjeta de Regalo"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Descripción</Label>
                                    <Input
                                        value={newReward.description}
                                        onChange={e => setNewReward({ ...newReward, description: e.target.value })}
                                        placeholder="Breve descripción..."
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Costo en Puntos</Label>
                                        <Input
                                            type="number"
                                            value={newReward.pointsCost}
                                            onChange={e => setNewReward({ ...newReward, pointsCost: parseInt(e.target.value) || 0 })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Categoría</Label>
                                        <select
                                            className="w-full p-2 border rounded-md"
                                            value={newReward.category}
                                            onChange={e => setNewReward({ ...newReward, category: e.target.value as any })}
                                        >
                                            <option value="prize">Premio Físico</option>
                                            <option value="voucher">Vale / Bono</option>
                                            <option value="topup">Recarga</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Emoji / Ícono</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={newReward.image}
                                            onChange={e => setNewReward({ ...newReward, image: e.target.value })}
                                            placeholder="Emoji (🎁)"
                                        />
                                        <div className="w-10 h-10 flex items-center justify-center bg-muted rounded text-xl">
                                            {newReward.image}
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={isLoading}>
                                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Crear Premio
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">Img</TableHead>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Categoría</TableHead>
                                <TableHead>Costo (Pts)</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rewards.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No hay premios registrados.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rewards.map((reward) => (
                                    <TableRow key={reward.id}>
                                        <TableCell className="text-2xl">{reward.image}</TableCell>
                                        <TableCell>
                                            <p className="font-medium">{reward.name}</p>
                                            <p className="text-xs text-muted-foreground">{reward.description}</p>
                                        </TableCell>
                                        <TableCell>
                                            <span className="capitalize">{reward.category === 'topup' ? 'Recarga' : reward.category === 'voucher' ? 'Vale' : 'Físico'}</span>
                                        </TableCell>
                                        <TableCell className="font-bold text-gold-dark">
                                            {reward.pointsCost.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:bg-destructive/10"
                                                onClick={() => handleDelete(reward.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
