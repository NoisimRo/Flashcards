import React from 'react';
import { useStudySessionsStore } from '../../../store/studySessionsStore';
import { Zap } from 'lucide-react';

/**
 * XPIndicator - Shows current session XP
 * Displays total XP earned during the session
 */
export const XPIndicator: React.FC = () => {
  const { sessionXP } = useStudySessionsStore();

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-100 to-amber-100 rounded-lg">
      <Zap size={20} className="text-yellow-600" fill="currentColor" />
      <span className="font-bold text-yellow-800 text-lg">+{sessionXP}</span>
      <span className="text-sm font-semibold text-yellow-700">XP</span>
    </div>
  );
};
