import React, { useEffect } from 'react';
import { Play, Trash2, Clock, BookOpen, TrendingUp } from 'lucide-react';
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

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Acum';
    if (diffMins < 60) return `${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} zile`;
  };

  const getProgressPercentage = (session: any) => {
    return Math.round((session.currentCardIndex / session.totalCards) * 100);
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
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">
          Sesiuni Active ({activeSessions.length})
        </h3>
      </div>

      {activeSessions.map(session => {
        const progress = getProgressPercentage(session);
        const cardsLeft = session.totalCards - session.currentCardIndex;

        return (
          <div
            key={session.id}
            className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-indigo-300 transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className="font-bold text-gray-900">{session.title}</h4>
                {session.deck && (
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                    {session.deck.subjectName && (
                      <span className="font-medium">{session.deck.subjectName}</span>
                    )}
                    {session.deck.subjectName && session.deck.topic && <span>•</span>}
                    {session.deck.topic && <span>{session.deck.topic}</span>}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onResumeSession(session.id)}
                  className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <Play size={16} />
                  Continuă
                </button>
                <button
                  onClick={() => handleAbandon(session.id, session.title)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Abandonează sesiunea"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-3">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>
                  Progres: {session.currentCardIndex}/{session.totalCards} carduri
                </span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="flex items-center gap-2 text-gray-600">
                  <BookOpen size={16} />
                  <span className="text-sm font-medium">{cardsLeft} rămase</span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="flex items-center gap-2 text-gray-600">
                  <TrendingUp size={16} />
                  <span className="text-sm font-medium">Streak: {session.streak}</span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock size={16} />
                  <span className="text-sm font-medium">
                    {formatTimeAgo(session.lastActivityAt)} ago
                  </span>
                </div>
              </div>
            </div>

            {/* Method Badge */}
            <div className="mt-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                {session.selectionMethod === 'random' && '🎲 Random'}
                {session.selectionMethod === 'smart' && '🧠 Smart Review'}
                {session.selectionMethod === 'manual' && '✅ Manual'}
                {session.selectionMethod === 'all' && '📋 Toate'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ActiveSessionsList;
