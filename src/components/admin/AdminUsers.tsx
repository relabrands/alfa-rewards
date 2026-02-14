

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getAllUsers, createUserProfile, updateUserProfile, getPharmacies, getProductLines, deleteUser } from '@/lib/db';
import { User, Pharmacy, ProductLineConfig } from '@/lib/types';
import { User as UserIcon, Users, Shield, Briefcase, Search, PlusCircle, Loader2, Check, ChevronsUpDown, X, Store, Tag, Trash2, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SECTORS } from '@/lib/locations';
import { cn } from "@/lib/utils";

export default function AdminUsers() {
    const { toast } = useToast();
    const [users, setUsers] = useState<User[]>([]);
    const [pharmacies, setPharmacies] = useState<Record<string, Pharmacy>>({});
    const [pharmacyList, setPharmacyList] = useState<Pharmacy[]>([]);
    const [search, setSearch] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Changed zone to string[] for better handling
    const [newRep, setNewRep] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        zone: [] as string[], // Deprecated
        assignedPharmacies: [] as string[],
        productLines: [] as string[]
    });
    const [productLines, setProductLines] = useState<ProductLineConfig[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [usersData, pharmaciesData] = await Promise.all([
            getAllUsers(),
            getPharmacies()
        ]);

        setUsers(usersData);
        setPharmacyList(pharmaciesData);

        const linesData = await getProductLines();
        setProductLines(linesData);

        const phMap: Record<string, Pharmacy> = {};
        pharmaciesData.forEach(p => phMap[p.id] = p);
        setPharmacies(phMap);
    };

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
                status: 'active',
                zone: [],
                assignedPharmacies: newRep.assignedPharmacies,
                productLines: newRep.productLines,
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`
            });

            toast({ title: "Vendedor Creado", description: "El usuario ha sido registrado exitosamente." });
            setIsDialogOpen(false);
            setIsDialogOpen(false);
            setNewRep({ name: '', email: '', password: '', phone: '', zone: [], assignedPharmacies: [], productLines: [] });
            loadUsers(); // Refresh list
        } catch (error: any) {
            console.error(error);
            toast({
                title: "Error",
                description: error.message || "No se pudo crear el vendedor.",
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const filteredUsers = users.filter(u =>
        (u.name && u.name.toLowerCase().includes(search.toLowerCase())) ||
        (u.lastName && u.lastName.toLowerCase().includes(search.toLowerCase())) ||
        u.role.toLowerCase().includes(search.toLowerCase()) ||
        (u.pharmacyId && u.pharmacyId.toLowerCase().includes(search.toLowerCase()))
    );

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'director': return <Badge variant="default" className="bg-purple-600">Director</Badge>;
            case 'manager': return <Badge variant="default" className="bg-blue-600">Manager</Badge>;
            case 'salesRep': return <Badge variant="default" className="bg-green-600">Vendedor</Badge>;
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
                                    Crear Vendedor
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Registrar Nuevo Vendedor</DialogTitle>
                                    <DialogDescription>
                                        Ingresa los datos del nuevo vendedor.
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
                                        <Label>Farmacias Asignadas</Label>
                                        <PharmacyMultiSelect
                                            pharmacies={pharmacyList}
                                            selectedIds={newRep.assignedPharmacies}
                                            onChange={(ids) => setNewRep({ ...newRep, assignedPharmacies: ids })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Líneas de Producto</Label>
                                        <ProductLineMultiSelect
                                            lines={productLines}
                                            selectedLines={newRep.productLines}
                                            onChange={(lines) => setNewRep({ ...newRep, productLines: lines })}
                                        />
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
                                <TableHead>Ubicación / Asignaciones</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredUsers.map((user) => {
                                const pharmacy = user.pharmacyId ? pharmacies[user.pharmacyId] : null;
                                // Handle legacy pharmacyId vs new assignedPharmacies
                                const assignedIds = user.assignedPharmacies || (user.pharmacyId ? [user.pharmacyId] : []);

                                return (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                    {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                                                </div>
                                                <div>
                                                    <p>{user.name} {user.lastName}</p>
                                                    <p className="text-xs text-muted-foreground">{user.cedula}</p>
                                                    <p className="text-[10px] text-muted-foreground">{user.email || user.phone || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {getRoleBadge(user.role)}
                                            {user.status === 'pending' && <Badge variant="outline" className="ml-2 bg-yellow-100 text-yellow-800 border-yellow-200">Pendiente</Badge>}
                                        </TableCell>
                                        <TableCell>
                                            {/* Sales Rep Assignments */}
                                            {user.role === 'salesRep' && (
                                                <div className="flex flex-col gap-2">
                                                    <div>
                                                        <span className="text-xs text-muted-foreground font-semibold">Farmacias:</span>
                                                        <div className="flex flex-wrap gap-1">
                                                            {(user.assignedPharmacies || []).map(phId => {
                                                                const ph = pharmacies[phId];
                                                                return ph ? (
                                                                    <Badge key={phId} variant="outline" className="text-[10px] px-1 py-0">{ph.name}</Badge>
                                                                ) : null;
                                                            })}
                                                            {(!user.assignedPharmacies || user.assignedPharmacies.length === 0) && <span className="text-[10px] text-muted-foreground italic">Ninguna</span>}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <span className="text-xs text-muted-foreground font-semibold">Líneas:</span>
                                                        <div className="flex flex-wrap gap-1">
                                                            {(user.productLines || []).map(line => (
                                                                <Badge key={line} variant="secondary" className="text-[10px] px-1 py-0">{line}</Badge>
                                                            ))}
                                                            {(!user.productLines || user.productLines.length === 0) && <span className="text-[10px] text-muted-foreground italic">Todas/General</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Clerk Pharmacies */}
                                            {user.role === 'clerk' && (
                                                <div className="flex flex-col gap-1">
                                                    <span className="flex items-center gap-1 text-sm font-medium">
                                                        <Briefcase className="h-3 w-3 text-muted-foreground" />
                                                        Farmacias Asignadas ({assignedIds.length})
                                                    </span>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {assignedIds.map(phId => {
                                                            const ph = pharmacies[phId];
                                                            return ph ? (
                                                                <Badge key={phId} variant="outline" className="text-[10px] px-1 py-0 bg-white">
                                                                    {ph.name}
                                                                </Badge>
                                                            ) : null;
                                                        })}
                                                        {assignedIds.length === 0 && <span className="text-xs text-muted-foreground italic">Ninguna asignada</span>}
                                                    </div>
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right flex items-center justify-end gap-2">
                                            <EditUserDialog user={user} pharmacies={pharmacyList} productLines={productLines} onUpdate={loadUsers} />
                                            <DeleteUserDialog user={user} onDelete={loadUsers} />
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

function EditUserDialog({ user, pharmacies, productLines, onUpdate }: { user: User, pharmacies: Pharmacy[], productLines: ProductLineConfig[], onUpdate: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const [data, setData] = useState({
        name: user.name || '',
        phone: user.phone || '',
        role: user.role,
        zone: user.zone || [] as string[],
        assignedPharmacies: user.assignedPharmacies || (user.pharmacyId ? [user.pharmacyId] : []) as string[],
        productLines: user.productLines || [] as string[]
    });

    const handleUpdate = async () => {
        setIsLoading(true);
        try {
            const updates: Partial<User> = {
                name: data.name,
                phone: data.phone,
                role: data.role as any,
            };

            if (data.role === 'salesRep') {
                updates.assignedPharmacies = data.assignedPharmacies;
                updates.productLines = data.productLines;
                // Clear zone if moving away from it
                updates.zone = [];
            }
            if (data.role === 'clerk') {
                updates.assignedPharmacies = data.assignedPharmacies;
                // Keep pharmacyId in sync with the first assigned pharmacy for strict backwards compatibility
                if (data.assignedPharmacies.length > 0) {
                    updates.pharmacyId = data.assignedPharmacies[0];
                }
            }

            await updateUserProfile(user.id, updates);
            toast({ title: 'Usuario Actualizado', description: 'Los cambios han sido guardados.' });
            setIsOpen(false);
            onUpdate();
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'No se pudo actualizar', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                    <Users className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Editar Usuario</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Nombre</Label>
                        <Input value={data.name} onChange={e => setData({ ...data, name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label>Teléfono</Label>
                        <Input value={data.phone} onChange={e => setData({ ...data, phone: e.target.value })} />
                    </div>

                    {data.role === 'salesRep' && (
                        <>
                            <div className="space-y-2">
                                <Label>Farmacias Asignadas</Label>
                                <PharmacyMultiSelect
                                    pharmacies={pharmacies}
                                    selectedIds={data.assignedPharmacies}
                                    onChange={(ids) => setData({ ...data, assignedPharmacies: ids })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Líneas de Producto</Label>
                                <ProductLineMultiSelect
                                    lines={productLines}
                                    selectedLines={data.productLines}
                                    onChange={(lines) => setData({ ...data, productLines: lines })}
                                />
                            </div>
                        </>
                    )}

                    {data.role === 'clerk' && (
                        <div className="space-y-2">
                            <Label>Farmacias Asignadas (Multi-selección)</Label>
                            <PharmacyMultiSelect
                                pharmacies={pharmacies}
                                selectedIds={data.assignedPharmacies}
                                onChange={(ids) => setData({ ...data, assignedPharmacies: ids })}
                            />
                            <p className="text-xs text-muted-foreground mt-1">El admin puede asignar múltiples farmacias.</p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Rol</Label>
                        <select
                            className="w-full p-2 border rounded-md"
                            value={data.role}
                            onChange={e => setData({ ...data, role: e.target.value as any })}
                        >
                            <option value="clerk">Dependiente</option>
                            <option value="salesRep">Vendedor</option>
                            <option value="manager">Manager</option>
                            <option value="director">Director</option>
                        </select>
                    </div>
                    <Button onClick={handleUpdate} disabled={isLoading} className="w-full">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Guardar Cambios'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function ZoneMultiSelect({ selectedZones, onChange }: { selectedZones: string[], onChange: (zones: string[]) => void }) {
    const [open, setOpen] = useState(false);

    const handleSelect = (currentValue: string) => {
        if (selectedZones.includes(currentValue)) {
            onChange(selectedZones.filter(z => z !== currentValue));
        } else {
            onChange([...selectedZones, currentValue]);
        }
        setOpen(false);
    };

    const removeZone = (zoneToRemove: string) => {
        onChange(selectedZones.filter(z => z !== zoneToRemove));
    };

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-2 mb-2">
                {selectedZones.map(zone => (
                    <Badge key={zone} variant="secondary" className="flex items-center gap-1 pl-2 pr-1 py-1">
                        {zone}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 rounded-full ml-1 hover:bg-destructive/10 hover:text-destructive p-0"
                            onClick={() => removeZone(zone)}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </Badge>
                ))}
            </div>

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between"
                    >
                        <span className="text-muted-foreground font-normal">
                            {selectedZones.length > 0 ? "Agregar otra zona..." : "Seleccionar zonas..."}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                    <Command>
                        <CommandInput placeholder="Buscar sector..." />
                        <CommandList>
                            <CommandEmpty>No encontrado.</CommandEmpty>
                            <CommandGroup className="max-h-64 overflow-auto">
                                {SECTORS.map((sector) => (
                                    <CommandItem
                                        key={sector}
                                        value={sector}
                                        onSelect={() => handleSelect(sector)}
                                    >
                                        <div className={cn(
                                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                            selectedZones.includes(sector)
                                                ? "bg-primary text-primary-foreground"
                                                : "opacity-50 [&_svg]:invisible"
                                        )}>
                                            <Check className={cn("h-4 w-4", selectedZones.includes(sector) ? "opacity-100" : "opacity-0")} />
                                        </div>
                                        {sector}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}

function PharmacyMultiSelect({ pharmacies, selectedIds, onChange }: { pharmacies: Pharmacy[], selectedIds: string[], onChange: (ids: string[]) => void }) {
    const [open, setOpen] = useState(false);

    const handleSelect = (currentValue: string) => {
        // Value corresponds to Pharmacy ID
        if (selectedIds.includes(currentValue)) {
            onChange(selectedIds.filter(id => id !== currentValue));
        } else {
            onChange([...selectedIds, currentValue]);
        }
        setOpen(false);
    };

    const removeId = (idToRemove: string) => {
        onChange(selectedIds.filter(id => id !== idToRemove));
    };

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-2 mb-2">
                {selectedIds.map(id => {
                    const ph = pharmacies.find(p => p.id === id);
                    return ph ? (
                        <Badge key={id} variant="secondary" className="flex items-center gap-1 pl-2 pr-1 py-1 bg-blue-50 text-blue-700 border-blue-200">
                            <Store className="w-3 h-3 mr-1" />
                            {ph.name}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 rounded-full ml-1 hover:bg-destructive/10 hover:text-destructive p-0"
                                onClick={() => removeId(id)}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </Badge>
                    ) : null;
                })}
            </div>

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between"
                    >
                        <span className="text-muted-foreground font-normal">
                            {selectedIds.length > 0 ? "Asignar otra farmacia..." : "Asignar farmacias..."}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                    <Command>
                        <CommandInput placeholder="Buscar farmacia..." />
                        <CommandList>
                            <CommandEmpty>No encontrada.</CommandEmpty>
                            <CommandGroup className="max-h-64 overflow-auto">
                                {pharmacies.map((ph) => (
                                    <CommandItem
                                        key={ph.id}
                                        value={ph.name} // Search by name
                                        onSelect={() => handleSelect(ph.id)}
                                    >
                                        <div className={cn(
                                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                            selectedIds.includes(ph.id)
                                                ? "bg-primary text-primary-foreground"
                                                : "opacity-50 [&_svg]:invisible"
                                        )}>
                                            <Check className={cn("h-4 w-4", selectedIds.includes(ph.id) ? "opacity-100" : "opacity-0")} />
                                        </div>
                                        {ph.name}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}

function ProductLineMultiSelect({ lines, selectedLines, onChange }: { lines: ProductLineConfig[], selectedLines: string[], onChange: (lines: string[]) => void }) {
    const [open, setOpen] = useState(false);

    const handleSelect = (currentValue: string) => {
        // Value corresponds to Line Name
        if (selectedLines.includes(currentValue)) {
            onChange(selectedLines.filter(l => l !== currentValue));
        } else {
            onChange([...selectedLines, currentValue]);
        }
        setOpen(false);
    };

    const removeLine = (lineToRemove: string) => {
        onChange(selectedLines.filter(l => l !== lineToRemove));
    };

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-2 mb-2">
                {selectedLines.map(line => (
                    <Badge key={line} variant="secondary" className="flex items-center gap-1 pl-2 pr-1 py-1 bg-purple-50 text-purple-700 border-purple-200">
                        <Tag className="w-3 h-3 mr-1" />
                        {line}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 rounded-full ml-1 hover:bg-destructive/10 hover:text-destructive p-0"
                            onClick={() => removeLine(line)}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </Badge>
                ))}
            </div>

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between"
                    >
                        <span className="text-muted-foreground font-normal">
                            {selectedLines.length > 0 ? "Agregar otra línea..." : "Seleccionar líneas..."}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                    <Command>
                        <CommandInput placeholder="Buscar línea..." />
                        <CommandList>
                            <CommandEmpty>No encontrada.</CommandEmpty>
                            <CommandGroup className="max-h-64 overflow-auto">
                                {lines.map((line) => (
                                    <CommandItem
                                        key={line.id}
                                        value={line.name}
                                        onSelect={() => handleSelect(line.name)}
                                    >
                                        <div className={cn(
                                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                            selectedLines.includes(line.name)
                                                ? "bg-primary text-primary-foreground"
                                                : "opacity-50 [&_svg]:invisible"
                                        )}>
                                            <Check className={cn("h-4 w-4", selectedLines.includes(line.name) ? "opacity-100" : "opacity-0")} />
                                        </div>
                                        {line.name}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}

function DeleteUserDialog({ user, onDelete }: { user: User, onDelete: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleDelete = async () => {
        setIsLoading(true);
        try {
            await deleteUser(user.id);
            toast({ title: 'Usuario Eliminado', description: 'El usuario ha sido eliminado correctamente.' });
            setIsOpen(false);
            onDelete();
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'No se pudo eliminar el usuario', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        Eliminar Usuario
                    </DialogTitle>
                    <DialogDescription>
                        ¿Estás seguro de que deseas eliminar al usuario <strong>{user.name} {user.lastName}</strong>?
                        Esta acción no se puede deshacer y perderá el acceso al sistema.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>Cancelar</Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Eliminar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
