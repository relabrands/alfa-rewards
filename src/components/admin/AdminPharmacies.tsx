import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/hooks/use-toast";
import { getPharmacies, createPharmacy, updatePharmacy, deletePharmacy } from '@/lib/db';
import { Pharmacy, User, ProductLine } from '@/lib/types';
import { Building2, Plus, Upload, Loader2, Search, FileSpreadsheet, Pencil, X, Check, Trash2, AlertTriangle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SECTORS, DR_LOCATIONS } from '@/lib/locations';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Checkbox } from "@/components/ui/checkbox";

export default function AdminPharmacies() {
    const { toast } = useToast();
    const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
    const [reps, setReps] = useState<User[]>([]);
    const [search, setSearch] = useState('');
    const [isSingleDialogOpen, setIsSingleDialogOpen] = useState(false);
    const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Single Add Form
    // assignments is a map of repId -> lines[]
    const [newPharmacy, setNewPharmacy] = useState<{
        name: string;
        address: string;
        city: string;
        sector: string;
        clientCode: string;
        repAssignments: { [repId: string]: ProductLine[] };
    }>({
        name: '',
        address: '',
        city: '',
        sector: '',
        clientCode: '',
        repAssignments: {}
    });

    // Bulk Upload
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [bulkFile, setBulkFile] = useState<File | null>(null);

    useEffect(() => {
        loadPharmacies();
        loadReps();
    }, []);

    const loadPharmacies = async () => {
        try {
            const data = await getPharmacies();
            setPharmacies(data);
        } catch (error) {
            console.error("Error loading pharmacies", error);
            toast({ title: "Error", description: "No se pudieron cargar las farmacias.", variant: "destructive" });
        }
    };

    const loadReps = async () => {
        try {
            const q = query(collection(db, "users"), where("role", "==", "salesRep"));
            const snapshot = await getDocs(q);
            const fetchedReps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            setReps(fetchedReps);
        } catch (error) {
            console.error("Error loading reps", error);
        }
    };

    const handleSingleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            // Calculate assignedRepIds for query efficiency
            const assignedRepIds = Object.keys(newPharmacy.repAssignments);

            await createPharmacy({
                name: newPharmacy.name,
                address: newPharmacy.address,
                city: newPharmacy.city,
                sector: newPharmacy.sector,
                clientCode: newPharmacy.clientCode,
                repAssignments: newPharmacy.repAssignments,
                assignedRepIds: assignedRepIds,
                // Deprecated but kept for compatibility logic loops
                assigned_rep_id: assignedRepIds.length > 0 ? assignedRepIds[0] : '',
                lat: 18.4861,
                lng: -69.9312,
                status: 'active',
                isActive: true
            } as any);

            toast({ title: "Farmacia Creada", description: "Se ha agregado la farmacia exitosamente." });
            setIsSingleDialogOpen(false);
            setNewPharmacy({ name: '', address: '', city: '', sector: '', clientCode: '', repAssignments: {} });
            loadPharmacies();
        } catch (error) {
            toast({ title: "Error", description: "No se pudo crear la farmacia.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleBulkUpload = async () => {
        if (!bulkFile) return;
        setIsLoading(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            // Simplified bulk upload logic
            toast({ title: "Simulación", description: "Carga masiva pendiente de actualización de formato." });
            setIsLoading(false);
            setIsBulkDialogOpen(false);
        };
        reader.readAsText(bulkFile);
    };

    const filteredPharmacies = pharmacies.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sector?.toLowerCase().includes(search.toLowerCase()) ||
        p.clientCode?.includes(search)
    );

    // Derived Sectors based on selected City
    const availableSectors = newPharmacy.city ? DR_LOCATIONS[newPharmacy.city] || [] : [];

    return (
        <Card className="h-full">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-primary" />
                            Gestión de Farmacias
                        </CardTitle>
                        <CardDescription>
                            Administra la lista de farmacias ({pharmacies.length}).
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Dialog open={isSingleDialogOpen} onOpenChange={setIsSingleDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Agregar Una
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle>Nueva Farmacia</DialogTitle>
                                    <DialogDescription>Ingresa los detalles reales de la farmacia.</DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleSingleCreate} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Nombre de Farmacia</Label>
                                        <Input id="name" value={newPharmacy.name} onChange={(e) => setNewPharmacy({ ...newPharmacy, name: e.target.value })} required />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Ciudad</Label>
                                            <Select
                                                value={newPharmacy.city}
                                                onValueChange={(val) => setNewPharmacy({ ...newPharmacy, city: val, sector: '' })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecciona Ciudad" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Object.keys(DR_LOCATIONS).sort().map(city => (
                                                        <SelectItem key={city} value={city}>{city}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Sector</Label>
                                            <Select
                                                value={newPharmacy.sector}
                                                onValueChange={(val) => setNewPharmacy({ ...newPharmacy, sector: val })}
                                                disabled={!newPharmacy.city}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecciona Sector" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableSectors.map(sec => (
                                                        <SelectItem key={sec} value={sec}>{sec}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="address">Dirección Exacta</Label>
                                        <Input id="address" value={newPharmacy.address} onChange={(e) => setNewPharmacy({ ...newPharmacy, address: e.target.value })} required />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Asignación de Vendedores</Label>
                                        <div className="border rounded-md p-4 bg-slate-50">
                                            <AssignmentManager
                                                reps={reps}
                                                assignments={newPharmacy.repAssignments}
                                                onUpdate={(newAssignments) => setNewPharmacy({ ...newPharmacy, repAssignments: newAssignments })}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="clientCode">Código de Cliente (Opcional)</Label>
                                        <Input id="clientCode" value={newPharmacy.clientCode || ''} onChange={(e) => setNewPharmacy({ ...newPharmacy, clientCode: e.target.value })} />
                                    </div>

                                    <DialogFooter>
                                        <Button type="submit" disabled={isLoading}>
                                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Guardar Farmacia
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>

                        <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Carga Masiva
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Cargar Farmacias (CSV)</DialogTitle>
                                    <DialogDescription>
                                        Sube un archivo .csv o .txt con el formato:<br />
                                        <code className="bg-muted p-1 rounded text-xs">Nombre, Dirección, Sector, Código</code>
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="flex items-center justify-center w-full">
                                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                <FileSpreadsheet className="w-8 h-8 mb-4 text-muted-foreground" />
                                                <p className="mb-2 text-sm text-muted-foreground">
                                                    <span className="font-semibold">Click para buscar</span> o arrastra el archivo
                                                </p>
                                                <p className="text-xs text-muted-foreground">CSV, TXT (Max 2MB)</p>
                                            </div>
                                            <Input
                                                type="file"
                                                className="hidden"
                                                accept=".csv,.txt"
                                                onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
                                            />
                                        </label>
                                    </div>
                                    {bulkFile && (
                                        <div className="text-sm text-center font-medium text-primary">
                                            Archivo seleccionado: {bulkFile.name}
                                        </div>
                                    )}
                                </div>
                                <DialogFooter>
                                    <Button onClick={handleBulkUpload} disabled={!bulkFile || isLoading}>
                                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Procesar Archivo
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
                <div className="relative mt-2">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nombre, sector o código..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Dirección / Sector</TableHead>
                                <TableHead>Código Cliente</TableHead>
                                <TableHead>Vendedores</TableHead>
                                <TableHead className="text-right">Estado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredPharmacies.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        No se encontraron resultados
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredPharmacies.map((p) => (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-medium">{p.name}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span>{p.address}</span>
                                                {p.sector && <span className="text-xs text-muted-foreground">{p.sector}</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {p.clientCode ? <Badge variant="outline">{p.clientCode}</Badge> : '-'}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {p.repAssignments && Object.keys(p.repAssignments).length > 0 ? (
                                                    Object.keys(p.repAssignments).map(repId => {
                                                        const rep = reps.find(r => r.id === repId);
                                                        return (
                                                            <Badge key={repId} variant="secondary" className="text-[10px]">
                                                                {rep ? rep.name : 'Unknown'}
                                                            </Badge>
                                                        );
                                                    })
                                                ) : (
                                                    // Fallback for legacy
                                                    p.assigned_rep_id ? (
                                                        <Badge variant="secondary" className="text-[10px]">
                                                            {reps.find(r => r.id === p.assigned_rep_id)?.name || 'Unknown'}
                                                        </Badge>
                                                    ) : <span className="text-xs text-muted-foreground">Sin Asignar</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant={p.isActive ? "default" : "secondary"} className={p.isActive ? "bg-green-600" : ""}>
                                                {p.isActive ? 'Activa' : 'Inactiva'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right flex items-center justify-end gap-2">
                                            <EditPharmacyDialog pharmacy={p} reps={reps} onUpdate={loadPharmacies} />
                                            <DeletePharmacyDialog pharmacy={p} onDelete={loadPharmacies} />
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

function EditPharmacyDialog({ pharmacy, reps, onUpdate }: { pharmacy: Pharmacy, reps: User[], onUpdate: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    // ... existing code ...
    const [data, setData] = useState({
        name: pharmacy.name,
        address: pharmacy.address,
        sector: pharmacy.sector || '',
        clientCode: pharmacy.clientCode || '',
        isActive: pharmacy.isActive,
        repAssignments: pharmacy.repAssignments || (pharmacy.assigned_rep_id ? { [pharmacy.assigned_rep_id]: ['OTC', 'Genericos', 'Eticos', 'Varios'] as ProductLine[] } : {})
    });
    // ... existing code ...

    const handleUpdate = async () => {
        setIsLoading(true);
        try {
            const assignedRepIds = Object.keys(data.repAssignments);
            await updatePharmacy(pharmacy.id, {
                ...data,
                assignedRepIds,
                assigned_rep_id: assignedRepIds.length > 0 ? assignedRepIds[0] : ''
            });
            toast({ title: 'Farmacia Actualizada', description: 'Los cambios han sido guardados.' });
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
                    <Pencil className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Editar Farmacia</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Nombre</Label>
                        <Input value={data.name} onChange={e => setData({ ...data, name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label>Dirección</Label>
                        <Input value={data.address} onChange={e => setData({ ...data, address: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label>Sector</Label>
                        <Select
                            value={data.sector}
                            onValueChange={(value) => setData({ ...data, sector: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona un sector" />
                            </SelectTrigger>
                            <SelectContent>
                                {SECTORS.map((sector) => (
                                    <SelectItem key={sector} value={sector}>
                                        {sector}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Asignación de Vendedores</Label>
                        <div className="border rounded-md p-4 bg-slate-50">
                            <AssignmentManager
                                reps={reps}
                                assignments={data.repAssignments}
                                onUpdate={(newAssignments) => setData({ ...data, repAssignments: newAssignments })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Código Cliente</Label>
                        <Input value={data.clientCode} onChange={e => setData({ ...data, clientCode: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label>Estado</Label>
                        <Select
                            value={data.isActive ? 'active' : 'inactive'}
                            onValueChange={(value) => setData({ ...data, isActive: value === 'active' })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="active">Activa</SelectItem>
                                <SelectItem value="inactive">Inactiva</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={handleUpdate} disabled={isLoading} className="w-full">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Guardar Cambios'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Sub-component for managing multi-rep assignments
function AssignmentManager({ reps, assignments, onUpdate }: {
    reps: User[],
    assignments: { [repId: string]: ProductLine[] },
    onUpdate: (assignments: { [repId: string]: ProductLine[] }) => void
}) {
    const [selectedRep, setSelectedRep] = useState<string>('');
    const [selectedLines, setSelectedLines] = useState<ProductLine[]>([]);

    // Product Lines
    const PRODUCT_LINES: ProductLine[] = ['OTC', 'Genericos', 'Eticos', 'Varios'];

    const handleAddRep = () => {
        if (!selectedRep || selectedLines.length === 0) return;

        const newAssignments = { ...assignments };
        newAssignments[selectedRep] = selectedLines;
        onUpdate(newAssignments);

        // Reset
        setSelectedRep('');
        setSelectedLines([]);
    };

    const handleRemoveRep = (repId: string) => {
        const newAssignments = { ...assignments };
        delete newAssignments[repId];
        onUpdate(newAssignments);
    };

    const toggleLine = (line: ProductLine) => {
        if (selectedLines.includes(line)) {
            setSelectedLines(selectedLines.filter(l => l !== line));
        } else {
            setSelectedLines([...selectedLines, line]);
        }
    };

    const assignedRepIds = Object.keys(assignments);

    return (
        <div className="space-y-4">
            {/* List of assigned reps */}
            <div className="space-y-2">
                {assignedRepIds.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">No hay vendedores asignados.</p>
                )}
                {assignedRepIds.map(repId => {
                    const rep = reps.find(r => r.id === repId);
                    const lines = assignments[repId];
                    return (
                        <div key={repId} className="flex items-center justify-between bg-white p-2 rounded border">
                            <div>
                                <p className="font-medium text-sm">{rep?.name || 'Desconocido'}</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {lines.map(line => (
                                        <Badge key={line} variant="secondary" className="text-[10px] px-1 py-0 h-4">
                                            {line}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-destructive"
                                onClick={() => handleRemoveRep(repId)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    );
                })}
            </div>

            {/* Add Rep Form */}
            <div className="pt-2 border-t">
                <Label className="text-xs mb-2 block">Agregar Vendedor</Label>
                <div className="flex gap-2 mb-2">
                    <Select value={selectedRep} onValueChange={setSelectedRep}>
                        <SelectTrigger className="h-8">
                            <SelectValue placeholder="Seleccionar Vendedor" />
                        </SelectTrigger>
                        <SelectContent>
                            {reps
                                .filter(r => !assignedRepIds.includes(r.id))
                                .map(r => (
                                    <SelectItem key={r.id} value={r.id}>{r.name} {r.lastName}</SelectItem>
                                ))
                            }
                        </SelectContent>
                    </Select>
                    <Button
                        size="sm"
                        onClick={handleAddRep}
                        disabled={!selectedRep || selectedLines.length === 0}
                        className="h-8"
                    >
                        <Plus className="h-3 w-3 mr-1" /> Agregar
                    </Button>
                </div>

                {selectedRep && (
                    <div className="flex gap-4">
                        {PRODUCT_LINES.map(line => (
                            <div key={line} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`line-${line}`}
                                    checked={selectedLines.includes(line)}
                                    onCheckedChange={() => toggleLine(line)}
                                />
                                <label
                                    htmlFor={`line-${line}`}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    {line}
                                </label>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
