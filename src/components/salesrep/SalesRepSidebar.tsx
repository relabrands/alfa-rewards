import { BarChart3, UserCheck, Building2, Users, MessageCircle, Trophy, Megaphone, LogOut, Pill, ChevronRight } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import { SalesRepSection } from '@/pages/SalesRepDashboard';

interface SalesRepSidebarProps {
  activeSection: SalesRepSection;
  onSectionChange: (section: SalesRepSection) => void;
}

const BRAND = '#00C2E0';
const BRAND_DARK = '#00A8C8';

const menuItems = [
  { id: 'dashboard' as const, label: 'Dashboard', icon: BarChart3 },
  { id: 'approvals' as const, label: 'Aprobaciones', icon: UserCheck },
  { id: 'pharmacies' as const, label: 'Mis Farmacias', icon: Building2 },
  { id: 'team' as const, label: 'Mis Dependientes', icon: Users },
  { id: 'followup' as const, label: 'Seguimiento', icon: MessageCircle },
  { id: 'performance' as const, label: 'Rendimiento', icon: Trophy },
  { id: 'campaigns' as const, label: 'Campañas', icon: Megaphone },
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
            <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Portal Vendedor</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
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

      {/* User Info & Logout */}
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
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-white truncate">{currentUser?.name || 'Usuario'}</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Vendedor</p>
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
  );
}
