import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { CoinAnimation } from '@/components/CoinAnimation';
import { RouletteWheel } from '@/components/RouletteWheel';
import { Camera, TrendingUp, History, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function ClerkHomeTab() {
  const { points, addPoints, campaignMode } = useApp();
  const { toast } = useToast();
  const [displayPoints, setDisplayPoints] = useState(points);
  const [isScanning, setIsScanning] = useState(false);
  const [showCoins, setShowCoins] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [recentEarnings, setRecentEarnings] = useState<number | null>(null);

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

  const handleScanInvoice = () => {
    setIsScanning(true);

    setTimeout(() => {
      setIsScanning(false);
      const earnedPoints = Math.floor(Math.random() * 200) + 100;
      setRecentEarnings(earnedPoints);

      if (campaignMode === 'points') {
        setShowCoins(true);
        addPoints(earnedPoints);
        toast({
          title: '💰 ¡Puntos Ganados!',
          description: `Has ganado ${earnedPoints} puntos`,
        });
      } else {
        setIsSpinning(true);
      }
    }, 1500);
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
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Inicio</p>
            <h1 className="text-3xl font-semibold leading-tight">Mis puntos</h1>
          </div>
          <button className="px-4 py-2 text-sm soft-chip">Ayuda</button>
        </div>

        <div className="mt-4 soft-card rounded-3xl p-5">
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
                <span className="text-sm">+340 pts esta semana</span>
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

      <main className="px-4 py-6 space-y-6 max-w-md mx-auto animate-fade-in">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="soft-card rounded-3xl stats-card">
            <CardContent className="p-4 text-center">
              <div className="text-3xl mb-1">12</div>
              <p className="text-sm text-muted-foreground">Escaneos Hoy</p>
            </CardContent>
          </Card>
          <Card className="soft-card rounded-3xl stats-card">
            <CardContent className="p-4 text-center">
              <div className="text-3xl mb-1">🏆</div>
              <p className="text-sm text-muted-foreground">Top 5% Ranking</p>
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
          <CardContent className="space-y-3">
            {[
              { time: 'Hace 2 min', desc: 'Factura escaneada', points: '+250' },
              { time: 'Hace 1 hora', desc: 'Factura escaneada', points: '+180' },
              { time: 'Ayer', desc: 'Recarga canjeada', points: '-500' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{item.desc}</p>
                  <p className="text-xs text-muted-foreground">{item.time}</p>
                </div>
                <span className={`font-bold ${item.points.startsWith('+') ? 'text-success' : 'text-destructive'}`}>
                  {item.points}
                </span>
              </div>
            ))}
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
