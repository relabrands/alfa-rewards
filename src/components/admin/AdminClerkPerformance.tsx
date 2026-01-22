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
                <CardDescription>Ranking de dependientes basado en puntos generados</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">Rank</TableHead>
                                <TableHead>Dependiente</TableHead>
                                <TableHead>Farmacia</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Puntos Totales</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">
                                        Cargando datos...
                                    </TableCell>
                                </TableRow>
                            ) : clerks.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
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
                                        <TableCell className="font-medium">{clerk.name}</TableCell>
                                        <TableCell>{clerk.pharmacyName}</TableCell>
                                        <TableCell>
                                            <Badge variant={clerk.status === 'active' ? 'default' : 'secondary'}>
                                                {clerk.status === 'active' ? 'Activo' : 'Pendiente'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-lg text-primary">
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
