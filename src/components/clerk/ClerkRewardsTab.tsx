import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { getRewards } from '@/lib/db';
import { Reward } from '@/lib/types';
import { Gift, Smartphone, ShoppingCart, Trophy, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function ClerkRewardsTab() {
  const { points } = useApp();
  const { toast } = useToast();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getRewards();
        setRewards(data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const categories = [
    { id: 'all', label: 'Todos', icon: Gift },
    { id: 'topup', label: 'Recargas', icon: Smartphone },
    { id: 'voucher', label: 'Vales', icon: ShoppingCart },
    { id: 'prize', label: 'Premios', icon: Trophy },
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

  return (
    <div className="min-h-screen bg-background pb-24 pt-4">
      <div className="px-4 space-y-6 max-w-md mx-auto">
        {/* Header - Soft & Clean */}
        <div className="relative py-8 text-center bg-white rounded-b-[2.5rem] shadow-sm -mx-4 -mt-4 px-4 border-b border-slate-50 mb-8">
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600 mb-2">Canjear Premios</h1>

          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-slate-50 border border-slate-100 shadow-inner">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#FFD700] to-[#FF8C00] flex items-center justify-center text-[10px] text-white font-bold shadow-gold">
              $
            </div>
            <span className="font-bold text-lg text-foreground/80">{points.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide ml-1">Puntos Disp.</span>
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
