import { useState, useEffect } from 'react';
import { roulettePrizes } from '@/lib/mockData';

interface RouletteWheelProps {
  isSpinning: boolean;
  onSpinComplete?: (prize: string) => void;
}

export function RouletteWheel({ isSpinning, onSpinComplete }: RouletteWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [finalPrize, setFinalPrize] = useState<string | null>(null);

  useEffect(() => {
    if (isSpinning) {
      setFinalPrize(null);
      // Random rotation between 1440 and 2160 degrees (4-6 full spins)
      const spins = 1440 + Math.random() * 720;
      setRotation(prev => prev + spins);

      const timer = setTimeout(() => {
        // Pick random prize
        const prize = roulettePrizes[Math.floor(Math.random() * roulettePrizes.length)];
        setFinalPrize(prize.name);
        onSpinComplete?.(prize.name);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isSpinning, onSpinComplete]);

  const segmentAngle = 360 / roulettePrizes.length;

  return (
    <div className="relative w-72 h-72 mx-auto">
      {/* Pointer */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
        <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-primary drop-shadow-lg" />
      </div>

      {/* Wheel */}
      <div
        className="w-full h-full rounded-full shadow-2xl transition-transform duration-[3000ms] ease-out"
        style={{
          transform: `rotate(${rotation}deg)`,
          background: `conic-gradient(${roulettePrizes
            .map((prize, i) => `${prize.color} ${i * segmentAngle}deg ${(i + 1) * segmentAngle}deg`)
            .join(', ')})`,
        }}
      >
        {/* Prize labels */}
        {roulettePrizes.map((prize, i) => {
          const angle = (i * segmentAngle) + (segmentAngle / 2);
          return (
            <div
              key={prize.id}
              className="absolute left-1/2 top-1/2 origin-left"
              style={{
                transform: `rotate(${angle}deg) translateX(30px)`,
              }}
            >
              <span className="text-xs font-bold text-white drop-shadow-md whitespace-nowrap">
                {prize.name}
              </span>
            </div>
          );
        })}
        
        {/* Center circle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-amber-200 to-amber-400 shadow-lg flex items-center justify-center border-4 border-amber-500">
          <span className="text-amber-800 font-bold text-xl">α</span>
        </div>
      </div>

      {/* Result display */}
      {finalPrize && (
        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 text-center animate-scale-in">
          <div className="px-6 py-3 bg-gold rounded-full shadow-lg">
            <span className="text-amber-900 font-bold text-lg">🎉 {finalPrize}</span>
          </div>
        </div>
      )}
    </div>
  );
}
