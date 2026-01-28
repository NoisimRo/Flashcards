import React, { useEffect } from 'react';
import { Trophy } from 'lucide-react';
import './animations.css';

interface StreakCelebrationProps {
  streak: number;
  onComplete: () => void;
}

/**
 * StreakCelebration - Celebration overlay for streak milestones
 * Shows at 5, 10, 15+ correct answers in a row
 */
export const StreakCelebration: React.FC<StreakCelebrationProps> = ({ streak, onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2000); // Show for 2 seconds

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none">
      <div className="bg-white/95 backdrop-blur-md p-8 rounded-3xl shadow-2xl flex flex-col items-center animate-pop-in border-4 border-orange-400">
        <Trophy className="w-20 h-20 text-yellow-500 mb-4 animate-bounce" />
        <h2 className="text-4xl font-black text-gray-900 italic tracking-tighter drop-shadow-lg">
          EXCELENT!
        </h2>
        <p className="text-xl font-bold text-orange-500 mt-2">{streak} la rând!</p>
      </div>
    </div>
  );
};
