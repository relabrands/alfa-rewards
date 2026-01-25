import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useApp } from '@/context/AppContext';
// import { pharmacies } from '@/lib/constants'; // Removed static
import { ScanRecord } from '@/lib/types';
import { getScanHistory } from '@/lib/db';
import { db } from '@/lib/firebase'; // Added
import { doc, getDoc } from 'firebase/firestore'; // Added
import { User, Phone, MapPin, History, LogOut, ChevronRight, CheckCircle2, Clock, AlertCircle, Coins, ChevronDown, ChevronUp, XCircle, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { updateDoc } from 'firebase/firestore'; // Re-added for reset

export function ClerkProfileTab() {
  const { currentUser, points, logout } = useApp();
  const navigate = useNavigate();
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [pharmacyName, setPharmacyName] = useState<string>('Cargando...');
  const [showInfo, setShowInfo] = useState(false);
  const [showPharmacyInfo, setShowPharmacyInfo] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (currentUser?.id) {
        // Load History
        const scans = await getScanHistory(currentUser.id);
        setHistory(scans);
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
  }, [currentUser, currentUser?.id, currentUser?.pharmacyId]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processed':
      case 'approved':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'pending':
      case 'pending_review':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-slate-300" />;
    }
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

        {/* Stats Row - Gamified */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white p-3 rounded-[1.5rem] shadow-sm border border-slate-50 flex flex-col items-center justify-center min-h-[100px] hover:shadow-md transition-all group">
            <div className="flex items-center gap-1">
              <span className="text-2xl font-black text-[#FFD700] drop-shadow-sm">{points.toLocaleString()}</span>
              <Coins className="w-4 h-4 text-[#FFD700]" />
            </div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground mt-1 tracking-wide group-hover:text-[#FFD700] transition-colors">Coins</span>
          </div>

          <div className="bg-white p-3 rounded-[1.5rem] shadow-sm border border-slate-50 flex flex-col items-center justify-center min-h-[100px] hover:shadow-md transition-all">
            <span className="text-2xl font-black text-primary">{history.length}</span>
            <span className="text-[10px] uppercase font-bold text-muted-foreground mt-1 tracking-wide">Escaneos</span>
          </div>

          <div className="bg-white p-3 rounded-[1.5rem] shadow-sm border border-slate-50 flex flex-col items-center justify-center min-h-[100px] hover:shadow-md transition-all">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mb-1">
              <span className="text-slate-400 text-xs font-bold">Nvl {Math.floor(points / 1000) + 1}</span>
            </div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground mt-1 tracking-wide">Nivel</span>
          </div>
        </div>

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

        {/* Scan History */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5 text-muted-foreground" />
              Mi Historial
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {history.length > 0 ? (
                history.map((scan) => (
                  <div key={scan.id} className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(scan.status)}
                      <div>
                        <p className="text-sm font-medium">
                          {scan.status === 'rejected' ? '❌ Rechazada' :
                            scan.status === 'error' ? '⚠️ Error' :
                              scan.status === 'pending_review' ? '⏳ En Revisión' :
                                `Factura Procesada`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(scan.timestamp, "d 'de' MMMM", { locale: es })}
                        </p>
                      </div>
                    </div>
                    {scan.pointsEarned > 0 ? (
                      <span className="text-sm font-bold text-green-600">+{scan.pointsEarned} pts</span>
                    ) : (
                      <span className="text-xs font-bold text-slate-400">0 pts</span>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-muted-foreground text-sm">No hay actividad reciente</div>
              )}
            </div>
            {history.length > 5 && (
              <Button variant="ghost" className="w-full rounded-none border-t text-primary">
                Ver historial completo
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </CardContent>
        </Card>

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
