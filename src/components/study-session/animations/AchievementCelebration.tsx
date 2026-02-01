import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Target,
  Star,
  Zap,
  Library,
  Flame,
  Diamond,
  Crown,
  Calendar,
  Moon,
  Sunrise,
  Award,
  Trophy,
  Medal,
  Coins,
  Gem,
  Sparkles,
  Timer,
  Brain,
  BookCheck,
} from 'lucide-react';
import './animations.css';

const iconMap: Record<string, React.ElementType> = {
  target: Target,
  star: Star,
  zap: Zap,
  library: Library,
  flame: Flame,
  diamond: Diamond,
  crown: Crown,
  calendar: Calendar,
  moon: Moon,
  sunrise: Sunrise,
  award: Award,
  trophy: Trophy,
  medal: Medal,
  coins: Coins,
  gem: Gem,
  sparkles: Sparkles,
  timer: Timer,
  brain: Brain,
  'book-check': BookCheck,
};

interface AchievementCelebrationProps {
  icon: string;
  title: string;
  color: string;
  onComplete: () => void;
}

const CONFETTI_COLORS = [
  '#FFD700',
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#98D8C8',
  '#F7DC6F',
  '#BB8FCE',
];

/**
 * AchievementCelebration - Badge unlocked overlay with confetti
 * Shows the badge icon, title, and real CSS confetti particles
 * Uses React Portal for proper z-index layering
 */
export const AchievementCelebration: React.FC<AchievementCelebrationProps> = ({
  icon,
  title,
  color,
  onComplete,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 3500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  const Icon = iconMap[icon] || Star;

  // Generate confetti particles with stable random values
  const particles = useMemo(() => {
    return Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      fallDuration: 2 + Math.random() * 2,
      shakeDuration: 1 + Math.random() * 2,
      delay: Math.random() * 1.5,
      width: 6 + Math.random() * 8,
      height: 4 + Math.random() * 10,
      rotation: Math.random() * 360,
    }));
  }, []);

  const overlay = (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none">
      {/* Confetti particles */}
      {particles.map(p => (
        <div
          key={p.id}
          className="confetti-particle"
          style={
            {
              left: `${p.left}%`,
              backgroundColor: p.color,
              width: `${p.width}px`,
              height: `${p.height}px`,
              borderRadius: p.width > 10 ? '50%' : '2px',
              transform: `rotate(${p.rotation}deg)`,
              '--fall-duration': `${p.fallDuration}s`,
              '--shake-duration': `${p.shakeDuration}s`,
              animationDelay: `${p.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}

      {/* Badge content */}
      <div className="animate-level-up flex flex-col items-center gap-4">
        <div className="text-5xl">🏆</div>
        <div className="flex flex-col items-center gap-3 bg-white/95 backdrop-blur-md p-8 rounded-3xl shadow-2xl border-4 border-amber-400">
          <div className="text-sm font-bold uppercase tracking-widest text-amber-600">
            Badge Unlocked!
          </div>
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center ${color || 'bg-amber-100 text-amber-600'}`}
          >
            <Icon size={40} />
          </div>
          <h2 className="text-2xl font-black text-gray-900 text-center">{title}</h2>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
};
