import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/context/AppContext';
import { ScanRecord, DashboardStats } from '@/lib/types';
import { getAdminStats, getFlaggedScans } from '@/lib/db';
import {
  Map, Users, TrendingUp, CheckCircle2, XCircle, Trophy, History,
  AlertTriangle, Settings, LogOut, Pill, BarChart3, Activity, Building2, Gift, Clock,
  FileText, ChevronRight, Zap, ShieldCheck
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
import AdminLevels from '@/components/admin/AdminLevels';
import AdminInvoices from '@/components/admin/AdminInvoices';

type AdminView = 'dashboard' | 'map' | 'users' | 'pharmacies' | 'settings' | 'rewards' | 'products' | 'analytics' | 'levels' | 'invoices';

const NAV_ITEMS = [
  { view: 'dashboard' as const, label: 'Dashboard', icon: BarChart3, color: 'from-cyan-500 to-blue-500' },
  { view: 'invoices' as const, label: 'Facturas', icon: FileText, color: 'from-amber-500 to-orange-500' },
  { view: 'map' as const, label: 'Mapa en Vivo', icon: Map, color: 'from-emerald-500 to-teal-500' },
  { view: 'users' as const, label: 'Usuarios', icon: Users, color: 'from-blue-500 to-indigo-500' },
  { view: 'pharmacies' as const, label: 'Farmacias', icon: Building2, color: 'from-violet-500 to-purple-500' },
  { view: 'rewards' as const, label: 'Premios', icon: Gift, color: 'from-pink-500 to-rose-500' },
  { view: 'products' as const, label: 'Productos (IA)', icon: Pill, color: 'from-lime-500 to-green-500' },
  { view: 'levels' as const, label: 'Niveles', icon: Trophy, color: 'from-yellow-500 to-amber-500' },
  { view: 'analytics' as const, label: 'Analítica', icon: TrendingUp, color: 'from-orange-500 to-red-500' },
  { view: 'settings' as const, label: 'Configuración', icon: Settings, color: 'from-slate-500 to-slate-600' },
];

export default function AdminDashboard() {
  const { logout, currentUser } = useApp();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');

  const [stats, setStats] = useState<DashboardStats>({
    totalPointsToday: 0,
    totalPointsTodayFormatted: '0',
    activeClerks: 0,
    totalPharmacies: 0,
    roi: '0%'
  });
  const [flaggedInvoices, setFlaggedInvoices] = useState<ScanRecord[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (currentView === 'dashboard') {
      setLoadingStats(true);
      const loadDashboardData = async () => {
        try {
          const data = await getAdminStats();
          setStats(data);
          const flagged = await getFlaggedScans();
          setFlaggedInvoices(flagged);
        } catch (error) {
          console.error("Error loading admin stats:", error);
        } finally {
          setLoadingStats(false);
        }
      };
      loadDashboardData();
    }
  }, [currentView]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const initials = currentUser?.name
    ? currentUser.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'A';

  const renderContent = () => {
    switch (currentView) {
      case 'map': return <DirectorMapAnalytics />;
      case 'users': return <AdminUsers />;
      case 'pharmacies': return <AdminPharmacies />;
      case 'rewards': return <AdminRewards />;
      case 'products': return <AdminProducts />;
      case 'analytics': return <AdminClerkPerformance />;
      case 'levels': return <AdminLevels />;
      case 'invoices': return <AdminInvoices />;
      case 'settings': return <AdminSettings />;
      default: return <AdminOverview stats={stats} flaggedInvoices={flaggedInvoices} loading={loadingStats} setCurrentView={setCurrentView} />;
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'hsl(210 20% 97%)' }}>
      {/* Sidebar */}
      <aside
        className="w-64 flex flex-col h-screen sticky top-0 shrink-0"
        style={{
          background: 'linear-gradient(180deg, hsl(220 25% 10%) 0%, hsl(218 28% 8%) 100%)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Logo */}
        <div className="px-5 py-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shrink-0"
              style={{ background: 'linear-gradient(135deg, #00C2E0, #0077E6)' }}
            >
              <Pill className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white text-sm leading-tight">Alfa Rewards</h1>
              <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Panel Director</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.view;
            return (
              <button
                key={item.view}
                onClick={() => setCurrentView(item.view)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative"
                style={{
                  background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                }}
              >
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full"
                    style={{ background: 'linear-gradient(180deg, #00C2E0, #0077E6)' }}
                  />
                )}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200"
                  style={isActive
                    ? { background: 'rgba(255,255,255,0.15)' }
                    : { background: 'rgba(255,255,255,0.06)' }
                  }
                >
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
                {isActive && <ChevronRight className="h-3.5 w-3.5 opacity-40" />}
              </button>
            );
          })}
        </nav>

        {/* User & Logout */}
        <div className="px-3 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div
            className="flex items-center gap-3 px-3 py-3 rounded-xl mb-2"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #00C2E0, #0077E6)' }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{currentUser?.name || 'Admin'}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <ShieldCheck className="h-3 w-3 text-cyan-400" />
                <p className="text-[11px] text-cyan-400 font-medium">Director</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium"
            style={{ color: 'rgba(255,80,80,0.75)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <LogOut className="h-4 w-4" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 lg:p-8">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

// ─── Dashboard Overview (extracted for clarity) ────────────────────────────
function AdminOverview({ stats, flaggedInvoices, loading, setCurrentView }: {
  stats: DashboardStats;
  flaggedInvoices: ScanRecord[];
  loading: boolean;
  setCurrentView: (v: AdminView) => void;
}) {
  const { toast } = useToast();

  const handleApprove = (id: string) => {
    toast({ title: '✅ Factura Aprobada', description: 'Los puntos han sido acreditados' });
  };
  const handleReject = (id: string) => {
    toast({ title: '❌ Factura Rechazada', description: 'Se ha notificado al dependiente', variant: 'destructive' });
  };

  const kpiCards = [
    {
      label: 'Puntos Hoy',
      value: loading ? '—' : stats.totalPointsToday?.toLocaleString(),
      badge: stats.roi,
      badgePositive: !stats.roi.startsWith('-'),
      icon: Trophy,
      gradient: 'linear-gradient(135deg,#f59e0b,#d97706)',
      glow: 'rgba(245,158,11,0.2)',
    },
    {
      label: 'Dependientes Activos',
      value: loading ? '—' : stats.activeClerks,
      badge: 'En Turno',
      badgePositive: true,
      icon: Users,
      gradient: 'linear-gradient(135deg,#8b5cf6,#7c3aed)',
      glow: 'rgba(139,92,246,0.2)',
    },
    {
      label: 'Facturas en Validación',
      value: loading ? '—' : flaggedInvoices.length,
      badge: 'Pendientes',
      badgePositive: flaggedInvoices.length === 0,
      icon: AlertTriangle,
      gradient: 'linear-gradient(135deg,#f97316,#ea580c)',
      glow: 'rgba(249,115,22,0.2)',
    },
    {
      label: 'Farmacias Activas',
      value: loading ? '—' : stats.totalPharmacies,
      badge: 'Total',
      badgePositive: true,
      icon: Building2,
      gradient: 'linear-gradient(135deg,#10b981,#059669)',
      glow: 'rgba(16,185,129,0.2)',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard Director</h1>
          <p className="text-muted-foreground mt-1">
            {new Date().toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium self-start"
          style={{ background: 'rgba(16,185,129,0.07)', borderColor: 'rgba(16,185,129,0.25)', color: '#059669' }}
        >
          <Zap className="h-4 w-4" />
          Actualizado: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpiCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="rounded-2xl p-5 border bg-white transition-all duration-300 hover:-translate-y-0.5"
              style={{ borderColor: 'hsl(210 20% 92%)', boxShadow: `0 4px 20px ${card.glow}` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shadow"
                  style={{ background: card.gradient }}
                >
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    background: card.badgePositive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    color: card.badgePositive ? '#059669' : '#dc2626',
                  }}
                >
                  {card.badge}
                </span>
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">{card.label}</p>
              {loading ? (
                <div className="h-8 w-20 bg-slate-100 rounded animate-pulse" />
              ) : (
                <p className="text-3xl font-bold text-foreground">{card.value}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart */}
        <Card className="lg:col-span-2 rounded-2xl border shadow-sm" style={{ borderColor: 'hsl(210 20% 92%)' }}>
          <CardHeader className="border-b pb-4" style={{ borderColor: 'hsl(210 20% 92%)' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
                <BarChart3 className="h-4 w-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-base">Tendencia de Puntos (7 Días)</CardTitle>
                <CardDescription className="text-xs">Puntos por escaneos validados</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.pointsChart || []} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(210 20% 94%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(99,102,241,0.05)' }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid hsl(210 20% 92%)', boxShadow: '0 10px 25px rgba(0,0,0,0.08)' }}
                  />
                  <Bar dataKey="points" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Clerks */}
        <Card className="rounded-2xl border shadow-sm overflow-hidden" style={{ borderColor: 'hsl(210 20% 92%)' }}>
          <CardHeader className="border-b pb-4" style={{ borderColor: 'hsl(210 20% 92%)' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
                <Trophy className="h-4 w-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-base">Top Dependientes</CardTitle>
                <CardDescription className="text-xs">Líderes por puntos históricos</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y" style={{ borderColor: 'hsl(210 20% 94%)' }}>
              {stats.topClerks?.map((clerk, i) => (
                <div key={clerk.id} className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 text-white"
                    style={{
                      background: i === 0
                        ? 'linear-gradient(135deg,#f59e0b,#d97706)'
                        : i === 1
                        ? 'linear-gradient(135deg,#9ca3af,#6b7280)'
                        : i === 2
                        ? 'linear-gradient(135deg,#d97706,#b45309)'
                        : 'linear-gradient(135deg,#e2e8f0,#cbd5e1)',
                      color: i >= 3 ? '#64748b' : '#fff',
                    }}
                  >
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{clerk.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{clerk.pharmacyId || 'N/A'}</p>
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs shrink-0">
                    {clerk.lifetimePoints?.toLocaleString()} pts
                  </Badge>
                </div>
              ))}
              {(!stats.topClerks || stats.topClerks.length === 0) && (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  {loading ? 'Cargando...' : 'Sin datos aún'}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Map Preview */}
        <div
          className="rounded-2xl border bg-white cursor-pointer hover:shadow-md transition-all group overflow-hidden"
          style={{ borderColor: 'hsl(210 20% 92%)' }}
          onClick={() => setCurrentView('map')}
        >
          <div className="p-5 flex items-center justify-between border-b" style={{ borderColor: 'hsl(210 20% 92%)' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                <Activity className="h-4 w-4 text-white animate-pulse" />
              </div>
              <div>
                <p className="font-semibold text-sm">Mapa en Vivo</p>
                <p className="text-xs text-muted-foreground">Visualización geográfica</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="gap-1 text-xs group-hover:gap-2 transition-all">
              Ver Mapa <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="h-52 flex items-center justify-center" style={{ background: 'hsl(210 20% 97%)' }}>
            <div className="text-center">
              <Map className="h-12 w-12 mx-auto mb-2 text-slate-300" />
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Vista Previa del Mapa</p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <Card className="rounded-2xl border shadow-sm overflow-hidden" style={{ borderColor: 'hsl(210 20% 92%)' }}>
          <CardHeader className="border-b pb-4" style={{ borderColor: 'hsl(210 20% 92%)' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#64748b,#475569)' }}>
                <History className="h-4 w-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-base">Últimos Escaneos</CardTitle>
                <CardDescription className="text-xs">Actividad reciente del sistema</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y" style={{ borderColor: 'hsl(210 20% 94%)' }}>
              {stats.recentActivity?.map((activity, i) => (
                <div key={i} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    {activity.status === 'processed' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : activity.status === 'rejected' ? (
                      <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                    </div>
                  </div>
                  <span className="font-bold text-sm text-blue-600">{activity.points?.toLocaleString()} pts</span>
                </div>
              ))}
              {(!stats.recentActivity || stats.recentActivity.length === 0) && (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  {loading ? 'Cargando...' : 'No hay actividad reciente'}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
