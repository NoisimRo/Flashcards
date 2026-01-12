import React from 'react';
import { useStudySessionsStore } from '../../../store/studySessionsStore';
import { Check, X, SkipForward } from 'lucide-react';

/**
 * SessionStats - Display correct/incorrect/skipped counts
 * Shows real-time statistics during study session
 */
export const SessionStats: React.FC = () => {
  const { answers } = useStudySessionsStore();

  const answersArray = Object.values(answers);
  const correctCount = answersArray.filter(a => a === 'correct').length;
  const incorrectCount = answersArray.filter(a => a === 'incorrect').length;
  const skippedCount = answersArray.filter(a => a === 'skipped').length;

  return (
    <div className="flex items-center gap-4">
      {/* Correct */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg">
        <Check size={16} className="text-green-600" />
        <span className="font-bold text-green-700">{correctCount}</span>
      </div>

      {/* Incorrect */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-lg">
        <X size={16} className="text-red-600" />
        <span className="font-bold text-red-700">{incorrectCount}</span>
      </div>

      {/* Skipped */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 rounded-lg">
        <SkipForward size={16} className="text-yellow-600" />
        <span className="font-bold text-yellow-700">{skippedCount}</span>
      </div>
    </div>
  );
};
