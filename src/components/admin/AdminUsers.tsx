import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getAllUsers, createUserProfile } from '@/lib/db';
import { User } from '@/lib/types';
import { User as UserIcon, Users, Shield, Briefcase, Search, PlusCircle, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function AdminUsers() {
    const { toast } = useToast();
    const [users, setUsers] = useState<User[]>([]);
    const [search, setSearch] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [newRep, setNewRep] = useState({ name: '', email: '', password: '', phone: '' });

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        const data = await getAllUsers();
        setUsers(data);
    };

    const handleCreateRep = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, newRep.email, newRep.password);
            const user = userCredential.user;

            await createUserProfile(user.uid, {
                id: user.uid,
                name: newRep.name,
                email: newRep.email,
                phone: newRep.phone,
                role: 'salesRep',
                status: 'active', // Admin created reps are active by default
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`
            });

            toast({ title: "Visitador Creado", description: "El usuario ha sido registrado exitosamente." });
            setIsDialogOpen(false);
            setNewRep({ name: '', email: '', password: '', phone: '' });
            loadUsers(); // Refresh list
        } catch (error: any) {
            console.error(error);
            toast({
                title: "Error",
                description: error.message || "No se pudo crear el visitador.",
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.role.toLowerCase().includes(search.toLowerCase()) ||
        (u.pharmacyId && u.pharmacyId.toLowerCase().includes(search.toLowerCase()))
    );

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'director': return <Badge variant="default" className="bg-purple-600">Director</Badge>;
            case 'manager': return <Badge variant="default" className="bg-blue-600">Manager</Badge>;
            case 'salesRep': return <Badge variant="default" className="bg-green-600">Visitador</Badge>;
            case 'clerk': return <Badge variant="secondary">Dependiente</Badge>;
            default: return <Badge variant="outline">{role}</Badge>;
        }
    };

    return (
        <Card className="h-full">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-primary" />
                            Usuarios del Sistema
                        </CardTitle>
                        <CardDescription>Gestiona los usuarios registrados ({users.length})</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar usuario..."
                                className="pl-8"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Crear Visitador
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Registrar Nuevo Visitador</DialogTitle>
                                    <DialogDescription>
                                        Ingresa los datos del nuevo visitador médico.
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleCreateRep} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Nombre Completo</Label>
                                        <Input id="name" value={newRep.name} onChange={(e) => setNewRep({ ...newRep, name: e.target.value })} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Correo Electrónico</Label>
                                        <Input id="email" type="email" value={newRep.email} onChange={(e) => setNewRep({ ...newRep, email: e.target.value })} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Teléfono</Label>
                                        <Input id="phone" value={newRep.phone} onChange={(e) => setNewRep({ ...newRep, phone: e.target.value })} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="password">Contraseña Temporal</Label>
                                        <Input id="password" type="password" value={newRep.password} onChange={(e) => setNewRep({ ...newRep, password: e.target.value })} required minLength={6} />
                                    </div>
                                    <DialogFooter>
                                        <Button type="submit" disabled={isLoading}>
                                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Registrar
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Usuario</TableHead>
                                <TableHead>Rol</TableHead>
                                <TableHead>Ubicación / Detalles</TableHead>
                                <TableHead className="text-right">Puntos</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredUsers.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                                            </div>
                                            <div>
                                                <p>{user.name || 'Sin Nombre'}</p>
                                                <p className="text-xs text-muted-foreground">{user.email || user.phone || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {getRoleBadge(user.role)}
                                        {user.status === 'pending' && <Badge variant="outline" className="ml-2 bg-yellow-100 text-yellow-800 border-yellow-200">Pendiente</Badge>}
                                    </TableCell>
                                    <TableCell>
                                        {user.pharmacyId ? (
                                            <span className="flex items-center gap-1 text-xs">
                                                <Briefcase className="h-3 w-3" /> {user.pharmacyId}
                                            </span>
                                        ) : '-'}
                                    </TableCell>
                                    <TableCell className="text-right font-mono">
                                        {user.points ? user.points.toLocaleString() : 0}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
