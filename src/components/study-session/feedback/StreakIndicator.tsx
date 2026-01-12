import React from 'react';
import { useStudySessionsStore } from '../../../store/studySessionsStore';
import { Flame } from 'lucide-react';

/**
 * StreakIndicator - Shows current answer streak
 * Highlights when user has a hot streak (5+)
 */
export const StreakIndicator: React.FC = () => {
  const { streak } = useStudySessionsStore();
  const isHotStreak = streak >= 5;
  const isFireStreak = streak >= 10;

  if (streak === 0) return null;

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${
        isFireStreak
          ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white animate-pulse'
          : isHotStreak
            ? 'bg-gradient-to-r from-orange-400 to-red-500 text-white'
            : 'bg-orange-50 text-orange-700'
      }`}
    >
      <Flame
        size={20}
        className={isHotStreak ? 'animate-bounce' : ''}
        fill={isHotStreak ? 'currentColor' : 'none'}
      />
      <span className="text-lg">{streak}</span>
      {isFireStreak && <span className="text-sm">🔥 INCREDIBIL!</span>}
      {isHotStreak && !isFireStreak && <span className="text-sm">În flăcări!</span>}
    </div>
  );
};
