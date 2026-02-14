import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from "@/hooks/use-toast";
import { getProducts, createProduct, deleteProduct } from '@/lib/db';
import { Product, ProductLine } from '@/lib/types';
import { ScanBarcode, PlusCircle, Trash2, Loader2, Tag, Upload, Percent } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import Papa from 'papaparse';

export default function AdminProducts() {
    const { toast } = useToast();
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // New Product State
    const [newProduct, setNewProduct] = useState({
        name: '',
        keywordsString: '', // Separate by commas
        points: 0, // Legacy/Estimated
        commission: 0, // Percentage
        image: '💊',
        line: 'OTC' as ProductLine
    });

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        setIsLoading(true);
        try {
            const data = await getProducts();
            setProducts(data);
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "No se pudieron cargar los productos.",
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-set commission based on line
    const handleLineChange = (val: ProductLine) => {
        let defaultComm = 0;
        switch (val) {
            case 'OTC': defaultComm = 10; break;
            case 'Genericos': defaultComm = 5; break;
            case 'Eticos': defaultComm = 3; break;
            default: defaultComm = 0;
        }
        setNewProduct({ ...newProduct, line: val, commission: defaultComm });
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProduct.name || !newProduct.keywordsString) return;

        setIsLoading(true);
        try {
            const keywords = newProduct.keywordsString.split(',').map(k => k.trim().toLowerCase()).filter(k => k.length > 0);

            await createProduct({
                name: newProduct.name,
                keywords,
                points: newProduct.points, // Legacy
                commission: newProduct.commission,
                image: newProduct.image,
                line: newProduct.line
            });

            toast({ title: "Producto Creado", description: "El producto ha sido agregado para escaneo." });
            setIsDialogOpen(false);
            setNewProduct({ name: '', keywordsString: '', points: 0, commission: 0, image: '💊', line: 'OTC' });
            loadProducts();
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "No se pudo crear el producto.", variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar este producto?")) return;

        try {
            await deleteProduct(id);
            toast({ title: "Producto Eliminado", description: "El producto ha sido removido." });
            loadProducts();
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "No se pudo eliminar el producto.", variant: 'destructive' });
        }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            complete: async (results) => {
                const data = results.data as any[];
                let count = 0;
                setIsLoading(true);

                try {
                    for (const row of data) {
                        if (row.Name) {
                            const keywords = row.Keywords
                                ? row.Keywords.toString().split(',').map((k: string) => k.trim().toLowerCase())
                                : [row.Name.toLowerCase()];

                            // Determine line
                            const lineInput: string = row.Line ? row.Line.trim() : 'OTC';
                            const validLines: ProductLine[] = ['OTC', 'Genericos', 'Eticos', 'Varios'];
                            const line: ProductLine = validLines.includes(lineInput as any) ? (lineInput as ProductLine) : 'OTC';

                            // Determine Commission
                            const commission = parseFloat(row.Commission) || (line === 'OTC' ? 10 : (line === 'Genericos' ? 5 : 3));

                            await createProduct({
                                name: row.Name,
                                points: parseInt(row.Points) || 10, // Legacy
                                commission: commission,
                                keywords: keywords,
                                image: row.Image || '💊',
                                line: line
                            });
                            count++;
                        }
                    }
                    toast({
                        title: "Importación Exitosa",
                        description: `Se han importado ${count} productos correctamente.`
                    });
                    loadProducts();
                } catch (error) {
                    console.error("Error importing products:", error);
                    toast({
                        title: "Error",
                        description: "Hubo un problema al importar los productos.",
                        variant: "destructive"
                    });
                } finally {
                    setIsLoading(false);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                }
            },
            error: (error) => {
                console.error("CSV Parse Error:", error);
                toast({
                    title: "Error de Archivo",
                    description: "No se pudo leer el archivo CSV.",
                    variant: "destructive"
                });
            }
        });
    };

    const getLineColor = (line?: ProductLine) => {
        switch (line) {
            case 'OTC': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'Genericos': return 'bg-green-100 text-green-800 border-green-200';
            case 'Eticos': return 'bg-purple-100 text-purple-800 border-purple-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <Card className="h-full">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <ScanBarcode className="h-5 w-5 text-primary" />
                            Productos Participantes (IA)
                        </CardTitle>
                        <CardDescription>Configura los productos y su porcentaje de comisión.</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="file"
                            accept=".csv"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                        />
                        <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                            <Upload className="mr-2 h-4 w-4" />
                            Importar CSV
                        </Button>
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Agregar Producto
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Nuevo Producto Participante</DialogTitle>
                                    <DialogDescription>Define el producto, línea y comisión.</DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleCreate} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Nombre del Producto</Label>
                                        <Input
                                            value={newProduct.name}
                                            onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                                            placeholder="Ej. Aspirina 500mg"
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Línea de Producto</Label>
                                            <Select
                                                value={newProduct.line}
                                                onValueChange={(val: ProductLine) => handleLineChange(val)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecciona Línea" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="OTC">OTC (Venta Libre)</SelectItem>
                                                    <SelectItem value="Genericos">Genéricos</SelectItem>
                                                    <SelectItem value="Eticos">Éticos (Receta)</SelectItem>
                                                    <SelectItem value="Varios">Varios</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Comisión (%)</Label>
                                            <div className="relative">
                                                <Percent className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    type="number"
                                                    value={newProduct.commission}
                                                    onChange={e => setNewProduct({ ...newProduct, commission: parseFloat(e.target.value) || 0 })}
                                                    required
                                                    className="pr-8"
                                                />
                                            </div>
                                            <p className="text-[10px] text-muted-foreground">Porcentaje del valor de venta.</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Palabras Clave (Separadas por comas)</Label>
                                        <Input
                                            value={newProduct.keywordsString}
                                            onChange={e => setNewProduct({ ...newProduct, keywordsString: e.target.value })}
                                            placeholder="ej. aspirina, bayer, 500mg"
                                            required
                                        />
                                        <p className="text-xs text-muted-foreground">La IA buscará estas palabras en la factura.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Emoji / Ícono</Label>
                                        <Input
                                            value={newProduct.image}
                                            onChange={e => setNewProduct({ ...newProduct, image: e.target.value })}
                                            placeholder="💊"
                                        />
                                    </div>
                                    <DialogFooter>
                                        <Button type="submit" disabled={isLoading}>
                                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Guardar Producto
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
                                <TableHead className="w-[50px]">Img</TableHead>
                                <TableHead>Producto</TableHead>
                                <TableHead>Línea</TableHead>
                                <TableHead>Palabras Clave</TableHead>
                                <TableHead>Comisión</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {products.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No hay productos configurados.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                products.map((product) => (
                                    <TableRow key={product.id}>
                                        <TableCell className="text-2xl">{product.image}</TableCell>
                                        <TableCell>
                                            <p className="font-medium">{product.name}</p>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={getLineColor(product.line)}>
                                                {product.line || 'OTC'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {product.keywords.map((k, i) => (
                                                    <span key={i} className="px-2 py-0.5 bg-muted rounded-full text-xs">
                                                        {k}
                                                    </span>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1 font-bold text-primary">
                                                <Percent className="h-3 w-3" />
                                                {product.commission || 0}%
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:bg-destructive/10"
                                                onClick={() => handleDelete(product.id)}
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
