import { useEffect, useState } from 'react';

interface Coin {
  id: number;
  x: number;
  delay: number;
  size: number;
  rotation: number;
}

interface CoinAnimationProps {
  isActive: boolean;
  coinCount?: number;
  onComplete?: () => void;
}

export function CoinAnimation({ isActive, coinCount = 15, onComplete }: CoinAnimationProps) {
  const [coins, setCoins] = useState<Coin[]>([]);

  useEffect(() => {
    if (isActive) {
      const newCoins: Coin[] = Array.from({ length: coinCount }, (_, i) => ({
        id: i,
        x: Math.random() * 80 + 10, // 10-90% of width
        delay: Math.random() * 0.5,
        size: Math.random() * 16 + 24, // 24-40px
        rotation: Math.random() * 360,
      }));
      setCoins(newCoins);

      const timer = setTimeout(() => {
        onComplete?.();
      }, 2500);

      return () => clearTimeout(timer);
    } else {
      setCoins([]);
    }
  }, [isActive, coinCount, onComplete]);

  if (!isActive || coins.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {coins.map((coin) => (
        <div
          key={coin.id}
          className="coin animate-coin-drop"
          style={{
            left: `${coin.x}%`,
            width: `${coin.size}px`,
            height: `${coin.size}px`,
            animationDelay: `${coin.delay}s`,
            transform: `rotate(${coin.rotation}deg)`,
          }}
        >
          {/* Inner coin details */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-amber-800 font-bold text-xs">α</span>
          </div>
          {/* Shine effect */}
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <div className="absolute -inset-full bg-gradient-to-r from-transparent via-white/40 to-transparent rotate-45 animate-shimmer" />
          </div>
        </div>
      ))}
      
      {/* Coin jar at bottom */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-32">
        <div className="relative w-full h-full">
          {/* Jar shape */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-24 bg-gradient-to-b from-amber-100 to-amber-200 rounded-b-3xl rounded-t-lg border-4 border-amber-300 opacity-80">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-3 bg-amber-400 rounded-t-lg -translate-y-2" />
          </div>
          {/* Glow effect */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-40 h-16 bg-gold/30 rounded-full blur-xl animate-glow-pulse" />
        </div>
      </div>
    </div>
  );
}
