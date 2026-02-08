import React from 'react';
import { useStudySessionsStore } from '../../../store/studySessionsStore';

/**
 * ProgressBar - Visual progress indicator for study session
 * Shows current card position and completion percentage
 * Uses accent theme CSS variables for colors
 */
export const ProgressBar: React.FC = () => {
  const { currentCardIndex, currentSession } = useStudySessionsStore();
  const totalCards = currentSession?.cards?.length || 0;
  const percentage = totalCards > 0 ? ((currentCardIndex + 1) / totalCards) * 100 : 0;

  return (
    <div className="w-full">
      {/* Progress Text */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
          Progres
        </span>
        <span className="text-sm font-bold" style={{ color: 'var(--color-accent)' }}>
          {currentCardIndex + 1} / {totalCards}
        </span>
      </div>

      {/* Progress Bar */}
      <div
        className="w-full rounded-full h-3 overflow-hidden"
        style={{ backgroundColor: 'var(--bg-tertiary)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%`, background: 'var(--color-accent-gradient)' }}
        />
      </div>

      {/* Percentage */}
      <div className="text-right mt-1">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {Math.round(percentage)}% parcurs
        </span>
      </div>
    </div>
  );
};
