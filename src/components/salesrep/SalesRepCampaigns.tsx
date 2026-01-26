import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gift, Percent, Info, AlertCircle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export function SalesRepCampaigns() {
    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Campañas Activas</h1>
                <p className="text-muted-foreground">Información clave para informar a tus clientes</p>
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
                                    Los dependientes ganan puntos escaneando el código NCF de las facturas que contengan productos participantes. La IA valida la factura automáticamente.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-2">
                                <AccordionTrigger>¿Cuándo vencen los puntos?</AccordionTrigger>
                                <AccordionContent>
                                    Los puntos tienen una vigencia de 12 meses desde su generación.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-3">
                                <AccordionTrigger>¿Cómo canjean premios?</AccordionTrigger>
                                <AccordionContent>
                                    Directamente en la app. Pueden elegir recargas (instantáneas) o bonos (procesados en 24h).
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Gift className="w-5 h-5 text-purple-600" /> Premios Destacados
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3">
                            <li className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                                <span>Recarga Telefónica (Claro/Altice)</span>
                                <Badge variant="outline">Desde 500 pts</Badge>
                            </li>
                            <li className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                                <span>Bono CCN / Jumbo</span>
                                <Badge variant="outline">Desde 1,000 pts</Badge>
                            </li>
                            <li className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                                <span>Entradas de Cine (Palacio)</span>
                                <Badge variant="outline">800 pts</Badge>
                            </li>
                        </ul>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2 border-l-4 border-l-green-600">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Percent className="w-5 h-5 text-green-600" /> Productos Participantes (Este Mes)
                        </CardTitle>
                        <CardDescription>Enfatizar estos productos en tus visitas</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            <Badge className="text-sm py-1 px-3 bg-green-100 text-green-800 hover:bg-green-200">Aspirina 100mg (+10 pts)</Badge>
                            <Badge className="text-sm py-1 px-3 bg-green-100 text-green-800 hover:bg-green-200">Alka-Seltzer (+5 pts)</Badge>
                            <Badge className="text-sm py-1 px-3 bg-green-100 text-green-800 hover:bg-green-200">Vitamina C (+15 pts)</Badge>
                            <Badge className="text-sm py-1 px-3 bg-green-100 text-green-800 hover:bg-green-200">Apronax (+20 pts)</Badge>
                            <Badge className="text-sm py-1 px-3 bg-green-100 text-green-800 hover:bg-green-200">Bepanthen (+12 pts)</Badge>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
