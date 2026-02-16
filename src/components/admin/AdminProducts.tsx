import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from "@/hooks/use-toast";
import { getProducts, createProduct, updateProduct, deleteProduct, getProductLines, createProductLine, updateProductLine, deleteProductLine } from '@/lib/db';
import { Product, ProductLineConfig } from '@/lib/types';
import { ScanBarcode, PlusCircle, Trash2, Loader2, Tag, Upload, Percent, Layers, Pencil, FileSpreadsheet } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import Papa from 'papaparse';

export default function AdminProducts() {
    const { toast } = useToast();

    // State
    const [products, setProducts] = useState<Product[]>([]);
    const [lines, setLines] = useState<ProductLineConfig[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Dialogs
    const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
    const [isLineDialogOpen, setIsLineDialogOpen] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Edit Mode State
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [editingLine, setEditingLine] = useState<ProductLineConfig | null>(null);

    // Form State
    const [productForm, setProductForm] = useState({
        name: '',
        keywordsString: '',
        points: 0,
        commission: 0,
        image: '💊',
        line: ''
    });

    const [lineForm, setLineForm] = useState({
        name: '',
        commission: 0
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [pData, lData] = await Promise.all([getProducts(), getProductLines()]);
            setProducts(pData);
            setLines(lData);
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

    // --- LINE MANAGEMENT ---
    const openLineDialog = (line?: ProductLineConfig) => {
        if (line) {
            setEditingLine(line);
            setLineForm({ name: line.name, commission: line.commission });
        } else {
            setEditingLine(null);
            setLineForm({ name: '', commission: 0 });
        }
        setIsLineDialogOpen(true);
    };

    const handleSaveLine = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!lineForm.name) return;

        setIsLoading(true);
        try {
            if (editingLine) {
                await updateProductLine(editingLine.id, lineForm);
                toast({ title: "Línea Actualizada" });
            } else {
                await createProductLine(lineForm);
                toast({ title: "Línea Creada", description: "Nueva línea de productos agregada." });
            }
            setIsLineDialogOpen(false);
            loadData();
        } catch (error) {
            toast({ title: "Error", description: "No se pudo guardar la línea.", variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteLine = async (id: string) => {
        if (!confirm("Eliminar esta línea no afectará los productos existentes, pero no podrás seleccionar esta línea para nuevos productos. ¿Continuar?")) return;
        try {
            await deleteProductLine(id);
            toast({ title: "Línea Eliminada" });
            loadData();
        } catch (error) {
            toast({ title: "Error", description: "No se pudo eliminar.", variant: 'destructive' });
        }
    };

    // --- PRODUCT MANAGEMENT ---
    const openProductDialog = (product?: Product) => {
        if (product) {
            setEditingProduct(product);
            setProductForm({
                name: product.name,
                keywordsString: product.keywords.join(', '),
                points: product.points,
                commission: product.commission || 0,
                image: product.image || '💊',
                line: product.line || ''
            });
        } else {
            setEditingProduct(null);
            setProductForm({
                name: '',
                keywordsString: '',
                points: 0,
                commission: 0,
                image: '💊',
                line: ''
            });
        }
        setIsProductDialogOpen(true);
    }

    const handleLineSelect = (lineId: string) => {
        const selectedLine = lines.find(l => l.name === lineId || l.id === lineId); // Matching by name for now as the value
        if (selectedLine) {
            setProductForm({ ...productForm, line: selectedLine.name, commission: selectedLine.commission });
        } else {
            setProductForm({ ...productForm, line: lineId });
        }
    };

    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!productForm.name || !productForm.keywordsString) return;

        setIsLoading(true);
        try {
            const keywords = productForm.keywordsString.split(',').map(k => k.trim().toLowerCase()).filter(k => k.length > 0);
            const productData = {
                name: productForm.name,
                keywords,
                points: productForm.points,
                commission: productForm.commission,
                image: productForm.image,
                line: productForm.line
            };

            if (editingProduct) {
                await updateProduct(editingProduct.id, productData);
                toast({ title: "Producto Actualizado" });
            } else {
                await createProduct(productData);
                toast({ title: "Producto Creado" });
            }

            setIsProductDialogOpen(false);
            loadData();
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "No se pudo guardar el producto.", variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteProduct = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar este producto?")) return;
        try {
            await deleteProduct(id);
            toast({ title: "Producto Eliminado" });
            loadData();
        } catch (error) {
            toast({ title: "Error", description: "No se pudo eliminar.", variant: 'destructive' });
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

                            // Line Matching
                            const lineName = row.Line ? row.Line.trim() : 'General';
                            const matchedLine = lines.find(l => l.name.toLowerCase() === lineName.toLowerCase());
                            const commission = matchedLine ? matchedLine.commission : (parseFloat(row.Commission) || 0);

                            await createProduct({
                                name: row.Name,
                                points: parseInt(row.Points) || 0, // Legacy
                                commission: commission,
                                keywords: keywords,
                                image: row.Image || '💊',
                                line: matchedLine ? matchedLine.name : lineName
                            });
                            count++;
                        }
                    }
                    toast({
                        title: "Importación Exitosa",
                        description: `Se han importado ${count} productos correctamente.`
                    });
                    loadData();
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

    const handleDownloadTemplate = () => {
        const headers = ['Name', 'Keywords', 'Points', 'Commission', 'Image', 'Line'];
        const rows = [
            ['Ejemplo Aspirina', 'dolor, cabeza, fiebre', '10', '5', '💊', 'General'],
            ['Jarabe Tos', 'tos, gripe, garganta', '15', '10', 'aa', 'Pediatria']
        ];

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'plantilla_productos.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="h-full space-y-6">
            {/* Top Section: Line Management */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Layers className="h-5 w-5 text-indigo-500" />
                                Líneas de Productos / Categorías
                            </CardTitle>
                            <CardDescription>Configura las comisiones por categoría.</CardDescription>
                        </div>
                        <Dialog open={isLineDialogOpen} onOpenChange={setIsLineDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="secondary" size="sm" onClick={() => openLineDialog()}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Nueva Línea
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>{editingLine ? 'Editar Línea' : 'Nueva Línea de Producto'}</DialogTitle>
                                    <DialogDescription>Define el nombre y el porcentaje de comisión base.</DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleSaveLine} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Nombre de la Línea</Label>
                                        <Input
                                            value={lineForm.name}
                                            onChange={e => setLineForm({ ...lineForm, name: e.target.value })}
                                            placeholder="Ej. Nutrición, Dermatología"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Comisión Base (%)</Label>
                                        <Input
                                            type="number"
                                            value={lineForm.commission}
                                            onChange={e => setLineForm({ ...lineForm, commission: parseFloat(e.target.value) || 0 })}
                                            required
                                        />
                                    </div>
                                    <DialogFooter>
                                        <Button type="submit" disabled={isLoading}>{editingLine ? 'Actualizar' : 'Guardar'} Línea</Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2">
                        {lines.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">No hay líneas configuradas.</p>
                        ) : (
                            lines.map(line => (
                                <Badge key={line.id} variant="outline" className="pl-2 pr-1 py-1 flex items-center gap-2 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => openLineDialog(line)}>
                                    <span className="font-medium">{line.name}</span>
                                    <span className="bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded-full font-bold">
                                        {line.commission}%
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-4 w-4 ml-1 text-muted-foreground hover:text-destructive"
                                        onClick={(e) => { e.stopPropagation(); handleDeleteLine(line.id); }}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </Badge>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Main Section: Product Management */}
            <Card className="h-full">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <ScanBarcode className="h-5 w-5 text-primary" />
                                Productos Participantes (IA)
                            </CardTitle>
                            <CardDescription>Gestión de productos individuales.</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={handleDownloadTemplate} title="Descargar plantilla CSV">
                                <FileSpreadsheet className="mr-2 h-4 w-4" />
                                Plantilla
                            </Button>
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
                            <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button onClick={() => openProductDialog()}>
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Agregar Producto
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
                                        <DialogDescription>Asigna el producto a una línea para heredar la comisión.</DialogDescription>
                                    </DialogHeader>
                                    <form onSubmit={handleSaveProduct} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Nombre del Producto</Label>
                                            <Input
                                                value={productForm.name}
                                                onChange={e => setProductForm({ ...productForm, name: e.target.value })}
                                                placeholder="Ej. Aspirina 500mg"
                                                required
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Línea de Producto</Label>
                                                <Select
                                                    value={productForm.line}
                                                    onValueChange={handleLineSelect}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecciona Línea" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {lines.map(l => (
                                                            <SelectItem key={l.id} value={l.name}>{l.name} ({l.commission}%)</SelectItem>
                                                        ))}
                                                        <SelectItem value="Otra">Otra / General</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Comisión (%)</Label>
                                                <div className="relative">
                                                    <Percent className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        type="number"
                                                        value={productForm.commission}
                                                        onChange={e => setProductForm({ ...productForm, commission: parseFloat(e.target.value) || 0 })}
                                                        required
                                                        className="pr-8"
                                                    />
                                                </div>
                                                <p className="text-[10px] text-muted-foreground">Heredado de la línea o manual.</p>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Palabras Clave (Separadas por comas)</Label>
                                            <Input
                                                value={productForm.keywordsString}
                                                onChange={e => setProductForm({ ...productForm, keywordsString: e.target.value })}
                                                placeholder="ej. aspirina, bayer, 500mg"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Emoji / Ícono</Label>
                                            <Input
                                                value={productForm.image}
                                                onChange={e => setProductForm({ ...productForm, image: e.target.value })}
                                                placeholder="💊"
                                            />
                                        </div>
                                        <DialogFooter>
                                            <Button type="submit" disabled={isLoading}>
                                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                {editingProduct ? 'Actualizar' : 'Guardar'} Producto
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
                                                <Badge variant="outline" className="bg-slate-100 text-slate-700">
                                                    {product.line || 'General'}
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
                                                    className="text-primary hover:bg-primary/10 mr-1"
                                                    onClick={() => openProductDialog(product)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleDeleteProduct(product.id)}
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
        </div>
    );
}
