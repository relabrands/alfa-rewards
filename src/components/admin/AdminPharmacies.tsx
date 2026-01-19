import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/hooks/use-toast";
import { getPharmacies, createPharmacy } from '@/lib/db';
import { Pharmacy } from '@/lib/types';
import { Building2, Plus, Upload, Loader2, Search, FileSpreadsheet } from 'lucide-react';

export default function AdminPharmacies() {
    const { toast } = useToast();
    const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
    const [search, setSearch] = useState('');
    const [isSingleDialogOpen, setIsSingleDialogOpen] = useState(false);
    const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Single Add Form
    const [newPharmacy, setNewPharmacy] = useState({ name: '', address: '', sector: '', clientCode: '' });

    // Bulk Upload
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [bulkFile, setBulkFile] = useState<File | null>(null);

    useEffect(() => {
        loadPharmacies();
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

    const handleSingleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await createPharmacy({
                name: newPharmacy.name,
                address: newPharmacy.address,
                sector: newPharmacy.sector,
                clientCode: newPharmacy.clientCode,
                lat: 0, // Default placeholders
                lng: 0  // Default placeholders
            });
            toast({ title: "Farmacia Creada", description: "Se ha agregado la farmacia exitosamente." });
            setIsSingleDialogOpen(false);
            setNewPharmacy({ name: '', address: '', sector: '', clientCode: '' });
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
            const text = e.target?.result as string;
            // Simple CSV parser: Name, Address, Sector, ClientCode
            const lines = text.split('\n').filter(line => line.trim() !== '');
            let successCount = 0;
            let errorCount = 0;

            // Skip header if exists (heuristic: check if first line contains "name" or "nombre")
            const startIndex = lines[0].toLowerCase().includes('nombre') || lines[0].toLowerCase().includes('name') ? 1 : 0;

            for (let i = startIndex; i < lines.length; i++) {
                try {
                    const cols = lines[i].split(',').map(c => c.trim());
                    if (cols.length >= 2) { // Need at least Name and Address
                        await createPharmacy({
                            name: cols[0],
                            address: cols[1],
                            sector: cols[2] || '',
                            clientCode: cols[3] || '',
                            lat: 0,
                            lng: 0
                        });
                        successCount++;
                    }
                } catch (error) {
                    errorCount++;
                    console.error("Row error", lines[i], error);
                }
            }

            toast({
                title: "Carga Masiva Completada",
                description: `Se agregaron ${successCount} farmacias. ${errorCount > 0 ? `${errorCount} fallaron.` : ''}`
            });
            setIsBulkDialogOpen(false);
            setBulkFile(null);
            loadPharmacies();
            setIsLoading(false);
        };
        reader.readAsText(bulkFile);
    };

    const filteredPharmacies = pharmacies.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sector?.toLowerCase().includes(search.toLowerCase()) ||
        p.clientCode?.includes(search)
    );

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
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Nueva Farmacia</DialogTitle>
                                    <DialogDescription>Ingresa los detalles de la farmacia manualmente.</DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleSingleCreate} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Nombre de Farmacia</Label>
                                        <Input id="name" value={newPharmacy.name} onChange={(e) => setNewPharmacy({ ...newPharmacy, name: e.target.value })} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="address">Dirección</Label>
                                        <Input id="address" value={newPharmacy.address} onChange={(e) => setNewPharmacy({ ...newPharmacy, address: e.target.value })} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="sector">Sector / Zona</Label>
                                        <Select
                                            value={newPharmacy.sector}
                                            onValueChange={(value) => setNewPharmacy({ ...newPharmacy, sector: value })}
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
                                        <Label htmlFor="clientCode">Código de Cliente (Opcional)</Label>
                                        <Input id="clientCode" value={newPharmacy.clientCode || ''} onChange={(e) => setNewPharmacy({ ...newPharmacy, clientCode: e.target.value })} />
                                    </div>
                                    <DialogFooter>
                                        <Button type="submit" disabled={isLoading}>
                                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Guardar
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
                                <TableHead className="text-right">Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredPharmacies.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
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
                                        <TableCell className="text-right">
                                            <Badge variant={p.isActive ? "default" : "secondary"} className={p.isActive ? "bg-green-600" : ""}>
                                                {p.isActive ? 'Activa' : 'Inactiva'}
                                            </Badge>
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
