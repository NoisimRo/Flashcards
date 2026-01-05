import React, { useEffect } from 'react';
import { Play, Trash2, Shuffle, Brain, CheckSquare, List as ListIcon, BookOpen } from 'lucide-react';
import { useStudySessionsStore } from '../../store/studySessionsStore';
import { useToast } from '../ui/Toast';

interface ActiveSessionsListProps {
  onResumeSession: (sessionId: string) => void;
}

const ActiveSessionsList: React.FC<ActiveSessionsListProps> = ({ onResumeSession }) => {
  const toast = useToast();
  const { activeSessions, isLoading, fetchActiveSessions, abandonSession } =
    useStudySessionsStore();

  useEffect(() => {
    fetchActiveSessions({ status: 'active' });
  }, [fetchActiveSessions]);

  const handleAbandon = async (sessionId: string, title: string) => {
    if (confirm(`Sigur vrei să abandonezi sesiunea "${title}"?`)) {
      await abandonSession(sessionId);
      toast.success('Sesiune abandonată');
    }
  };

  const formatDuration = (seconds: number | undefined) => {
    if (!seconds || seconds === 0) return '0 min';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return `${hours}h ${remainingMins}m`;
  };

  const getProgressPercentage = (session: any) => {
    return Math.round((session.currentCardIndex / session.totalCards) * 100);
  };

  const getAnswerStats = (session: any) => {
    const answers = session.answers || {};
    let correct = 0;
    let incorrect = 0;
    let skipped = 0;

    Object.values(answers).forEach((answer: any) => {
      if (answer === 'correct') correct++;
      else if (answer === 'incorrect') incorrect++;
      else if (answer === 'skipped') skipped++;
    });

    return { correct, incorrect, skipped, total: correct + incorrect + skipped };
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'random':
        return Shuffle;
      case 'smart':
        return Brain;
      case 'manual':
        return CheckSquare;
      case 'all':
        return ListIcon;
      default:
        return BookOpen;
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'random':
        return 'text-blue-500';
      case 'smart':
        return 'text-purple-500';
      case 'manual':
        return 'text-green-500';
      case 'all':
        return 'text-orange-500';
      default:
        return 'text-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (activeSessions.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen size={48} className="mx-auto text-gray-400 mb-3" />
        <p className="text-gray-600 font-medium">Nu ai sesiuni active</p>
        <p className="text-sm text-gray-500 mt-1">
          Creează o sesiune nouă pentru a începe să înveți!
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 h-full overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sesiuni Active</h1>
          <p className="text-gray-500">{activeSessions.length} sesiuni în desfășurare</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {activeSessions.map(session => {
          const progress = getProgressPercentage(session);
          const stats = getAnswerStats(session);
          const MethodIcon = getMethodIcon(session.selectionMethod);
          const methodColor = getMethodColor(session.selectionMethod);

          return (
            <div
              key={session.id}
              className="bg-[#F8F6F1] p-6 rounded-3xl relative group hover:shadow-md transition-shadow flex flex-col"
            >
              {/* Watermark Icon */}
              <div className="absolute top-6 right-6 opacity-10 pointer-events-none">
                <MethodIcon size={120} />
              </div>

              {/* Header: Session Title */}
              <h3 className="text-2xl font-bold text-gray-900 mb-2 relative z-10 pr-16">
                {session.title}
              </h3>

              {/* Deck Info */}
              {session.deck && (
                <div className="flex items-center gap-2 mb-4">
                  {session.deck.subjectName && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold text-white bg-gray-900 shadow-sm">
                      {session.deck.subjectName}
                    </span>
                  )}
                  {session.deck.topic && (
                    <span className="text-sm text-gray-600 font-medium">{session.deck.topic}</span>
                  )}
                </div>
              )}

              {/* Circular Progress */}
              <div className="flex items-center justify-center my-6">
                <div className="relative w-32 h-32">
                  {/* Background circle */}
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-gray-200"
                    />
                    {/* Progress circle */}
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 56}`}
                      strokeDashoffset={`${2 * Math.PI * 56 * (1 - progress / 100)}`}
                      className="text-indigo-600 transition-all duration-500"
                      strokeLinecap="round"
                    />
                  </svg>
                  {/* Center text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-gray-900">{progress}%</span>
                    <span className="text-xs text-gray-500 font-medium">
                      {session.currentCardIndex}/{session.totalCards}
                    </span>
                  </div>
                </div>
              </div>

              {/* Answer Stats */}
              <div className="text-center mb-4">
                <div className="text-sm text-gray-600 font-medium space-x-3">
                  <span className="text-green-600">✓ {stats.correct} știute</span>
                  <span className="text-red-600">✗ {stats.incorrect} greșite</span>
                  <span className="text-gray-500">⊘ {stats.skipped} sărite</span>
                </div>
              </div>

              {/* Time & Method Info */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-white/70 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500 font-medium mb-1">Timp petrecut</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatDuration(session.durationSeconds)}
                  </p>
                </div>
                <div className="bg-white/70 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500 font-medium mb-1">Metodă</p>
                  <div className={`flex items-center justify-center gap-1 ${methodColor}`}>
                    <MethodIcon size={18} />
                    <span className="text-sm font-bold capitalize">{session.selectionMethod}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-auto">
                <button
                  onClick={() => onResumeSession(session.id)}
                  className="flex-1 bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Play size={18} fill="currentColor" /> Continuă
                </button>
                <button
                  onClick={() => handleAbandon(session.id, session.title)}
                  className="p-3 border-2 border-gray-200 text-red-600 rounded-xl hover:border-red-200 hover:bg-red-50 transition-colors"
                  title="Abandonează sesiunea"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActiveSessionsList;
