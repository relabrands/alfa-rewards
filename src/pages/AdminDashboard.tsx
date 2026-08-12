import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { ScanRecord, DashboardStats } from '@/lib/types';
import { getAdminStats, getFlaggedScans } from '@/lib/db';
import {
  Map, Users, TrendingUp, CheckCircle2, XCircle, Trophy,
  AlertTriangle, Settings, LogOut, Pill, BarChart3, Building2, Gift, Clock,
  FileText, ChevronRight, ShieldCheck
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

const BRAND = '#00C2E0';
const BRAND_DARK = '#00A8C8';

const NAV_ITEMS = [
  { view: 'dashboard' as const, label: 'Dashboard', icon: BarChart3 },
  { view: 'invoices' as const, label: 'Facturas', icon: FileText },
  { view: 'map' as const, label: 'Mapa en Vivo', icon: Map },
  { view: 'users' as const, label: 'Usuarios', icon: Users },
  { view: 'pharmacies' as const, label: 'Farmacias', icon: Building2 },
  { view: 'rewards' as const, label: 'Premios', icon: Gift },
  { view: 'products' as const, label: 'Productos', icon: Pill },
  { view: 'levels' as const, label: 'Niveles', icon: Trophy },
  { view: 'analytics' as const, label: 'Analítica', icon: TrendingUp },
  { view: 'settings' as const, label: 'Configuración', icon: Settings },
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
    <div className="min-h-screen flex" style={{ background: '#f4f6f9' }}>
      {/* Sidebar */}
      <aside
        className="w-60 flex flex-col h-screen sticky top-0 shrink-0"
        style={{
          background: '#0d1117',
          borderRight: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {/* Logo */}
        <div className="px-5 pt-6 pb-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}
            >
              <Pill style={{ width: '18px', height: '18px', color: 'white' }} />
            </div>
            <div>
              <h1 className="font-semibold text-white text-sm leading-tight">Alfa Rewards</h1>
              <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Panel Director</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.view;
            return (
              <button
                key={item.view}
                onClick={() => setCurrentView(item.view)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150"
                style={{
                  background: isActive ? 'rgba(0,194,224,0.12)' : 'transparent',
                  color: isActive ? BRAND : 'rgba(255,255,255,0.45)',
                }}
              >
                <Icon style={{ width: '15px', height: '15px', flexShrink: 0 }} />
                <span className="text-[13px] font-medium flex-1 text-left">{item.label}</span>
                {isActive && <ChevronRight style={{ width: '13px', height: '13px', opacity: 0.5 }} />}
              </button>
            );
          })}
        </nav>

        {/* User & Logout */}
        <div className="px-2 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-1"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white"
              style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-white truncate">{currentUser?.name || 'Admin'}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <ShieldCheck style={{ width: '11px', height: '11px', color: BRAND }} />
                <p className="text-[10px] font-medium" style={{ color: BRAND }}>Director</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 text-[13px] font-medium"
            style={{ color: 'rgba(255,100,100,0.65)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <LogOut style={{ width: '15px', height: '15px' }} />
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

// ─── Dashboard Overview ──────────────────────────────────────────────────────
function AdminOverview({ stats, flaggedInvoices, loading, setCurrentView }: {
  stats: DashboardStats;
  flaggedInvoices: ScanRecord[];
  loading: boolean;
  setCurrentView: (v: AdminView) => void;
}) {
  const { toast } = useToast();

  const kpiCards = [
    {
      label: 'Puntos Hoy',
      value: loading ? '—' : stats.totalPointsToday?.toLocaleString(),
      sub: stats.roi,
      icon: Trophy,
      accent: '#00C2E0',
      accentBg: 'rgba(0,194,224,0.08)',
    },
    {
      label: 'Dependientes Activos',
      value: loading ? '—' : stats.activeClerks,
      sub: 'En turno',
      icon: Users,
      accent: '#10b981',
      accentBg: 'rgba(16,185,129,0.08)',
    },
    {
      label: 'Facturas en Revisión',
      value: loading ? '—' : flaggedInvoices.length,
      sub: flaggedInvoices.length === 0 ? 'Al día' : 'Pendientes',
      icon: AlertTriangle,
      accent: flaggedInvoices.length > 0 ? '#f59e0b' : '#10b981',
      accentBg: flaggedInvoices.length > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)',
    },
    {
      label: 'Farmacias Activas',
      value: loading ? '—' : stats.totalPharmacies,
      sub: 'Registradas',
      icon: Building2,
      accent: '#00C2E0',
      accentBg: 'rgba(0,194,224,0.08)',
    },
  ];

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: '#0d1117' }}>Dashboard</h1>
          <p className="text-sm mt-0.5" style={{ color: '#94a3b8' }}>
            {new Date().toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div
          className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border"
          style={{ borderColor: 'rgba(0,194,224,0.3)', color: '#00C2E0', background: 'rgba(0,194,224,0.06)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00C2E0' }} />
          En vivo
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="rounded-xl p-5 border bg-white transition-all duration-200 hover:shadow-md"
              style={{ borderColor: '#e8edf2' }}
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: card.accentBg }}
                >
                  <Icon style={{ width: '17px', height: '17px', color: card.accent }} />
                </div>
                <span className="text-[11px] font-medium" style={{ color: card.accent }}>
                  {card.sub}
                </span>
              </div>
              <p className="text-[11px] font-medium uppercase tracking-wider mb-1" style={{ color: '#94a3b8' }}>{card.label}</p>
              {loading ? (
                <div className="h-7 w-16 bg-slate-100 rounded-md animate-pulse" />
              ) : (
                <p className="text-2xl font-bold" style={{ color: '#0d1117' }}>{card.value}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Bar Chart */}
        <div className="lg:col-span-2 rounded-xl border bg-white p-5" style={{ borderColor: '#e8edf2' }}>
          <div className="mb-5">
            <p className="text-sm font-semibold" style={{ color: '#0d1117' }}>Tendencia de Puntos</p>
            <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>Últimos 7 días</p>
          </div>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.pointsChart || []} barSize={22}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f3f6" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#b0bec5' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#b0bec5' }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(0,194,224,0.04)' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e8edf2', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', fontSize: '12px' }}
                />
                <Bar dataKey="points" fill="url(#brandGradient)" radius={[4, 4, 0, 0]} />
                <defs>
                  <linearGradient id="brandGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00C2E0" />
                    <stop offset="100%" stopColor="#00A8C8" stopOpacity="0.7" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Clerks */}
        <div className="rounded-xl border bg-white overflow-hidden" style={{ borderColor: '#e8edf2' }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: '#f0f3f6' }}>
            <p className="text-sm font-semibold" style={{ color: '#0d1117' }}>Top Dependientes</p>
            <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>Por puntos acumulados</p>
          </div>
          <div>
            {stats.topClerks?.map((clerk, i) => (
              <div key={clerk.id} className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors border-b" style={{ borderColor: '#f0f3f6' }}>
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                  style={{
                    background: i === 0 ? 'rgba(0,194,224,0.12)' : 'rgba(148,163,184,0.1)',
                    color: i === 0 ? '#00C2E0' : '#94a3b8',
                  }}
                >
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate" style={{ color: '#0d1117' }}>{clerk.name}</p>
                  <p className="text-[11px] truncate" style={{ color: '#94a3b8' }}>{clerk.pharmacyId || 'N/A'}</p>
                </div>
                <span className="text-xs font-mono font-semibold" style={{ color: '#00C2E0' }}>
                  {clerk.lifetimePoints?.toLocaleString()}
                </span>
              </div>
            ))}
            {(!stats.topClerks || stats.topClerks.length === 0) && (
              <div className="p-8 text-center text-sm" style={{ color: '#94a3b8' }}>
                {loading ? 'Cargando...' : 'Sin datos aún'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Map Preview */}
        <div
          className="rounded-xl border bg-white cursor-pointer hover:shadow-md transition-all overflow-hidden"
          style={{ borderColor: '#e8edf2' }}
          onClick={() => setCurrentView('map')}
        >
          <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: '#f0f3f6' }}>
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#10b981' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: '#0d1117' }}>Mapa en Vivo</p>
                <p className="text-xs" style={{ color: '#94a3b8' }}>Actividad geográfica en tiempo real</p>
              </div>
            </div>
            <ChevronRight style={{ width: '15px', height: '15px', color: '#94a3b8' }} />
          </div>
          <div className="h-48 flex items-center justify-center" style={{ background: '#f8fafc' }}>
            <div className="text-center">
              <Map style={{ width: '36px', height: '36px', margin: '0 auto 8px', color: '#cbd5e1' }} />
              <p className="text-xs" style={{ color: '#94a3b8' }}>Haz clic para ver el mapa</p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl border bg-white overflow-hidden" style={{ borderColor: '#e8edf2' }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: '#f0f3f6' }}>
            <p className="text-sm font-semibold" style={{ color: '#0d1117' }}>Actividad Reciente</p>
            <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>Últimos escaneos procesados</p>
          </div>
          <div>
            {stats.recentActivity?.map((activity, i) => (
              <div key={i} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors border-b" style={{ borderColor: '#f0f3f6' }}>
                <div className="flex items-center gap-3">
                  {activity.status === 'processed' ? (
                    <CheckCircle2 style={{ width: '14px', height: '14px', color: '#10b981', flexShrink: 0 }} />
                  ) : activity.status === 'rejected' ? (
                    <XCircle style={{ width: '14px', height: '14px', color: '#f87171', flexShrink: 0 }} />
                  ) : (
                    <Clock style={{ width: '14px', height: '14px', color: '#fbbf24', flexShrink: 0 }} />
                  )}
                  <div>
                    <p className="text-[13px] font-medium" style={{ color: '#0d1117' }}>{activity.description}</p>
                    <p className="text-[11px]" style={{ color: '#94a3b8' }}>{activity.timestamp}</p>
                  </div>
                </div>
                <span className="text-xs font-semibold font-mono" style={{ color: '#00C2E0' }}>
                  {activity.points?.toLocaleString()} pts
                </span>
              </div>
            ))}
            {(!stats.recentActivity || stats.recentActivity.length === 0) && (
              <div className="p-8 text-center text-sm" style={{ color: '#94a3b8' }}>
                {loading ? 'Cargando...' : 'Sin actividad reciente'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
