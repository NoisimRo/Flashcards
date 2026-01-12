import React, { useEffect } from 'react';
import './animations.css';

interface LevelUpOverlayProps {
  newLevel: number;
  oldLevel: number;
  onComplete: () => void;
}

/**
 * LevelUpOverlay - Celebration animation when user levels up
 * Shows the new level with a celebratory animation
 */
export const LevelUpOverlay: React.FC<LevelUpOverlayProps> = ({
  newLevel,
  oldLevel,
  onComplete,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 3000); // Show for 3 seconds

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center pointer-events-none bg-black/20 backdrop-blur-sm">
      <div className="animate-level-up flex flex-col items-center">
        <div className="text-6xl mb-2">🎉</div>
        <h2 className="text-5xl font-black text-indigo-600 tracking-tighter drop-shadow-2xl bg-white/90 backdrop-blur px-8 py-4 rounded-3xl border-4 border-indigo-300 shadow-2xl">
          LEVEL {newLevel}
        </h2>
        <p className="text-xl font-bold text-gray-700 mt-4 bg-white/80 px-4 py-2 rounded-xl shadow-lg">
          Nivel {oldLevel} → {newLevel}
        </p>
      </div>
    </div>
  );
};
