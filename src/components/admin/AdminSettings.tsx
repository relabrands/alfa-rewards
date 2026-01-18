import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Save } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AdminSettings() {
    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-gray-500" />
                    Configuración Global
                </CardTitle>
                <CardDescription>Ajustes del sistema y parámetros de puntos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="points-ratio" className="text-right">
                            Ratio Puntos/RD$
                        </Label>
                        <Input id="points-ratio" defaultValue="0.1" className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="max-scan" className="text-right">
                            Límite Escaneo (RD$)
                        </Label>
                        <Input id="max-scan" defaultValue="50000" className="col-span-3" />
                    </div>
                </div>
                <div className="flex justify-end">
                    <Button>
                        <Save className="mr-2 h-4 w-4" /> Guardar Cambios
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
