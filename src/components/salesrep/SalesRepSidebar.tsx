import { BarChart3, UserCheck, Building2, Users, MessageCircle, Trophy, Megaphone, LogOut, Pill, ChevronRight } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import { SalesRepSection } from '@/pages/SalesRepDashboard';

interface SalesRepSidebarProps {
  activeSection: SalesRepSection;
  onSectionChange: (section: SalesRepSection) => void;
}

const menuItems = [
  { id: 'dashboard' as const, label: 'Dashboard', icon: BarChart3, color: 'from-cyan-500 to-blue-500' },
  { id: 'approvals' as const, label: 'Aprobaciones', icon: UserCheck, color: 'from-amber-500 to-orange-500' },
  { id: 'pharmacies' as const, label: 'Mis Farmacias', icon: Building2, color: 'from-blue-500 to-indigo-500' },
  { id: 'team' as const, label: 'Mis Dependientes', icon: Users, color: 'from-emerald-500 to-teal-500' },
  { id: 'followup' as const, label: 'Seguimiento', icon: MessageCircle, color: 'from-violet-500 to-purple-500' },
  { id: 'performance' as const, label: 'Rendimiento', icon: Trophy, color: 'from-yellow-500 to-amber-500' },
  { id: 'campaigns' as const, label: 'Campañas', icon: Megaphone, color: 'from-pink-500 to-rose-500' },
];

export function SalesRepSidebar({ activeSection, onSectionChange }: SalesRepSidebarProps) {
  const { currentUser, logout } = useApp();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const initials = currentUser?.name
    ? currentUser.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
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
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Portal Vendedor</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative"
              style={{
                background: isActive
                  ? 'rgba(255,255,255,0.08)'
                  : 'transparent',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
              }}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full"
                  style={{ background: 'linear-gradient(180deg, #00C2E0, #0077E6)' }}
                />
              )}

              {/* Icon */}
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 ${isActive ? 'shadow-md' : 'opacity-60 group-hover:opacity-100'}`}
                style={isActive ? { background: `linear-gradient(135deg, ${item.color.replace('from-', '').replace('to-', '').replace('-500', '')})` } : { background: 'rgba(255,255,255,0.06)' }}
              >
                <Icon className="h-4 w-4 text-white" />
              </div>

              <span className="text-sm font-medium flex-1 text-left">{item.label}</span>

              {isActive && (
                <ChevronRight className="h-3.5 w-3.5 opacity-50" />
              )}
            </button>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="px-3 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        {/* User card */}
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
            <p className="text-sm font-semibold text-white truncate">{currentUser?.name || 'Usuario'}</p>
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Vendedor</p>
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
  );
}
