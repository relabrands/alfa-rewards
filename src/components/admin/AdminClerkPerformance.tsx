import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getClerkPerformance } from '@/lib/db';
import { BarChart3, Trophy, Medal } from 'lucide-react';

interface ClerkPerformance {
    id: string;
    name: string;
    pharmacyName: string;
    points: number;
    lifetimePoints: number;
    scanCount: number;
    status: string;
}

export default function AdminClerkPerformance() {
    const [clerks, setClerks] = useState<ClerkPerformance[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const data = await getClerkPerformance();
                // Map the raw data to our interface if needed, or if getClerkPerformance returns compatible objects
                setClerks(data as ClerkPerformance[]);
            } catch (error) {
                console.error("Error loading performance data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    const getRankIcon = (index: number) => {
        if (index === 0) return <Trophy className="h-5 w-5 text-gold" />;
        if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />;
        if (index === 2) return <Medal className="h-5 w-5 text-amber-700" />;
        return <span className="font-bold text-muted-foreground w-5 text-center">{index + 1}</span>;
    };

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Rendimiento por Dependiente
                </CardTitle>
                <CardDescription>Ranking histórico basado en puntos generados totales</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">Rank</TableHead>
                                <TableHead>Dependiente</TableHead>
                                <TableHead>Farmacia</TableHead>
                                <TableHead className="text-center">Escaneos</TableHead>
                                <TableHead className="text-right">Histórico (Total)</TableHead>
                                <TableHead className="text-right">Disponible</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">
                                        Cargando datos...
                                    </TableCell>
                                </TableRow>
                            ) : clerks.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No hay datos de rendimiento disponibles.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                clerks.map((clerk, index) => (
                                    <TableRow key={clerk.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center justify-center">
                                                {getRankIcon(index)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{clerk.name}</span>
                                                <Badge variant={clerk.status === 'active' ? 'outline' : 'secondary'} className="w-fit mt-1 text-[10px]">
                                                    {clerk.status === 'active' ? 'Activo' : 'Pendiente'}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell>{clerk.pharmacyName}</TableCell>
                                        <TableCell className="text-center font-mono">
                                            {clerk.scanCount}
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-lg text-primary">
                                            {clerk.lifetimePoints.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground">
                                            {clerk.points.toLocaleString()}
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
