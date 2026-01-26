import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAllScans, getAllPharmacies, getAllUsers } from '@/lib/db';
import { ScanRecord, Pharmacy, User } from '@/lib/types';
import { FileText, Search, Filter, Eye, X } from 'lucide-react';
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function AdminInvoices() {
    const [scans, setScans] = useState<ScanRecord[]>([]);
    const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [pharmacyFilter, setPharmacyFilter] = useState<string>('all');
    const [clerkFilter, setClerkFilter] = useState<string>('all');

    // Modal
    const [selectedInvoice, setSelectedInvoice] = useState<ScanRecord | null>(null);
    const [invoiceImageUrl, setInvoiceImageUrl] = useState<string | null>(null);
    const [imageLoading, setImageLoading] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [scansData, phData, usersData] = await Promise.all([
                    getAllScans(),
                    getAllPharmacies(),
                    getAllUsers()
                ]);
                setScans(scansData);
                setPharmacies(phData);
                setUsers(usersData);
            } catch (error) {
                console.error("Error loading invoices:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    useEffect(() => {
        const fetchImage = async () => {
            if (selectedInvoice) {
                if (selectedInvoice.imageUrl) {
                    setInvoiceImageUrl(selectedInvoice.imageUrl);
                } else if ((selectedInvoice as any).storagePath) {
                    try {
                        setImageLoading(true);
                        const storage = getStorage();
                        const pathReference = ref(storage, (selectedInvoice as any).storagePath);
                        const url = await getDownloadURL(pathReference);
                        setInvoiceImageUrl(url);
                    } catch (e) {
                        console.error("Error fetching image:", e);
                        setInvoiceImageUrl(null);
                    } finally {
                        setImageLoading(false);
                    }
                } else {
                    setInvoiceImageUrl(null);
                }
            } else {
                setInvoiceImageUrl(null);
            }
        };
        fetchImage();
    }, [selectedInvoice]);

    const userMap = useMemo(() => {
        return new Map(users.map(u => [u.id, u]));
    }, [users]);

    const pharmacyMap = useMemo(() => {
        return new Map(pharmacies.map(p => [p.id, p]));
    }, [pharmacies]);

    const filteredScans = useMemo(() => {
        return scans.filter(scan => {
            const user = userMap.get(scan.userId);
            const pharmacyName = scan.pharmacyId ? pharmacyMap.get(scan.pharmacyId)?.name : 'Desconocida';
            const clerkName = user ? user.name : 'Desconocido';

            // Search Text
            const matchesSearch =
                (scan.id && scan.id.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (clerkName && clerkName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (pharmacyName && pharmacyName.toLowerCase().includes(searchTerm.toLowerCase()));

            // Pharmacy Filter
            const matchesPharmacy = pharmacyFilter === 'all' || scan.pharmacyId === pharmacyFilter;

            // Clerk Filter
            const matchesClerk = clerkFilter === 'all' || scan.userId === clerkFilter;

            return matchesSearch && matchesPharmacy && matchesClerk;
        });
    }, [scans, searchTerm, pharmacyFilter, clerkFilter, userMap, pharmacyMap]);

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <FileText className="h-8 w-8 text-primary" />
                        Facturas Escaneadas
                    </h1>
                    <p className="text-muted-foreground">Historial completo de escaneos y validaciones</p>
                </div>
            </div>

            <Card className="flex-1 flex flex-col overflow-hidden">
                <CardHeader className="pb-3">
                    <div className="flex flex-col md:flex-row gap-4 justify-between">
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar ID, Dependiente..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <Select value={pharmacyFilter} onValueChange={setPharmacyFilter}>
                                <SelectTrigger className="w-[180px]">
                                    <Filter className="w-4 h-4 mr-2" />
                                    <SelectValue placeholder="Farmacia" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas las Farmacias</SelectItem>
                                    {pharmacies.map(ph => (
                                        <SelectItem key={ph.id} value={ph.id}>{ph.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={clerkFilter} onValueChange={setClerkFilter}>
                                <SelectTrigger className="w-[180px]">
                                    <Filter className="w-4 h-4 mr-2" />
                                    <SelectValue placeholder="Dependiente" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos los Dependientes</SelectItem>
                                    {users.filter(u => u.role === 'clerk').map(u => (
                                        <SelectItem key={u.id} value={u.id}>{u.name} {u.lastName}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto p-0">
                    <Table>
                        <TableHeader className="sticky top-0 bg-secondary/20 z-10 backdrop-blur-sm">
                            <TableRow>
                                <TableHead className="w-[100px]">Fecha</TableHead>
                                <TableHead>ID Factura</TableHead>
                                <TableHead>Dependiente</TableHead>
                                <TableHead>Farmacia (Detectada)</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Puntos</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8">Cargando facturas...</TableCell>
                                </TableRow>
                            ) : filteredScans.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        No se encontraron facturas con los filtros actuales.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredScans.map((scan) => {
                                    const user = userMap.get(scan.userId);
                                    const pharmacyName = scan.pharmacyId ? pharmacyMap.get(scan.pharmacyId)?.name : '---';

                                    return (
                                        <TableRow key={scan.id}>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {scan.timestamp ? scan.timestamp.toLocaleDateString() : 'N/A'}
                                                <br />
                                                {scan.timestamp ? scan.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">
                                                {scan.ncf || 'Sin NCF'}
                                                <div className="text-[10px] text-muted-foreground truncate w-24" title={scan.id}>
                                                    ID: {scan.id.substring(0, 8)}...
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm">{user?.name || 'Desconocido'}</span>
                                                    <span className="text-xs text-muted-foreground">{user?.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-sm">{pharmacyName}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={
                                                    scan.status === 'processed' ? 'default' :
                                                        scan.status === 'rejected' ? 'destructive' :
                                                            scan.status === 'flagged' ? 'destructive' : 'secondary'
                                                } className={scan.status === 'processed' ? 'bg-green-600 hover:bg-green-700' : ''}>
                                                    {scan.status === 'processed' ? 'Aprobada' :
                                                        scan.status === 'rejected' ? 'Rechazada' :
                                                            scan.status === 'flagged' ? 'Revisión' : scan.status}
                                                </Badge>
                                                {scan.rejectionReason && (
                                                    <div className="text-[10px] text-red-500 mt-1 max-w-[150px] leading-tight">
                                                        {scan.rejectionReason}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-primary">
                                                {scan.pointsEarned > 0 ? `+${scan.pointsEarned}` : '-'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" onClick={() => setSelectedInvoice(scan)}>
                                                    <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Image Viewer Modal */}
            <Dialog open={!!selectedInvoice} onOpenChange={(o) => !o && setSelectedInvoice(null)}>
                <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Detalle de Factura</DialogTitle>
                    </DialogHeader>
                    {selectedInvoice && (
                        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                            <div className="flex justify-between items-start text-sm border-b pb-2">
                                <div>
                                    <p className="font-bold">NCF: <span className="font-mono font-normal">{selectedInvoice.ncf}</span></p>
                                    <p className="text-muted-foreground">Fecha: {selectedInvoice.timestamp?.toLocaleString()}</p>
                                </div>
                                <div className="text-right">
                                    <Badge variant="outline" className="mb-1">{selectedInvoice.status}</Badge>
                                    <p className="font-bold text-primary">{selectedInvoice.pointsEarned} pts</p>
                                </div>
                            </div>

                            <div className="flex-1 bg-slate-900 rounded-lg overflow-hidden relative flex items-center justify-center min-h-[300px]">
                                {imageLoading ? (
                                    <div className="text-white">Cargando imagen...</div>
                                ) : invoiceImageUrl ? (
                                    <img
                                        src={invoiceImageUrl}
                                        alt="Factura"
                                        className="max-w-full max-h-full object-contain"
                                    />
                                ) : (
                                    <div className="text-slate-500">Imagen no disponible</div>
                                )}
                            </div>

                            {selectedInvoice.productsFound && selectedInvoice.productsFound.length > 0 && (
                                <div className="bg-slate-50 p-3 rounded-lg text-sm max-h-32 overflow-auto">
                                    <p className="font-bold mb-1">Productos Identificados:</p>
                                    <ul className="list-disc pl-4 space-y-1">
                                        {selectedInvoice.productsFound.map((p: any, i: number) => (
                                            <li key={i}>{p.product} (x{p.quantity}) - {p.points} pts</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
