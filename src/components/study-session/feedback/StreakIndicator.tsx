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
    <div className="flex items-center gap-1 flex-shrink-0">
      <Flame
        size={18}
        className={`${
          isFireStreak
            ? 'text-red-600 animate-bounce'
            : isHotStreak
              ? 'text-orange-500'
              : 'text-orange-600'
        }`}
        fill={isHotStreak ? 'currentColor' : 'none'}
      />
      <span className="font-bold text-orange-700 text-sm">{streak}</span>
    </div>
  );
};
