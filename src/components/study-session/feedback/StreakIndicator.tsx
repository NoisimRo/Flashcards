import React from 'react';
import { useStudySessionsStore } from '../../../store/studySessionsStore';
import { Flame } from 'lucide-react';
import '../animations/animations.css';

export const StreakIndicator: React.FC = () => {
  const { streak } = useStudySessionsStore();
  const isWarmStreak = streak >= 3;
  const isHotStreak = streak >= 5;
  const isFireStreak = streak >= 10;
  const isInfernoStreak = streak >= 15;

  if (streak === 0) return null;

  const flameSize = isInfernoStreak ? 24 : isFireStreak ? 22 : isHotStreak ? 20 : 18;

  const flameColor = isInfernoStreak
    ? 'text-red-500'
    : isFireStreak
      ? 'text-red-600'
      : isHotStreak
        ? 'text-orange-500'
        : isWarmStreak
          ? 'text-orange-400'
          : 'text-orange-600';

  const glowClass = isInfernoStreak
    ? 'animate-fire-glow-intense'
    : isFireStreak
      ? 'animate-fire-glow'
      : '';

  const textColor = isInfernoStreak
    ? 'text-red-500'
    : isFireStreak
      ? 'text-red-600'
      : 'text-orange-500';

  const textSize = isFireStreak ? 'text-base' : 'text-sm';

  return (
    <div className={`relative flex items-center gap-1 flex-shrink-0 ${glowClass}`}>
      {/* Pulse ring for hot streaks */}
      {isHotStreak && (
        <span
          className="streak-pulse-ring"
          style={{ color: isInfernoStreak ? '#ef4444' : '#f97316' }}
        />
      )}

      {/* Secondary flame behind for inferno effect */}
      {isInfernoStreak && (
        <Flame
          size={flameSize + 4}
          className="absolute -left-0.5 text-yellow-400 opacity-50 animate-bounce"
          fill="currentColor"
          style={{ filter: 'blur(2px)' }}
        />
      )}

      <Flame
        size={flameSize}
        className={`relative z-10 transition-all duration-300 ${flameColor} ${
          isFireStreak ? 'animate-bounce' : isHotStreak ? 'animate-pulse' : ''
        }`}
        fill={isWarmStreak ? 'currentColor' : 'none'}
      />

      <span
        className={`font-black ${textColor} ${textSize} relative z-10 transition-all duration-300`}
      >
        {streak}
        {isInfernoStreak && 'x'}
      </span>
    </div>
  );
};
