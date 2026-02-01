import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import './animations.css';

interface LevelUpOverlayProps {
  newLevel: number;
  oldLevel: number;
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
 * LevelUpOverlay - Celebration animation when user levels up
 * Shows the new level with a celebratory animation and confetti
 * Uses React Portal to ensure proper centering regardless of parent positioning
 */
export const LevelUpOverlay: React.FC<LevelUpOverlayProps> = ({
  newLevel,
  oldLevel,
  onComplete,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 3500);

    return () => clearTimeout(timer);
  }, [onComplete]);

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

      {/* Level up content */}
      <div className="animate-level-up flex flex-col items-center gap-4">
        <div className="text-7xl">🎉</div>
        <h2 className="text-6xl font-black text-indigo-600 tracking-tighter drop-shadow-2xl bg-white/95 backdrop-blur px-10 py-6 rounded-3xl border-4 border-indigo-400 shadow-2xl">
          LEVEL {newLevel}
        </h2>
        <p className="text-lg font-semibold text-white/90 bg-indigo-600/80 px-6 py-2 rounded-xl shadow-lg">
          Nivel {oldLevel} → {newLevel}
        </p>
      </div>
    </div>
  );

  // Use portal to render at body level to avoid parent transform/positioning issues
  return createPortal(overlay, document.body);
};
