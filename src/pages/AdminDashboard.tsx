import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useApp } from '@/context/AppContext';
import { liveScanLocations, pharmacies } from '@/lib/constants';
import { ScanRecord, DashboardStats } from '@/lib/types';
import { getAdminStats, getFlaggedScans } from '@/lib/db';
import {
  Map, Users, DollarSign, TrendingUp, CheckCircle2, XCircle, Trophy, History,
  AlertTriangle, Settings, LogOut, Pill, BarChart3, Activity, Building2, Gift, Clock, ChevronRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import DirectorMapAnalytics from '@/components/admin/DirectorMapAnalytics';
import AdminUsers from '@/components/admin/AdminUsers';
import AdminSettings from '@/components/admin/AdminSettings';
import AdminPharmacies from '@/components/admin/AdminPharmacies';
import AdminRewards from '@/components/admin/AdminRewards';
import AdminProducts from '@/components/admin/AdminProducts';
import AdminClerkPerformance from '@/components/admin/AdminClerkPerformance';

type AdminView = 'dashboard' | 'map' | 'users' | 'pharmacies' | 'settings' | 'rewards' | 'products' | 'analytics';

export default function AdminDashboard() {
  const { campaignMode, setCampaignMode, logout, currentUser } = useApp();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');

  const [stats, setStats] = useState<DashboardStats>({
    totalPointsToday: 0,
    activeClerks: 0,
    totalPharmacies: 0,
    roi: '0%'
  });
  const [flaggedInvoices, setFlaggedInvoices] = useState<ScanRecord[]>([]);

  useEffect(() => {
    if (currentView === 'dashboard') {
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
    }
  }, [currentView]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleApprove = (id: string) => {
    toast({ title: '✅ Factura Aprobada', description: 'Los puntos han sido acreditados' });
    setFlaggedInvoices(prev => prev.filter(i => i.id !== id));
  };

  const handleReject = (id: string) => {
    toast({ title: '❌ Factura Rechazada', description: 'Se ha notificado al dependiente', variant: 'destructive' });
    setFlaggedInvoices(prev => prev.filter(i => i.id !== id));
  };

  const renderContent = () => {
    switch (currentView) {
      case 'map': return <DirectorMapAnalytics />;
      case 'users': return <AdminUsers />;
      case 'pharmacies': return <AdminPharmacies />;
      case 'rewards': return <AdminRewards />;
      case 'products': return <AdminProducts />;
      case 'analytics': return <AdminClerkPerformance />;
      case 'settings': return <AdminSettings />;
      default: return (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Dashboard Director</h1>
              <p className="text-muted-foreground mt-1">Vista general del rendimiento hoy, {new Date().toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' })}.</p>
            </div>
            <Card className="p-3 bg-secondary/50 border-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white rounded-full shadow-sm">
                  <Clock className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium pr-2">Actualizado: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </Card>
          </div>

          {/* KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="hover:shadow-md transition-all border-l-4 border-l-primary/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Puntos Hoy</p>
                    <p className="text-2xl font-black mt-2">{stats.totalPointsToday?.toLocaleString()}</p>
                    <span className="text-xs text-green-600 font-bold bg-green-100 px-2 py-0.5 rounded-full mt-1 inline-block">+12% vs ayer</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Trophy className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-all border-l-4 border-l-purple-500/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dependientes Active</p>
                    <p className="text-2xl font-black mt-2">{stats.activeClerks}</p>
                    <span className="text-xs text-purple-600 font-bold bg-purple-100 px-2 py-0.5 rounded-full mt-1 inline-block">En Turno</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-all border-l-4 border-l-orange-500/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Validación</p>
                    <p className="text-2xl font-black mt-2">{flaggedInvoices.length}</p>
                    <span className="text-xs text-orange-600 font-bold bg-orange-100 px-2 py-0.5 rounded-full mt-1 inline-block">Pendientes</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-all border-l-4 border-l-green-500/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Farmacias</p>
                    <p className="text-2xl font-black mt-2">{stats.totalPharmacies}</p>
                    <span className="text-xs text-green-600 font-bold bg-green-100 px-2 py-0.5 rounded-full mt-1 inline-block">Activas</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts & Lists Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales Chart (2 Cols) */}
            <Card className="lg:col-span-2 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Tendencia de Puntos (7 Días)
                </CardTitle>
                <CardDescription>Puntos generados por escaneos validados</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  {/* Dynamic Chart */}
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.pointsChart || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => `${value}`}
                      />
                      <Tooltip
                        cursor={{ fill: '#f1f5f9' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar
                        dataKey="points"
                        fill="hsl(var(--primary))"
                        radius={[4, 4, 0, 0]}
                        barSize={32}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Top Clerks List (1 Col) */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-gold" />
                  Top Dependientes
                </CardTitle>
                <CardDescription>Líderes de la semana</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-50">
                  {stats.topClerks?.map((clerk, i) => (
                    <div key={clerk.id} className="p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                      <div className={`
                                    w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs
                                    ${i === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'}
                                `}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{clerk.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{clerk.pharmacyId || 'N/A'}</p>
                      </div>
                      <Badge variant="secondary" className="font-mono">{clerk.points} pts</Badge>
                    </div>
                  ))}
                  {(!stats.topClerks || stats.topClerks.length === 0) && (
                    <div className="p-8 text-center text-sm text-muted-foreground">Cargando datos...</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Row: Map & Recent */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Reusing existing Map Logic */}
            <Card className="cursor-pointer hover:shadow-md transition-shadow group overflow-hidden" onClick={() => setCurrentView('map')}>
              <CardHeader className="bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-success animate-pulse" />
                      Mapa en Vivo
                    </CardTitle>
                    <CardDescription>Visualización geográfica de escaneos</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" className="group-hover:translate-x-1 transition-transform">
                    Ver Mapa <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="relative h-64 bg-muted">
                  {/* Simplified Map Graphic for Dashboard Preview */}
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-400">
                    <Map className="w-12 h-12 opacity-20" />
                    <span className="absolute mt-16 text-xs font-medium uppercase tracking-widest text-slate-500">Vista Previa del Mapa</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity Stream */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5 text-muted-foreground" />
                  Últimos Escaneos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {stats.recentActivity?.map((activity, i) => (
                    <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        {activity.status === 'processed' ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : activity.status === 'rejected' ? (
                          <XCircle className="w-4 h-4 text-red-500" />
                        ) : (
                          <Clock className="w-4 h-4 text-yellow-500" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{activity.description}</p>
                          <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                        </div>
                      </div>
                      <span className="font-bold text-sm text-primary">{activity.points?.toLocaleString()} pts</span>
                    </div>
                  ))}
                  {(!stats.recentActivity || stats.recentActivity.length === 0) && (
                    <div className="p-4 text-center text-muted-foreground text-sm">No hay actividad reciente</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
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
          <button onClick={() => setCurrentView('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'dashboard' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'}`}>
            <BarChart3 className="h-5 w-5" /> <span className="font-medium">Dashboard</span>
          </button>
          <button onClick={() => setCurrentView('map')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'map' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'}`}>
            <Map className="h-5 w-5" /> <span className="font-medium">Mapa en Vivo</span>
          </button>
          <button onClick={() => setCurrentView('users')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'users' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'}`}>
            <Users className="h-5 w-5" /> <span className="font-medium">Usuarios</span>
          </button>
          <button onClick={() => setCurrentView('pharmacies')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'pharmacies' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'}`}>
            <Building2 className="h-5 w-5" /> <span className="font-medium">Farmacias</span>
          </button>
          <button onClick={() => setCurrentView('rewards')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'rewards' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'}`}>
            <Gift className="h-5 w-5" /> <span className="font-medium">Premios</span>
          </button>
          <button onClick={() => setCurrentView('products')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'products' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'}`}>
            <Pill className="h-5 w-5" /> <span className="font-medium">Productos (IA)</span>
          </button>
          <button onClick={() => setCurrentView('analytics')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'analytics' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'}`}>
            <TrendingUp className="h-5 w-5" /> <span className="font-medium">Analítica</span>
          </button>
          <button onClick={() => setCurrentView('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'settings' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'}`}>
            <Settings className="h-5 w-5" /> <span className="font-medium">Configuración</span>
          </button>
        </nav>

        <div className="p-4 border-t border-border">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
            <LogOut className="h-5 w-5" /> <span className="font-medium">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
