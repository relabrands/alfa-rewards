import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getAllUsers } from '@/lib/db';
import { User } from '@/lib/types';
import { User as UserIcon, Users, Shield, Briefcase, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function AdminUsers() {
    const [users, setUsers] = useState<User[]>([]);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const loadUsers = async () => {
            const data = await getAllUsers();
            setUsers(data);
        };
        loadUsers();
    }, []);

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
                    <div className="relative w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar usuario..."
                            className="pl-8"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
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
                                                <p className="text-xs text-muted-foreground">{user.phone || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{getRoleBadge(user.role)}</TableCell>
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
