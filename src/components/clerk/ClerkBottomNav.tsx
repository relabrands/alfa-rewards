import { Home, Gift, User } from 'lucide-react';

interface ClerkBottomNavProps {
  activeTab: 'home' | 'rewards' | 'profile';
  onTabChange: (tab: 'home' | 'rewards' | 'profile') => void;
}

export function ClerkBottomNav({ activeTab, onTabChange }: ClerkBottomNavProps) {
  const tabs = [
    { id: 'home' as const, label: 'Inicio', icon: Home },
    { id: 'rewards' as const, label: 'Premios', icon: Gift },
    { id: 'profile' as const, label: 'Perfil', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
              <span className={`text-xs mt-1 ${isActive ? 'font-medium' : ''}`}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute bottom-1 w-8 h-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
