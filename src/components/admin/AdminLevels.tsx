import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { getLevels, createLevel, updateLevel, deleteLevel } from '@/lib/db';
import { LevelConfig } from '@/lib/types';
import { Award, PlusCircle, Trash2, Loader2, Edit2, TrendingUp } from 'lucide-react';

export default function AdminLevels() {
    const { toast } = useToast();
    const [levels, setLevels] = useState<LevelConfig[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const [newLevel, setNewLevel] = useState<Partial<LevelConfig>>({
        level: 1,
        name: '',
        minPoints: 0,
        rewardDescription: '',
        rewardImage: '⭐',
        color: '#f59e0b'
    });
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        loadLevels();
    }, []);

    const loadLevels = async () => {
        setIsLoading(true);
        try {
            const data = await getLevels();
            setLevels(data);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "No se pudieron cargar los niveles.", variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateOrUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLevel.name || newLevel.minPoints === undefined) return;

        setIsLoading(true);
        try {
            if (editingId) {
                await updateLevel(editingId, newLevel);
                toast({ title: "Nivel Actualizado", description: "La configuración del nivel ha sido guardada." });
            } else {
                await createLevel(newLevel as Omit<LevelConfig, 'id'>);
                toast({ title: "Nivel Creado", description: "El nuevo nivel ha sido agregado." });
            }

            setIsDialogOpen(false);
            setEditingId(null);
            setNewLevel({ level: levels.length + 1, name: '', minPoints: 0, rewardDescription: '', rewardImage: '⭐', color: '#f59e0b' });
            loadLevels();
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "No se pudo guardar el nivel.", variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar este nivel?")) return;
        try {
            await deleteLevel(id);
            toast({ title: "Nivel Eliminado", description: "El nivel ha sido removido." });
            loadLevels();
        } catch (error) {
            console.error(error);
            toast({ title: "Error", variant: 'destructive' });
        }
    };

    const openEdit = (level: LevelConfig) => {
        setNewLevel(level);
        setEditingId(level.id);
        setIsDialogOpen(true);
    };

    return (
        <Card className="h-full">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Award className="h-5 w-5 text-primary" />
                            Configuración de Niveles
                        </CardTitle>
                        <CardDescription>Define los niveles, puntos requeridos y recompensas por progreso</CardDescription>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={(open) => {
                        setIsDialogOpen(open);
                        if (!open) {
                            setEditingId(null);
                            setNewLevel({ level: levels.length + 1, name: '', minPoints: 0, rewardDescription: '', rewardImage: '⭐', color: '#f59e0b' });
                        }
                    }}>
                        <DialogTrigger asChild>
                            <Button>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Agregar Nivel
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{editingId ? 'Editar Nivel' : 'Nuevo Nivel'}</DialogTitle>
                                <DialogDescription>Configura los requisitos y premios para alcanzar este nivel.</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleCreateOrUpdate} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Número de Nivel</Label>
                                        <Input
                                            type="number"
                                            value={newLevel.level}
                                            onChange={e => setNewLevel({ ...newLevel, level: parseInt(e.target.value) })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Puntos Mínimos</Label>
                                        <Input
                                            type="number"
                                            value={newLevel.minPoints}
                                            onChange={e => setNewLevel({ ...newLevel, minPoints: parseInt(e.target.value) })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Nombre del Nivel</Label>
                                    <Input
                                        value={newLevel.name}
                                        onChange={e => setNewLevel({ ...newLevel, name: e.target.value })}
                                        placeholder="Ej. Bronce, Plata, Oro"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Descripción del Premio / Bono</Label>
                                    <Input
                                        value={newLevel.rewardDescription}
                                        onChange={e => setNewLevel({ ...newLevel, rewardDescription: e.target.value })}
                                        placeholder="Ej. Bono de $500, Kit de Bienvenida"
                                    />
                                </div>

                                <div className="flex gap-4">
                                    <div className="space-y-2 flex-1">
                                        <Label>Emoji / Ícono</Label>
                                        <Input
                                            value={newLevel.rewardImage}
                                            onChange={e => setNewLevel({ ...newLevel, rewardImage: e.target.value })}
                                            placeholder="⭐"
                                        />
                                    </div>
                                    <div className="space-y-2 flex-1">
                                        <Label>Color (Hex)</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                type="color"
                                                className="w-12 h-10 p-1"
                                                value={newLevel.color}
                                                onChange={e => setNewLevel({ ...newLevel, color: e.target.value })}
                                            />
                                            <Input
                                                value={newLevel.color}
                                                onChange={e => setNewLevel({ ...newLevel, color: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <DialogFooter>
                                    <Button type="submit" disabled={isLoading}>
                                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {editingId ? 'Guardar Cambios' : 'Crear Nivel'}
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
                                <TableHead className="w-[50px]">Nvl</TableHead>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Puntos Requeridos</TableHead>
                                <TableHead>Premio</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {levels.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No hay niveles configurados.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                levels.map((level) => (
                                    <TableRow key={level.id}>
                                        <TableCell>
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shadow-sm" style={{ backgroundColor: level.color }}>
                                                {level.level}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium">{level.name}</TableCell>
                                        <TableCell>{level.minPoints.toLocaleString()} pts</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span>{level.rewardImage}</span>
                                                <span className="text-sm text-muted-foreground">{level.rewardDescription}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(level)}>
                                                    <Edit2 className="h-4 w-4 text-blue-500" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(level.id)}>
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="mt-6 bg-blue-50 p-4 rounded-lg flex gap-3">
                    <TrendingUp className="h-5 w-5 text-blue-600 mt-1" />
                    <div>
                        <h4 className="font-bold text-blue-700">¿Cómo funciona?</h4>
                        <p className="text-sm text-blue-600 mt-1">
                            Los dependientes subirán de nivel automáticamente cuando sus <strong>Puntos Acumulados Históricos</strong> alcancen el mínimo requerido. El sistema mostrará su progreso y el próximo premio a desbloquear en su perfil.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
