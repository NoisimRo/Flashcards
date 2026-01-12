import React from 'react';
import { useStudySessionsStore } from '../../../store/studySessionsStore';

/**
 * ProgressBar - Visual progress indicator for study session
 * Shows current card position and completion percentage
 */
export const ProgressBar: React.FC = () => {
  const { currentCardIndex, currentSession } = useStudySessionsStore();
  const totalCards = currentSession?.cards?.length || 0;
  const percentage = totalCards > 0 ? ((currentCardIndex + 1) / totalCards) * 100 : 0;

  return (
    <div className="w-full">
      {/* Progress Text */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-gray-700">Progres</span>
        <span className="text-sm font-bold text-indigo-600">
          {currentCardIndex + 1} / {totalCards}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Percentage */}
      <div className="text-right mt-1">
        <span className="text-xs text-gray-500">{Math.round(percentage)}% completat</span>
      </div>
    </div>
  );
};
