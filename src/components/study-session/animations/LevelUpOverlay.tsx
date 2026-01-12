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
    <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center pointer-events-none">
      <div className="animate-level-up flex flex-col items-center">
        <div className="text-6xl mb-2">🎉</div>
        <h2 className="text-5xl font-black text-indigo-600 tracking-tighter drop-shadow-lg bg-white/80 backdrop-blur-sm px-8 py-4 rounded-3xl border-4 border-indigo-200">
          LEVEL {newLevel}
        </h2>
        <p className="text-xl font-bold text-gray-700 mt-4 bg-white/60 px-4 py-2 rounded-xl">
          Nivel {oldLevel} → {newLevel}
        </p>
      </div>
    </div>
  );
};
