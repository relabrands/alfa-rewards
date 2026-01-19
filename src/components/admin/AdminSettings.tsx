import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Save, AlertTriangle } from 'lucide-react';
import { resetSystemDatabase } from '@/lib/db';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AdminSettings() {
    const [isResetting, setIsResetting] = useState(false);

    const handleReset = async () => {
        if (confirm("⚠️ ¿ESTÁS SEGURO? \n\nEsto borrará TODOS los puntos de los usuarios, eliminará EL HISTORIAL de escaneos y reiniciará la base de datos operativa. \n\nEsta acción NO se puede deshacer.")) {
            setIsResetting(true);
            try {
                await resetSystemDatabase();
                alert("Base de datos reiniciada con éxito.");
            } catch (error) {
                console.error("Error resetting DB:", error);
                alert("Error al reiniciar la base de datos.");
            } finally {
                setIsResetting(false);
            }
        }
    };

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

            <div className="border-t border-red-100 bg-red-50/50 p-6 rounded-b-xl mt-4">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-red-100 rounded-full">
                        <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-red-700">Zona de Peligro</h3>
                        <p className="text-sm text-red-600/80 mb-4">
                            Estas acciones son destructivas y no se pueden deshacer. Ten cuidado.
                        </p>
                        <Button
                            variant="destructive"
                            onClick={handleReset}
                            disabled={isResetting}
                            className="bg-red-600 hover:bg-red-700 shadow-md"
                        >
                            {isResetting ? "Reiniciando..." : "Resetear Base de Datos Completa"}
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    );
}
