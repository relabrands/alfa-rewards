import React, { createContext, useContext, useState, ReactNode } from 'react';
import { UserRole, mockUsers, User, pharmacies } from '@/lib/mockData';

interface AppState {
  isAuthenticated: boolean;
  currentRole: UserRole;
  currentUser: User;
  campaignMode: 'points' | 'roulette';
  points: number;
}

interface AppContextType extends AppState {
  login: (role: UserRole, identifier: string) => void;
  logout: () => void;
  setCampaignMode: (mode: 'points' | 'roulette') => void;
  addPoints: (amount: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const defaultUser: User = {
  id: 'guest',
  name: 'Invitado',
  role: 'clerk',
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    isAuthenticated: false,
    currentRole: 'clerk',
    currentUser: defaultUser,
    campaignMode: 'points',
    points: 5400,
  });

  const login = (role: UserRole, identifier: string) => {
    let user: User;
    
    if (role === 'clerk') {
      user = {
        id: identifier,
        name: 'María García',
        role: 'clerk',
        points: 5400,
        pharmacyId: 'ph1',
        phone: '809-555-1234',
      };
    } else if (role === 'salesRep') {
      user = {
        id: identifier,
        name: 'Carlos Méndez',
        role: 'salesRep',
        phone: '809-555-5678',
      };
    } else {
      user = {
        id: identifier,
        name: 'Roberto Sánchez',
        role: role,
        phone: '809-555-3456',
      };
    }

    setState(prev => ({
      ...prev,
      isAuthenticated: true,
      currentRole: role,
      currentUser: user,
    }));
  };

  const logout = () => {
    setState({
      isAuthenticated: false,
      currentRole: 'clerk',
      currentUser: defaultUser,
      campaignMode: 'points',
      points: 5400,
    });
  };

  const setCampaignMode = (mode: 'points' | 'roulette') => {
    setState(prev => ({ ...prev, campaignMode: mode }));
  };

  const addPoints = (amount: number) => {
    setState(prev => ({ ...prev, points: prev.points + amount }));
  };

  return (
    <AppContext.Provider value={{ ...state, login, logout, setCampaignMode, addPoints }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
