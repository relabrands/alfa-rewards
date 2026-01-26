import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gift, Percent, Info, Trophy, Loader2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { getLevels, getProducts, getRewards } from '@/lib/db';
import { LevelConfig, Product, Reward } from '@/lib/types';

export function SalesRepCampaigns() {
    const [levels, setLevels] = useState<LevelConfig[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [l, p, r] = await Promise.all([
                    getLevels(),
                    getProducts(),
                    getRewards()
                ]);
                setLevels(l);
                setProducts(p);
                setRewards(r);
            } catch (error) {
                console.error("Error loading campaign data:", error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) {
        return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Campañas Activas</h1>
                <p className="text-muted-foreground">Información en tiempo real del sistema</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-l-4 border-l-primary">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Info className="w-5 h-5 text-primary" /> Reglas del Programa
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="item-1">
                                <AccordionTrigger>¿Cómo ganan puntos?</AccordionTrigger>
                                <AccordionContent>
                                    Los dependientes ganan puntos escaneando el código NCF de las facturas. La IA detecta los productos participantes automáticamente.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-2">
                                <AccordionTrigger>Niveles y Gamificación</AccordionTrigger>
                                <AccordionContent>
                                    <div className="space-y-2 mt-2">
                                        {levels.map(level => (
                                            <div key={level.id} className="flex justify-between items-center text-sm border-b pb-1 last:border-0">
                                                <span className="font-medium" style={{ color: level.color }}>{level.name}</span>
                                                <span className="text-muted-foreground">{level.minPoints.toLocaleString()} pts</span>
                                            </div>
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-3">
                                <AccordionTrigger>Vencimiento</AccordionTrigger>
                                <AccordionContent>
                                    Los puntos tienen una vigencia de 12 meses (año calendario) desde su generación.
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Gift className="w-5 h-5 text-purple-600" /> Premios Vigentes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3 max-h-[300px] overflow-auto">
                            {rewards.map(reward => (
                                <li key={reward.id} className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm mb-1">
                                    <span className="truncate max-w-[180px]" title={reward.name}>{reward.name}</span>
                                    <Badge variant="outline" className="shrink-0">{reward.pointsCost.toLocaleString()} pts</Badge>
                                </li>
                            ))}
                            {rewards.length === 0 && <p className="text-sm text-muted-foreground">No hay premios configurados.</p>}
                        </ul>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2 border-l-4 border-l-green-600">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Percent className="w-5 h-5 text-green-600" /> Productos Participantes
                        </CardTitle>
                        <CardDescription>Estos son los productos que la IA está buscando activamente en las facturas</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {products.map(product => (
                                <Badge key={product.id} className="text-sm py-1 px-3 bg-green-100 text-green-800 hover:bg-green-200 border-green-200">
                                    {product.name} (+{product.points} pts)
                                </Badge>
                            ))}
                            {products.length === 0 && <p className="text-sm text-muted-foreground">No hay productos activos.</p>}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
