import { useState, useEffect, ChangeEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { CoinAnimation } from '@/components/CoinAnimation';
import { RouletteWheel } from '@/components/RouletteWheel';
import { Camera, TrendingUp, History, Loader2, Award } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, doc, onSnapshot, serverTimestamp, updateDoc, getDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';
import { getScanHistory } from '@/lib/db';
import { ScanRecord } from '@/lib/types';
import { format, isSameDay, isSameWeek } from 'date-fns';
import { es } from 'date-fns/locale';

export function ClerkHomeTab() {
  const { points, addPoints, campaignMode, currentUser } = useApp();
  const { toast } = useToast();
  const [displayPoints, setDisplayPoints] = useState(points);
  const [isScanning, setIsScanning] = useState(false);
  const [showCoins, setShowCoins] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [recentEarnings, setRecentEarnings] = useState<number | null>(null);

  // Real Data State
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [weeklyPoints, setWeeklyPoints] = useState(0);
  const [scansToday, setScansToday] = useState(0);
  const [rankingPercentile, setRankingPercentile] = useState(0);
  const [pharmacyDetails, setPharmacyDetails] = useState<{ name: string, sector: string } | null>(null);

  useEffect(() => {
    if (displayPoints !== points) {
      const diff = points - displayPoints;
      const step = Math.ceil(diff / 20);
      const timer = setInterval(() => {
        setDisplayPoints(prev => {
          if (prev + step >= points) {
            clearInterval(timer);
            return points;
          }
          return prev + step;
        });
      }, 50);
      return () => clearInterval(timer);
    }
  }, [points, displayPoints]);

  // Load Real Data
  useEffect(() => {
    if (!currentUser) return;

    const loadDashboardData = async () => {
      try {
        // 1. Load History & Calculate Stats
        const scans = await getScanHistory(currentUser.id);
        setHistory(scans);

        const now = new Date();
        const todayScans = scans.filter(s => s.timestamp && isSameDay(s.timestamp, now));
        const weekPoints = scans
          .filter(s => s.timestamp && isSameWeek(s.timestamp, now))
          .reduce((sum, s) => sum + (s.pointsEarned || 0), 0);

        setScansToday(todayScans.length);
        setWeeklyPoints(weekPoints);

        // 2. Load Pharmacy Details
        if (currentUser.pharmacyId) {
          const pharDoc = await getDoc(doc(db, 'pharmacies', currentUser.pharmacyId));
          if (pharDoc.exists()) {
            const data = pharDoc.data();
            setPharmacyDetails({ name: data.name, sector: data.sector || '' });
          }
        }

        // 3. Calculate Ranking (Simplified Realtime)
        // Ideally this should be a cloud function or cached stat
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where("role", "==", "clerk"), orderBy("points", "desc"));
        const snapshot = await getDocs(q);

        let myRank = -1;
        snapshot.docs.forEach((doc, index) => {
          if (doc.id === currentUser.id) myRank = index + 1;
        });

        if (myRank > 0 && snapshot.size > 0) {
          // Percentile: (Total - Rank) / Total * 100. Top 1 is 100% better than others approx.
          // Or simpler: Top X%
          const percentile = Math.ceil((myRank / snapshot.size) * 100);
          setRankingPercentile(percentile);
        } else {
          setRankingPercentile(100); // Default bottom
        }

      } catch (error) {
        console.error("Error loading dashboard data", error);
      }
    };

    loadDashboardData();
  }, [currentUser, points]); // Reload when points change

  const handleScanInvoice = () => {
    document.getElementById('invoice-upload')?.click();
  };

  const onInvoiceFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    console.log('File change event triggered');
    const file = event.target.files?.[0];
    if (!file || !currentUser) {
      console.log('No file or user missing', { file, currentUser });
      return;
    }

    setIsScanning(true);
    toast({ title: 'Subiendo factura...', description: 'Por favor espera mientras analizamos la imagen.' });

    try {
      // 1. Create Scan Doc
      const scanRef = await addDoc(collection(db, 'scans'), {
        userId: currentUser.id,
        status: 'uploading',
        createdAt: serverTimestamp(),
        timestamp: serverTimestamp(), // Added for sorting consistency
        type: 'invoice'
      });

      // 2. Upload Image
      const storagePath = `invoices/${currentUser.id}/${scanRef.id}.jpg`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file);

      // 3. Trigger AI Processing
      await updateDoc(scanRef, {
        status: 'uploaded',
        storagePath: storagePath
      });

      // 4. Listen for Results
      const unsubscribe = onSnapshot(doc(db, 'scans', scanRef.id), (docSnapshot) => {
        const data = docSnapshot.data();
        if (!data) return;

        if (data.status === 'processed') {
          setIsScanning(false);
          const earned = data.pointsEarned || 0;
          setRecentEarnings(earned);

          if (earned > 0) {
            setShowCoins(true);
            addPoints(earned);
            toast({
              title: '💰 ¡Puntos Acreditados!',
              description: `La IA detectó productos válidos. Ganaste ${earned} puntos.`,
              className: 'bg-green-50 border-green-200 text-green-800'
            });
          } else {
            // Processed but 0 points (valid scan, no products)
            toast({
              title: 'Factura Procesada',
              description: 'Se leyó la factura, pero no contiene productos participantes.',
              variant: 'default'
            });
          }
          unsubscribe();
        } else if (data.status === 'rejected') {
          setIsScanning(false);
          toast({
            title: '❌ Factura Rechazada',
            description: data.rejectionReason || 'La factura no cumple con los requisitos.',
            variant: 'destructive',
            duration: 5000
          });
          unsubscribe();
        } else if (data.status === 'pending_review') {
          setIsScanning(false);
          toast({
            title: '⚠️ Pendiente de Revisión',
            description: data.rejectionReason || 'Un administrador revisará esta factura manualmente.',
            className: 'bg-yellow-50 border-yellow-200 text-yellow-800',
            duration: 5000
          });
          unsubscribe();
        } else if (data.status === 'error') {
          setIsScanning(false);
          toast({
            title: 'Error del Sistema',
            description: 'Hubo un error técnico procesando la imagen. Intenta nuevamente.',
            variant: 'destructive'
          });
          unsubscribe();
        }

      });

    } catch (error: any) {
      console.error(error);
      setIsScanning(false);
      toast({ title: 'Error', description: error.message || 'Falló la subida de la imagen.', variant: 'destructive' });
    }
  };

  const handleRouletteComplete = (prize: string) => {
    setIsSpinning(false);
    const earnedPoints = parseInt(prize.replace(/\D/g, '')) || 50;
    addPoints(earnedPoints);
    toast({
      title: '🎰 ¡Ganaste en la Ruleta!',
      description: prize,
    });
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <CoinAnimation isActive={showCoins} onComplete={() => setShowCoins(false)} />

      {/* Top / Balance (reference-style) */}
      <header className="px-4 pt-6 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Hola,</p>
            <h1 className="text-xl font-bold leading-tight text-foreground">
              {currentUser?.name || 'Usuario'}
            </h1>
            {pharmacyDetails && (
              <p className="text-xs text-muted-foreground mt-1">
                {pharmacyDetails.name} {pharmacyDetails.sector ? `• ${pharmacyDetails.sector}` : ''}
              </p>
            )}
          </div>
          <button className="px-4 py-2 text-sm soft-chip">Ayuda</button>
        </div>

        <div className="mt-2 soft-card rounded-3xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Balance</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-5xl font-semibold animate-count-up">{displayPoints.toLocaleString()}</span>
                <span className="text-sm text-muted-foreground">pts</span>
                {recentEarnings && (
                  <span className="ml-2 text-sm font-semibold text-success animate-fade-in">+{recentEarnings}</span>
                )}
              </div>
              <div className="mt-3 flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">+{weeklyPoints.toLocaleString()} pts esta semana</span>
              </div>
            </div>

            <div className="shrink-0">
              <div
                className={`px-4 py-2 rounded-full text-sm font-medium border ${campaignMode === 'points'
                  ? 'bg-gold/15 text-gold-dark border-border'
                  : 'bg-secondary text-secondary-foreground border-border'
                  }`}
              >
                {campaignMode === 'points' ? '💰 Puntos' : '🎰 Ruleta'}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Roulette Mode */}
      {campaignMode === 'roulette' && isSpinning && (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-8 animate-pulse">🎰 ¡Gira la Ruleta!</h2>
            <RouletteWheel isSpinning={isSpinning} onSpinComplete={handleRouletteComplete} />
          </div>
        </div>
      )}

      <input
        type="file"
        id="invoice-upload"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onInvoiceFileChange}
      />

      <main className="px-4 py-6 space-y-6 max-w-md mx-auto animate-fade-in">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="soft-card rounded-3xl stats-card">
            <CardContent className="p-4 text-center">
              <div className="text-3xl mb-1 font-bold">{scansToday}</div>
              <p className="text-sm text-muted-foreground">Escaneos Hoy</p>
            </CardContent>
          </Card>
          <Card className="soft-card rounded-3xl stats-card">
            <CardContent className="p-4 text-center">
              <div className="text-3xl mb-1 flex justify-center text-gold">
                <Award className="h-8 w-8 text-[#FFD700]" />
              </div>
              <p className="text-sm text-muted-foreground">Top {rankingPercentile}%</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="soft-card rounded-3xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5 text-muted-foreground" />
              Actividad Reciente
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {history.slice(0, 5).map((item, index) => (
                <div key={index} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Factura Registrada</p>
                    <p className="text-xs text-muted-foreground">
                      {item.timestamp ? format(item.timestamp, "d MMM, h:mm a", { locale: es }) : 'Procesando...'}
                    </p>
                  </div>
                  <span className={`font-bold ${item.pointsEarned > 0 ? 'text-success' : 'text-muted-foreground'}`}>
                    {item.pointsEarned > 0 ? `+${item.pointsEarned}` : item.status === 'processing' ? '...' : '0'}
                  </span>
                </div>
              ))}
              {history.length === 0 && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No hay actividad reciente.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Primary CTA (reference-style pill button) */}
      <div className="fixed left-0 right-0 bottom-24 px-4">
        <div className="max-w-md mx-auto">
          <Button
            onClick={handleScanInvoice}
            disabled={isScanning || isSpinning}
            className="w-full h-14 rounded-2xl btn-gold font-semibold tracking-tight shadow-2xl"
          >
            {isScanning ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Registrando…
              </span>
            ) : (
              <span className="inline-flex items-center gap-3">
                <Camera className="h-5 w-5" />
                Registrar factura
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
