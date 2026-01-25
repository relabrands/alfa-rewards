import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { getRewards, getLevels } from '@/lib/db';
import { Reward, LevelConfig } from '@/lib/types';
import { Gift, Sparkles, AlertCircle, Loader2, Coins } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function ClerkRewardsTab() {
  const { points } = useApp();
  const { toast } = useToast();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Level State
  const [currentLevelConfig, setCurrentLevelConfig] = useState<LevelConfig | null>(null);
  const [nextLevelConfig, setNextLevelConfig] = useState<LevelConfig | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [rewardsData, levelsData] = await Promise.all([
          getRewards(),
          getLevels()
        ]);
        setRewards(rewardsData);

        // Calculate Level
        const sorted = levelsData.sort((a, b) => a.minPoints - b.minPoints);

        let current = null;
        for (const l of sorted) {
          if (points >= l.minPoints) {
            current = l;
          } else {
            break;
          }
        }
        setCurrentLevelConfig(current);

        const next = sorted.find(l => l.minPoints > points);
        setNextLevelConfig(next || null);

      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [points]);

  const categories = [
    { id: 'all', label: 'Todos', icon: Gift },
    { id: 'topup', label: 'Recargas', icon: Sparkles },
    { id: 'voucher', label: 'Vales', icon: AlertCircle },
    { id: 'prize', label: 'Premios', icon: Coins },
  ];

  const filteredRewards = selectedCategory === 'all'
    ? rewards
    : rewards.filter(r => r.category === selectedCategory);

  const handleRedeem = (reward: Reward) => {
    if (points >= reward.pointsCost) {
      toast({
        title: '🎉 ¡Premio Canjeado!',
        description: `Has canjeado ${reward.name}. Te contactaremos pronto.`,
      });
      // Here we would ideally create a "Redemption" record in DB
    } else {
      toast({
        title: 'Puntos insuficientes',
        description: `Necesitas ${reward.pointsCost - points} puntos más`,
        variant: 'destructive',
      });
    }
  };

  // Calculate Progress Percentage for Hero Card
  const progressPercent = nextLevelConfig
    ? Math.min(100, Math.max(0, ((points - (currentLevelConfig?.minPoints || 0)) / (nextLevelConfig.minPoints - (currentLevelConfig?.minPoints || 0))) * 100))
    : 100;

  return (
    <div className="min-h-screen bg-background pb-24 pt-4">
      <div className="px-4 space-y-6 max-w-md mx-auto">
        {/* Header - Premium Soft */}
        <div className="relative pt-2 pb-6 px-2 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Recompensas</p>
              <h1 className="text-3xl font-semibold leading-tight text-foreground">Canjear</h1>
            </div>
            {/* Points Pill */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-sm border border-slate-100">
              <div className="w-6 h-6 rounded-full bg-[#FFD700] flex items-center justify-center text-white shadow-sm">
                <Coins className="w-3 h-3 text-amber-700" />
              </div>
              <span className="font-bold text-foreground">{points.toLocaleString()}</span>
            </div>
          </div>

          {/* Hero Card for Rewards */}
          <div className="soft-card rounded-3xl p-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Gift className="w-32 h-32" />
            </div>
            <div className="relative z-10">
              <p className="text-indigo-100 text-xs font-medium uppercase tracking-wider mb-1">
                {currentLevelConfig ? `Nivel Actual: ${currentLevelConfig.name}` : 'Tu Progreso'}
              </p>
              <h2 className="text-2xl font-bold mb-4">
                {nextLevelConfig
                  ? `¡A por ${nextLevelConfig.name}!`
                  : '¡Eres invencible! 🚀'}
              </h2>

              {nextLevelConfig && (
                <>
                  <div className="flex justify-between text-xs text-indigo-100 mb-1">
                    <span>Progreso</span>
                    <span className="font-bold">{Math.floor(progressPercent)}%</span>
                  </div>
                  <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden mb-2">
                    <div
                      className="bg-white h-full rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all duration-1000 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-indigo-100 flex justify-between items-center mb-1">
                    <span>Faltan {(nextLevelConfig.minPoints - points).toLocaleString()} pts</span>
                    <span className="bg-white/20 px-2 py-1 rounded text-white font-bold text-[10px] uppercase tracking-wide">
                      Bono Extra: {nextLevelConfig.rewardDescription}
                    </span>
                  </p>
                  <p className="text-[10px] text-indigo-200 text-center italic">
                    * Este bono es un regalo adicional. No consume tus puntos canjeables.
                  </p>
                </>
              )}
              {!nextLevelConfig && currentLevelConfig && (
                <p className="text-sm text-indigo-100">Has alcanzado el nivel máximo. ¡Felicidades!</p>
              )}
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors ${isSelected
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
                  }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Rewards List - Vertical Stack */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRewards.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground bg-white rounded-3xl border border-slate-100">
                <Gift className="w-12 h-12 mx-auto text-muted-foreground/20 mb-3" />
                No hay premios en esta categoría.
              </div>
            ) : (
              filteredRewards.map((reward) => {
                const canRedeem = points >= reward.pointsCost;

                return (
                  <div
                    key={reward.id}
                    className={`group bg-white rounded-3xl p-2 pr-4 flex items-center gap-4 transition-all duration-300 border border-slate-50 shadow-sm ${canRedeem ? 'hover:shadow-md hover:scale-[1.01]' : 'opacity-60 grayscale-[0.5]'
                      }`}
                  >
                    {/* Image / Icon */}
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center text-4xl shadow-inner shrink-0">
                      {reward.image}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 py-2">
                      <h3 className="font-bold text-foreground text-sm truncate">{reward.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mt-1">{reward.description}</p>

                      <div className="flex items-center gap-1 mt-2">
                        <span className={`text-xs font-black px-2 py-0.5 rounded-md ${canRedeem ? 'bg-[#FFD700]/10 text-[#FF8C00]' : 'bg-slate-100 text-slate-400'}`}>
                          {reward.pointsCost.toLocaleString()}
                        </span>
                        <span className="text-[9px] text-muted-foreground uppercase font-bold">Pts</span>
                      </div>
                    </div>

                    {/* Redeem Button */}
                    <Button
                      size="sm"
                      className={`h-10 px-5 rounded-xl font-bold text-xs transition-all ${canRedeem
                        ? 'bg-gradient-to-r from-primary to-blue-500 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95'
                        : 'bg-slate-100 text-slate-400 font-medium'
                        }`}
                      onClick={() => handleRedeem(reward)}
                      disabled={!canRedeem}
                    >
                      {canRedeem ? 'Canjear' : 'Faltan Pts'}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
