import { UserPlus, Users, User, LogOut, Pill, UserCheck, Building2, BarChart3, TrendingUp, Info, MessageCircle, Trophy, Megaphone } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import { SalesRepSection } from '@/pages/SalesRepDashboard';

interface SalesRepSidebarProps {
  activeSection: SalesRepSection;
  onSectionChange: (section: SalesRepSection) => void;
}

export function SalesRepSidebar({ activeSection, onSectionChange }: SalesRepSidebarProps) {
  const { currentUser, logout } = useApp();
  const navigate = useNavigate();

  const menuItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: BarChart3 },
    { id: 'approvals' as const, label: 'Aprobaciones', icon: UserCheck },
    { id: 'pharmacies' as const, label: 'Mis Farmacias', icon: Building2 },
    { id: 'team' as const, label: 'Mis Dependientes', icon: Users },
    { id: 'followup' as const, label: 'Seguimiento', icon: MessageCircle },
    { id: 'performance' as const, label: 'Rendimiento', icon: Trophy },
    { id: 'campaigns' as const, label: 'Campañas', icon: Megaphone },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
            <Pill className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-foreground">Alfa Rewards</h1>
            <p className="text-xs text-muted-foreground">Portal Visitador</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted text-foreground'
                }`}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-border space-y-4">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-bold text-primary">
              {currentUser.name.split(' ').map(n => n[0]).join('')}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium">{currentUser.name}</p>
            <p className="text-xs text-muted-foreground">Visitador</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span className="font-medium">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}
