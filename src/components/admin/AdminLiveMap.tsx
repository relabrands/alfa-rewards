import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { liveScanLocations } from '@/lib/constants';
import { Activity } from 'lucide-react';

export default function AdminLiveMap() {
    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-success animate-pulse" />
                    Escaneos en Vivo
                </CardTitle>
                <CardDescription>Visualización geográfica de actividad (República Dominicana)</CardDescription>
            </CardHeader>
            <CardContent className="h-[calc(100vh-12rem)]">
                <div className="relative w-full h-full bg-muted rounded-lg overflow-hidden border border-border">
                    {/* Enhanced Map SVG - Dominican Republic Outline */}
                    <svg viewBox="0 0 400 300" className="w-full h-full object-contain p-4">
                        {/* Map outline */}
                        <path
                            d="M50 150 Q80 100 150 90 Q200 80 250 100 Q300 120 350 100 Q380 90 390 120 Q400 150 380 180 Q350 200 300 210 Q250 220 200 200 Q150 180 100 190 Q60 200 50 180 Z"
                            fill="hsl(var(--primary) / 0.1)"
                            stroke="hsl(var(--primary) / 0.3)"
                            strokeWidth="2"
                            filter="drop-shadow(0 4px 6px rgba(0,0,0,0.1))"
                        />

                        {/* Live scan dots with enhanced animations */}
                        {liveScanLocations.map((loc, i) => (
                            <g key={loc.id} className="cursor-pointer group">
                                <circle
                                    cx={100 + i * 60}
                                    cy={120 + (i % 2) * 40}
                                    r="8"
                                    fill="hsl(var(--success))"
                                    className="animate-pulse"
                                />
                                <circle
                                    cx={100 + i * 60}
                                    cy={120 + (i % 2) * 40}
                                    r="16"
                                    fill="none"
                                    stroke="hsl(var(--success))"
                                    strokeWidth="2"
                                    opacity="0.5"
                                    className="animate-ping"
                                    style={{ animationDuration: `${2 + i * 0.5}s` }}
                                />

                                {/* Tooltip on hover */}
                                <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <rect
                                        x={(100 + i * 60) - 60}
                                        y={(120 + (i % 2) * 40) - 50}
                                        width="120"
                                        height="40"
                                        rx="4"
                                        fill="black"
                                        opacity="0.8"
                                    />
                                    <text
                                        x={100 + i * 60}
                                        y={(120 + (i % 2) * 40) - 30}
                                        textAnchor="middle"
                                        fill="white"
                                        fontSize="10"
                                        fontWeight="bold"
                                    >
                                        {loc.pharmacyName}
                                    </text>
                                    <text
                                        x={100 + i * 60}
                                        y={(120 + (i % 2) * 40) - 18}
                                        textAnchor="middle"
                                        fill="white"
                                        fontSize="9"
                                    >
                                        RD$ {loc.amount} - {loc.clerkName}
                                    </text>
                                </g>
                            </g>
                        ))}
                    </svg>

                    {/* Legend Overlay */}
                    <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-4 shadow-lg border border-border">
                        <h3 className="font-semibold text-sm mb-2">Actividad Reciente</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="w-3 h-3 rounded-full bg-success animate-pulse" />
                            <span>{liveScanLocations.length} escaneos activos</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Actualizado en tiempo real</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
