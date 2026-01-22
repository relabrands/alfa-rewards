import { useEffect } from 'react';
import confetti from 'canvas-confetti';

interface CoinAnimationProps {
  isActive: boolean;
  onComplete?: () => void;
}

export function CoinAnimation({ isActive, onComplete }: CoinAnimationProps) {

  useEffect(() => {
    if (isActive) {
      const duration = 2000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 50 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(function () {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          clearInterval(interval);
          onComplete?.();
          return;
        }

        const particleCount = 20 * (timeLeft / duration);

        // Gold Coins Confetti
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          colors: ['#FFD700', '#FFA500', '#DAA520'], // Gold shades
          shapes: ['circle'],
          scalar: 1.2
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          colors: ['#FFD700', '#FFA500', '#DAA520'], // Gold shades
          shapes: ['circle'],
          scalar: 1.2
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [isActive, onComplete]);

  return null;
}
