import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useApp } from '@/context/AppContext';
import { liveScanLocations, pharmacies } from '@/lib/constants';
import { ScanRecord } from '@/lib/types';
import { getAdminStats, getFlaggedScans } from '@/lib/db';
import {
  Map, Users, DollarSign, TrendingUp, CheckCircle2, XCircle,
  AlertTriangle, Settings, LogOut, Pill, BarChart3, Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export default function AdminDashboard() {
  const { campaignMode, setCampaignMode, logout } = useApp();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalSalesToday: 'RD$ 0k',
    activeClerks: 0,
    totalPharmacies: 0,
    roi: '0%'
  });
  const [flaggedInvoices, setFlaggedInvoices] = useState<ScanRecord[]>([]);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const data = await getAdminStats();
        setStats(data);

        const flagged = await getFlaggedScans();
        setFlaggedInvoices(flagged);
      } catch (error) {
        console.error("Error loading admin stats:", error);
      }
    };
    loadDashboardData();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleApprove = (id: string) => {
    toast({
      title: '✅ Factura Aprobada',
      description: 'Los puntos han sido acreditados',
    });
    // In real app, call updateScanStatus(id, 'approved')
    setFlaggedInvoices(prev => prev.filter(i => i.id !== id));
  };

  const handleReject = (id: string) => {
    toast({
      title: '❌ Factura Rechazada',
      description: 'Se ha notificado al dependiente',
      variant: 'destructive',
    });
    // In real app, call updateScanStatus(id, 'rejected')
    setFlaggedInvoices(prev => prev.filter(i => i.id !== id));
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col h-screen sticky top-0">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <Pill className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-foreground">Alfa Rewards</h1>
              <p className="text-xs text-muted-foreground">Panel de Control</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-primary text-primary-foreground">
            <BarChart3 className="h-5 w-5" />
            <span className="font-medium">Dashboard</span>
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted text-foreground transition-colors">
            <Map className="h-5 w-5" />
            <span className="font-medium">Mapa en Vivo</span>
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted text-foreground transition-colors">
            <Users className="h-5 w-5" />
            <span className="font-medium">Usuarios</span>
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted text-foreground transition-colors">
            <Settings className="h-5 w-5" />
            <span className="font-medium">Configuración</span>
          </button>
        </nav>

        <div className="p-4 border-t border-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Dashboard Director</h1>
              <p className="text-muted-foreground mt-1">Vista general del programa de lealtad</p>
            </div>

            {/* Campaign Mode Toggle */}
            <Card className="p-4">
              <div className="flex items-center gap-4">
                <span className={`font-medium ${campaignMode === 'points' ? 'text-gold-dark' : 'text-muted-foreground'}`}>
                  💰 Puntos
                </span>
                <Switch
                  checked={campaignMode === 'roulette'}
                  onCheckedChange={(checked) => setCampaignMode(checked ? 'roulette' : 'points')}
                />
                <span className={`font-medium ${campaignMode === 'roulette' ? 'text-primary' : 'text-muted-foreground'}`}>
                  🎰 Ruleta
                </span>
              </div>
            </Card>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Ventas Hoy</p>
                    <p className="text-2xl font-bold mt-1">{stats.totalSalesToday}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Dependientes Activos</p>
                    <p className="text-2xl font-bold mt-1">{stats.activeClerks}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Farmacias</p>
                    <p className="text-2xl font-bold mt-1">{stats.totalPharmacies}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                    <Map className="h-6 w-6 text-accent" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">ROI</p>
                    <p className="text-2xl font-bold mt-1 text-success">{stats.roi}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-gold-dark" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Live Map */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-success animate-pulse" />
                  Escaneos en Vivo
                </CardTitle>
                <CardDescription>República Dominicana</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative h-80 bg-muted rounded-lg overflow-hidden">
                  {/* Simplified DR Map */}
                  <svg viewBox="0 0 400 300" className="w-full h-full">
                    {/* Map outline */}
                    <path
                      d="M50 150 Q80 100 150 90 Q200 80 250 100 Q300 120 350 100 Q380 90 390 120 Q400 150 380 180 Q350 200 300 210 Q250 220 200 200 Q150 180 100 190 Q60 200 50 180 Z"
                      fill="hsl(var(--primary) / 0.1)"
                      stroke="hsl(var(--primary) / 0.3)"
                      strokeWidth="2"
                    />

                    {/* Live scan dots */}
                    {liveScanLocations.map((loc, i) => (
                      <g key={loc.id}>
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
                        />
                      </g>
                    ))}
                  </svg>

                  {/* Legend */}
                  <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full bg-success animate-pulse" />
                      <span>{liveScanLocations.length} escaneos activos</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Validation Queue */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  Cola de Validación
                </CardTitle>
                <CardDescription>{flaggedInvoices.length} facturas pendientes de revisión</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {flaggedInvoices.map((invoice) => {
                    const pharmacy = pharmacies.find(p => p.id === invoice.pharmacyId);
                    return (
                      <div key={invoice.id} className="p-4 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive" className="text-xs">Flagged</Badge>
                            <span className="font-medium">RD$ {invoice.invoiceAmount.toLocaleString()}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {pharmacy?.name} • {invoice.pointsEarned} pts
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApprove(invoice.id)}
                            className="text-success border-success/30 hover:bg-success/10"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(invoice.id)}
                            className="text-destructive border-destructive/30 hover:bg-destructive/10"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
