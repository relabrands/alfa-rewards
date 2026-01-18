import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { rewards } from '@/lib/mockData';
import { Gift, Smartphone, ShoppingCart, Trophy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function ClerkRewardsTab() {
  const { points } = useApp();
  const { toast } = useToast();

  const categories = [
    { id: 'topup', label: 'Recargas', icon: Smartphone },
    { id: 'voucher', label: 'Vales', icon: ShoppingCart },
    { id: 'prize', label: 'Premios', icon: Trophy },
  ];

  const handleRedeem = (reward: typeof rewards[0]) => {
    if (points >= reward.pointsCost) {
      toast({
        title: '🎉 ¡Premio Canjeado!',
        description: `Has canjeado ${reward.name}. Te contactaremos pronto.`,
      });
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
        {/* Header */}
        <div className="text-center py-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-3">
            <Gift className="h-5 w-5" />
            <span className="font-medium">{points.toLocaleString()} pts disponibles</span>
          </div>
          <h1 className="text-2xl font-bold">Canjear Premios</h1>
          <p className="text-muted-foreground mt-1">Usa tus puntos para obtener recompensas</p>
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted hover:bg-muted/80 whitespace-nowrap transition-colors"
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Rewards Grid */}
        <div className="grid grid-cols-1 gap-4">
          {rewards.map((reward) => {
            const canRedeem = points >= reward.pointsCost;
            
            return (
              <Card 
                key={reward.id} 
                className={`overflow-hidden transition-all ${
                  canRedeem ? 'hover:shadow-lg' : 'opacity-60'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center text-3xl">
                      {reward.image}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{reward.name}</h3>
                      <p className="text-sm text-muted-foreground">{reward.description}</p>
                      <div className={`mt-1 text-sm font-bold ${
                        canRedeem ? 'text-success' : 'text-muted-foreground'
                      }`}>
                        {reward.pointsCost.toLocaleString()} pts
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={canRedeem ? 'default' : 'secondary'}
                      onClick={() => handleRedeem(reward)}
                      disabled={!canRedeem}
                      className={canRedeem ? 'btn-primary-gradient' : ''}
                    >
                      Canjear
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
