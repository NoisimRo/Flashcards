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
    <div className="flex items-center gap-1 flex-shrink-0">
      <Zap size={18} className="text-yellow-500" fill="currentColor" />
      <span className="font-bold text-yellow-500 text-sm">+{sessionXP}</span>
    </div>
  );
};
