import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserRole, User } from '@/lib/types';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User as FirebaseUser } from 'firebase/auth';
import { getUserProfile } from '@/lib/db';

interface AppState {
  isAuthenticated: boolean;
  currentRole: UserRole;
  currentUser: User | null;
  campaignMode: 'points' | 'roulette';
  points: number;
  isLoading: boolean;
}

interface AppContextType extends AppState {
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  setCampaignMode: (mode: 'points' | 'roulette') => void;
  addPoints: (amount: number) => void;
  isActive: boolean;
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
    currentUser: null,
    campaignMode: 'points',
    points: 0,
    isLoading: true,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userProfile = await getUserProfile(firebaseUser.uid);

          if (userProfile) {
            setState(prev => ({
              ...prev,
              isAuthenticated: true,
              currentUser: userProfile,
              currentRole: userProfile.role,
              points: userProfile.points || 0,
              isLoading: false,
            }));
          } else {
            // User exists in Auth but not in Firestore (should not happen in normal flow)
            console.error("User profile not found in Firestore");
            setState(prev => ({
              ...prev,
              isAuthenticated: true,
              currentUser: { id: firebaseUser.uid, name: firebaseUser.email || 'User', role: 'clerk' }, // Fallback
              isLoading: false,
            }));
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } else {
        setState(prev => ({
          ...prev,
          isAuthenticated: false,
          currentRole: 'clerk',
          currentUser: null,
          points: 0,
          isLoading: false,
        }));
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
    // User state update handled by onAuthStateChanged
  };

  const logout = async () => {
    await signOut(auth);
    // User state update handled by onAuthStateChanged
  };

  const setCampaignMode = (mode: 'points' | 'roulette') => {
    setState(prev => ({ ...prev, campaignMode: mode }));
  };

  const addPoints = (amount: number) => {
    setState(prev => ({ ...prev, points: prev.points + amount }));
  };

  return (
    <AppContext.Provider value={{
      ...state,
      login,
      logout,
      setCampaignMode,
      addPoints,
      isActive: state.currentUser?.status === 'active'
    }}>
      {!state.isLoading && children}
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
