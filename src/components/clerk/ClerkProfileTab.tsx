import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useApp } from '@/context/AppContext';
import { getLevels, getUserRedemptionRequests, getAllUserScans } from '@/lib/db';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { User, MapPin, LogOut, Coins, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LevelConfig } from '@/lib/types';
import { ClerkHistoryView } from './ClerkHistoryView';

export function ClerkProfileTab() {
  const { currentUser, points, logout } = useApp();
  const navigate = useNavigate();
  const [pharmacyName, setPharmacyName] = useState<string>('Cargando...');
  const [showInfo, setShowInfo] = useState(false);
  const [showPharmacyInfo, setShowPharmacyInfo] = useState(false);
  const [lifetimePoints, setLifetimePoints] = useState(0);
  const [scanCount, setScanCount] = useState(0);

  // Level State
  const [levels, setLevels] = useState<LevelConfig[]>([]);
  const [currentLevelConfig, setCurrentLevelConfig] = useState<LevelConfig | null>(null);
  const [nextLevelConfig, setNextLevelConfig] = useState<LevelConfig | null>(null);

  useEffect(() => {
    const loadData = async () => {
      // Load Levels
      try {
        const levelsData = await getLevels();
        setLevels(levelsData);

        // Calculate Level
        // Sort levels by minPoints ascending just in case
        const sorted = levelsData.sort((a, b) => a.minPoints - b.minPoints);

        // Calculate Lifetime Points
        // We need to fetch redemptions first to know total points for level
        let redemptionsData: any[] = [];
        let scansData: any[] = [];
        try {
          [redemptionsData, scansData] = await Promise.all([
            getUserRedemptionRequests(currentUser.id),
            getAllUserScans(currentUser.id)
          ]);
        } catch (e) { console.error(e); }

        setScanCount(scansData.length);

        const totalRedeemed = redemptionsData.reduce((acc, r) => acc + (r.pointsCost || 0), 0);
        const calculatedLifetimePoints = points + totalRedeemed;
        setLifetimePoints(calculatedLifetimePoints);

        // Find current level (highest level where user calculatedLifetimePoints >= minPoints)
        let current = null;
        for (const l of sorted) {
          if (calculatedLifetimePoints >= l.minPoints) {
            current = l;
          } else {
            break;
          }
        }
        setCurrentLevelConfig(current);

        // Find next level
        const next = sorted.find(l => l.minPoints > calculatedLifetimePoints);
        setNextLevelConfig(next || null);

      } catch (error) {
        console.error("Error loading levels", error);
      }

      // Load Pharmacy
      if (currentUser?.pharmacyId) {
        try {
          const pharDoc = await getDoc(doc(db, 'pharmacies', currentUser.pharmacyId));
          if (pharDoc.exists()) {
            const data = pharDoc.data();
            setPharmacyName(`${data.name} ${data.sector ? `- ${data.sector}` : ''}`);
          } else {
            setPharmacyName('Desconocida');
          }
        } catch (e) {
          console.error("Error loading pharmacy", e);
          setPharmacyName('Error loading');
        }
      } else {
        setPharmacyName('No asignada');
      }
    };

    if (currentUser) {
      loadData();
    }
  }, [currentUser, currentUser?.id, currentUser?.pharmacyId, points]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!currentUser) return <div>Cargando...</div>;

  return (
    <div className="min-h-screen bg-background pb-24 pt-4">
      <div className="px-4 space-y-6 max-w-md mx-auto">
        {/* Profile Header - Clean & Centered */}
        <div className="flex flex-col items-center pt-8 pb-6">
          <div className="relative mb-4 group">
            <div className="absolute -inset-1 bg-gradient-to-tr from-primary to-blue-400 rounded-full blur opacity-40 group-hover:opacity-60 transition duration-500"></div>
            <Avatar className="w-28 h-28 relative ring-4 ring-white shadow-xl">
              <AvatarFallback className="bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 text-4xl font-black">
                {currentUser.name ? currentUser.name.split(' ').map(n => n[0]).join('') : 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="absolute bottom-1 right-1 bg-green-500 w-6 h-6 rounded-full border-4 border-white shadow-sm" />
          </div>

          <h1 className="text-2xl font-bold text-foreground mt-2">{currentUser.name} {currentUser.lastName || ''}</h1>
          <div className="flex flex-col items-center gap-1 mt-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground bg-slate-100 px-3 py-0.5 rounded-full">
              Dependiente
            </span>
            <p className="text-sm font-medium text-primary">
              {pharmacyName}
            </p>
          </div>
        </div>

        {/* Stats Row - Gamified (Restored to 3 columns) */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white p-3 rounded-[1.5rem] shadow-sm border border-slate-50 flex flex-col items-center justify-center min-h-[100px] hover:shadow-md transition-all group">
            <div className="flex items-center gap-1">
              <span className="text-2xl font-black text-[#FFD700] drop-shadow-sm">{points.toLocaleString()}</span>
              <Coins className="w-4 h-4 text-[#FFD700]" />
            </div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground mt-1 tracking-wide group-hover:text-[#FFD700] transition-colors">Coins</span>
          </div>

          <div className="bg-white p-3 rounded-[1.5rem] shadow-sm border border-slate-50 flex flex-col items-center justify-center min-h-[100px] hover:shadow-md transition-all">
            <span className="text-2xl font-black text-primary">{scanCount}</span>
            <span className="text-[10px] uppercase font-bold text-muted-foreground mt-1 tracking-wide">Escaneos</span>
          </div>

          <div className="bg-white p-3 rounded-[1.5rem] shadow-sm border border-slate-50 flex flex-col items-center justify-center min-h-[100px] hover:shadow-md transition-all">
            {currentLevelConfig ? (
              <>
                <div className="text-xl mb-1">{currentLevelConfig.rewardImage || '⭐'}</div>
                <span className="font-bold text-xs text-primary truncate w-full text-center">{currentLevelConfig.name}</span>
              </>
            ) : (
              <>
                <span className="text-2xl font-black text-slate-400">1</span>
              </>
            )}
            <span className="text-[10px] uppercase font-bold text-muted-foreground mt-1 tracking-wide">Nivel</span>
          </div>
        </div>

        {/* Level Progress Bar */}
        {nextLevelConfig && (
          <div className="mb-6 bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-50 relative overflow-hidden">
            <div className="flex justify-between items-end mb-2">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Próximo Nivel</p>
                <p className="font-bold text-lg text-primary flex items-center gap-2">
                  {nextLevelConfig.name}
                  <span className="text-sm font-normal text-muted-foreground">({nextLevelConfig.minPoints.toLocaleString()} pts)</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-0.5">Bono por Nivel</p>
                <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full block mb-1">
                  {nextLevelConfig.rewardDescription || 'Recompensa Sorpresa'}
                </span>
                <span className="text-xs font-bold text-primary">
                  {Math.floor(Math.min(100, Math.max(0, ((lifetimePoints - (currentLevelConfig?.minPoints || 0)) / (nextLevelConfig.minPoints - (currentLevelConfig?.minPoints || 0))) * 100)))}%
                </span>
              </div>
            </div>

            <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-blue-400 transition-all duration-1000 ease-out relative"
                style={{ width: `${Math.min(100, Math.max(0, ((lifetimePoints - (currentLevelConfig?.minPoints || 0)) / (nextLevelConfig.minPoints - (currentLevelConfig?.minPoints || 0))) * 100))}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
            <p className="text-xs text-center mt-2 text-muted-foreground">
              Faltan <span className="font-bold text-foreground">{(nextLevelConfig.minPoints - lifetimePoints).toLocaleString()}</span> puntos para subir de nivel
            </p>
          </div>
        )}

        {/* Menu Options - Interactive */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-50 overflow-hidden divide-y divide-slate-50">
          {/* Personal Info Group */}
          <div
            className="p-4 hover:bg-slate-50 transition-colors cursor-pointer"
            onClick={() => setShowInfo(!showInfo)}
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                <User className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm text-foreground">Información Personal</h4>
                <p className="text-xs text-muted-foreground">Ver detalles de la cuenta</p>
              </div>
              {showInfo ? <ChevronUp className="w-5 h-5 text-slate-300" /> : <ChevronDown className="w-5 h-5 text-slate-300" />}
            </div>

            {showInfo && (
              <div className="mt-4 pl-14 space-y-2 text-sm animate-in slide-in-from-top-2 fade-in duration-200">
                <div>
                  <span className="text-xs text-muted-foreground block">Cédula</span>
                  <span className="font-medium text-foreground">{currentUser.cedula || 'No registrada'}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Teléfono</span>
                  <span className="font-medium text-foreground">{currentUser.phone || 'No registrado'}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Email</span>
                  <span className="font-medium text-foreground">{currentUser.email || 'No registrado'}</span>
                </div>
              </div>
            )}
          </div>

          <div
            className="p-4 hover:bg-slate-50 transition-colors cursor-pointer"
            onClick={() => setShowPharmacyInfo(!showPharmacyInfo)}
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-500">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm text-foreground">Mi Farmacia</h4>
                <p className="text-xs text-muted-foreground">{pharmacyName}</p>
              </div>
              {showPharmacyInfo ? <ChevronUp className="w-5 h-5 text-slate-300" /> : <ChevronDown className="w-5 h-5 text-slate-300" />}
            </div>

            {showPharmacyInfo && (
              <div className="mt-4 pl-14 space-y-2 text-sm animate-in slide-in-from-top-2 fade-in duration-200">
                <div>
                  <span className="text-xs text-muted-foreground block">Nombre</span>
                  <span className="font-medium text-foreground">{pharmacyName}</span>
                </div>
                {/* Add more pharmacy details here if available in context/fetch */}
                <div>
                  <span className="text-xs text-muted-foreground block">ID Farmacia</span>
                  <span className="font-mono text-xs text-slate-400">{currentUser.pharmacyId || 'N/A'}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Embedded History */}
        <ClerkHistoryView />

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full mt-2 py-4 rounded-xl flex items-center justify-center gap-2 text-red-500 font-bold hover:bg-red-50 transition-colors mb-20"
        >
          <LogOut className="w-5 h-5" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
}
