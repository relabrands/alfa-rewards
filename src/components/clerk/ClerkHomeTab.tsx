import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { CoinAnimation } from '@/components/CoinAnimation';
import { RouletteWheel } from '@/components/RouletteWheel';
import { Camera, TrendingUp, History, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { addScanRecord, updateUserPoints, getScanHistory } from '@/lib/db';
import { ScanRecord } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export function ClerkHomeTab() {
  const { points, addPoints, campaignMode, currentUser } = useApp();
  const { toast } = useToast();
  const [displayPoints, setDisplayPoints] = useState(points);
  const [isScanning, setIsScanning] = useState(false);
  const [showCoins, setShowCoins] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [recentEarnings, setRecentEarnings] = useState<number | null>(null);
  const [history, setHistory] = useState<ScanRecord[]>([]);

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

  useEffect(() => {
    loadHistory();
  }, [currentUser?.id]);

  const loadHistory = async () => {
    if (currentUser?.id) {
      const scans = await getScanHistory(currentUser.id);
      setHistory(scans);
    }
  };

  const handleScanInvoice = async () => {
    if (!currentUser) return;

    setIsScanning(true);

    // Simulate processing delay (OCR, etc.)
    await new Promise(resolve => setTimeout(resolve, 1500));

    const earnedPoints = Math.floor(Math.random() * 200) + 100; // Mock calculation logic
    setRecentEarnings(earnedPoints);

    // Create Record in Firestore
    try {
      await addScanRecord({
        clerkId: currentUser.id,
        pharmacyId: currentUser.pharmacyId || 'ph1', // Default or from profile
        invoiceAmount: earnedPoints * 10, // Mock amount
        pointsEarned: earnedPoints,
        status: 'approved'
      });

      // Update User Points in Firestore
      const newTotal = (points || 0) + earnedPoints;
      await updateUserPoints(currentUser.id, newTotal);

      // Update Local State
      addPoints(earnedPoints);
      loadHistory(); // Refresh history

      setIsScanning(false);

      if (campaignMode === 'points') {
        setShowCoins(true);
        toast({
          title: '💰 ¡Puntos Ganados!',
          description: `Has ganado ${earnedPoints} puntos`,
        });
      } else {
        setIsSpinning(true);
      }
    } catch (error) {
      console.error("Error creating scan:", error);
      toast({
        title: 'Error',
        description: 'No se pudo registrar el escaneo. Inténtalo de nuevo.',
        variant: 'destructive',
      });
      setIsScanning(false);
    }
  };

  const handleRouletteComplete = (prize: string) => {
    setIsSpinning(false);
    const earnedPoints = parseInt(prize.replace(/\D/g, '')) || 50;

    // Assuming roulette points are "bonus" and also saved, for now just local add
    // Ideally we should save this too as a "bonus" record type
    addPoints(earnedPoints);

    // Update DB for roulette prize too
    if (currentUser) {
      updateUserPoints(currentUser.id, points + earnedPoints);
    }

    toast({
      title: '🎰 ¡Ganaste en la Ruleta!',
      description: prize,
    });
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <CoinAnimation isActive={showCoins} onComplete={() => setShowCoins(false)} />

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9zdmc+')] opacity-50" />

        <div className="relative px-4 py-8 text-center">
          <p className="text-primary-foreground/70 text-sm mb-2">Mis Puntos</p>

          <div className="relative inline-block">
            <div className="text-6xl font-extrabold animate-count-up">
              {displayPoints.toLocaleString()}
            </div>
            <span className="text-2xl font-medium ml-2 text-primary-foreground/80">pts</span>

            {recentEarnings && (
              <div className="absolute -right-16 top-0 text-gold font-bold animate-fade-in">
                +{recentEarnings}
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 mt-4 text-primary-foreground/70">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm">+340 pts esta semana</span>
          </div>
        </div>

        <svg className="absolute bottom-0 left-0 right-0" viewBox="0 0 400 30" preserveAspectRatio="none">
          <path d="M0 30 Q100 0 200 15 T400 30 L400 30 L0 30 Z" fill="hsl(var(--background))" />
        </svg>
      </div>

      {/* Roulette Mode */}
      {campaignMode === 'roulette' && isSpinning && (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-8 animate-pulse">🎰 ¡Gira la Ruleta!</h2>
            <RouletteWheel isSpinning={isSpinning} onSpinComplete={handleRouletteComplete} />
          </div>
        </div>
      )}

      <div className="px-4 py-6 space-y-6 max-w-md mx-auto animate-fade-in">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="stats-card">
            <CardContent className="p-4 text-center">
              <div className="text-3xl mb-1">{history.filter(h => h.timestamp.toDateString() === new Date().toDateString()).length}</div>
              <p className="text-sm text-muted-foreground">Escaneos Hoy</p>
            </CardContent>
          </Card>
          <Card className="stats-card">
            <CardContent className="p-4 text-center">
              <div className="text-3xl mb-1">🏆</div>
              <p className="text-sm text-muted-foreground">Top 5% Ranking</p>
            </CardContent>
          </Card>
        </div>

        {/* Mode Indicator */}
        <div className="flex items-center justify-center gap-2 py-2">
          <div className={`px-4 py-2 rounded-full text-sm font-medium ${campaignMode === 'points'
            ? 'bg-gold/20 text-gold-dark'
            : 'bg-primary/20 text-primary'
            }`}>
            {campaignMode === 'points' ? '💰 Modo Puntos' : '🎰 Modo Ruleta'}
          </div>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5 text-muted-foreground" />
              Actividad Reciente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {history.length > 0 ? (
              history.slice(0, 5).map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">Factura escaneada</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(item.timestamp, { addSuffix: true, locale: es })}
                    </p>
                  </div>
                  <span className={`font-bold text-success`}>
                    +{item.pointsEarned}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-center text-sm text-muted-foreground py-4">Sin actividad reciente</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2">
        <Button
          onClick={handleScanInvoice}
          disabled={isScanning || isSpinning}
          className="relative h-20 w-20 rounded-full btn-gold text-lg font-bold shadow-2xl hover:scale-110 transition-transform fab-pulse"
        >
          {isScanning ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : (
            <div className="flex flex-col items-center">
              <Camera className="h-7 w-7" />
              <span className="text-[10px] mt-0.5">Escanear</span>
            </div>
          )}
        </Button>
      </div>
    </div>
  );
}
