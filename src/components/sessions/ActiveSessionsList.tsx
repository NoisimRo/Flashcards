import React, { useEffect, useState } from 'react';
import {
  Play,
  Trash2,
  Shuffle,
  Brain,
  CheckSquare,
  List as ListIcon,
  BookOpen,
  MoreVertical,
  Plus,
  Layers,
  Globe,
} from 'lucide-react';
import { useStudySessionsStore } from '../../store/studySessionsStore';
import { useToast } from '../ui/Toast';
import { getLanguageFlag, SUBJECTS } from '../../constants/subjects';

interface ActiveSessionsListProps {
  onResumeSession: (sessionId: string) => void;
  decks?: any[];
  onChangeView?: (view: string) => void;
  onCreateDeck?: () => void;
  isGuest?: boolean;
}

const ActiveSessionsList: React.FC<ActiveSessionsListProps> = ({
  onResumeSession,
  decks = [],
  onChangeView,
  onCreateDeck,
  isGuest = false,
}) => {
  const toast = useToast();
  const { activeSessions, isLoading, fetchActiveSessions, abandonSession } =
    useStudySessionsStore();
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveSessions({ status: 'active' });
  }, [fetchActiveSessions]);

  // Close menu when clicking outside
  useEffect(() => {
    const closeMenu = () => setActiveMenuId(null);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, []);

  const handleAbandon = async (sessionId: string, title: string) => {
    if (confirm(`Sigur vrei să abandonezi sesiunea "${title}"?`)) {
      await abandonSession(sessionId);
      toast.success('Sesiune abandonată');
    }
  };

  const toggleMenu = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setActiveMenuId(activeMenuId === id ? null : id);
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
    // Show proportion of correct cards vs total cards
    const stats = getAnswerStats(session);
    if (session.totalCards === 0) return 0;
    return Math.round((stats.correct / session.totalCards) * 100);
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

  const getSubjectColor = (subject: string): string => {
    const found = SUBJECTS.find(s => s.displayName === subject);
    return found?.color || 'var(--color-accent)';
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-accent)]"></div>
      </div>
    );
  }

  if (activeSessions.length === 0) {
    // Guest users: always redirect to Global Decks
    if (isGuest) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="bg-[var(--color-accent-light)] rounded-3xl p-12 max-w-md w-full text-center shadow-lg">
            <Globe size={64} className="mx-auto text-[var(--color-accent)] mb-4" />
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3">
              Explorează Deck-urile Disponibile
            </h2>
            <p className="text-[var(--text-secondary)] mb-6">
              Descoperă sute de deck-uri create de comunitate și începe o sesiune de studiu!
            </p>
            <button
              onClick={() => {
                if (onChangeView) {
                  onChangeView('study');
                }
              }}
              className="text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center gap-2 mx-auto"
              style={{ background: 'var(--color-accent-gradient)' }}
            >
              <Globe size={20} />
              Deck-uri Globale
            </button>
          </div>
        </div>
      );
    }

    // Scenario A: No decks exist (authenticated users)
    if (decks.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="bg-[var(--color-accent-light)] rounded-3xl p-12 max-w-md w-full text-center shadow-lg">
            <Layers size={64} className="mx-auto text-[var(--color-accent)] mb-4" />
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3">
              Creează prima colecție de flashcards
            </h2>
            <p className="text-[var(--text-secondary)] mb-6">
              Pentru a începe o sesiune de studiu, mai întâi trebuie să creezi un deck cu carduri.
            </p>
            <button
              onClick={onCreateDeck}
              className="text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center gap-2 mx-auto"
              style={{ background: 'var(--color-accent-gradient)' }}
            >
              <Plus size={20} />
              Deck nou
            </button>
          </div>
        </div>
      );
    }

    // Scenario B: Decks exist but no active sessions (authenticated users)
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="bg-green-500/10 rounded-3xl p-12 max-w-md w-full text-center shadow-lg">
          <Brain size={64} className="mx-auto text-green-500 mb-4" />
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3">
            Creează o sesiune de studiu
          </h2>
          <p className="text-[var(--text-secondary)] mb-6">
            Nu ai nicio sesiune activă. Începe o sesiune nouă pentru a învăța!
          </p>
          <button
            onClick={() => {
              if (onChangeView) {
                onChangeView('decks');
              }
            }}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center gap-2 mx-auto"
          >
            <Plus size={20} />
            Sesiune nouă
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 h-full overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Sesiuni Active</h1>
          <p className="text-[var(--text-tertiary)]">
            {activeSessions.length} sesiuni de învățare în desfășurare
          </p>
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
              className="bg-[var(--card-bg)] p-6 rounded-3xl relative group hover:shadow-md transition-shadow flex flex-col border border-[var(--card-border)]"
            >
              {/* Watermark Icon */}
              <div className="absolute top-6 right-6 opacity-10 pointer-events-none">
                <MethodIcon size={120} />
              </div>

              {/* Three-Dot Menu (top-right corner) */}
              <div className="absolute top-4 right-4 z-20">
                <div className="relative">
                  <button
                    onClick={e => toggleMenu(e, session.id)}
                    className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-full hover:bg-[var(--bg-tertiary)] transition-colors"
                  >
                    <MoreVertical size={18} />
                  </button>

                  {activeMenuId === session.id && (
                    <div className="absolute right-0 top-8 bg-[var(--bg-elevated)] shadow-xl rounded-xl p-2 min-w-[180px] z-10 border border-[var(--border-subtle)] animate-fade-in">
                      {/* Abandonează sesiunea */}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleAbandon(session.id, session.title);
                          setActiveMenuId(null);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-lg flex items-center gap-2 font-medium"
                      >
                        <Trash2 size={16} /> Abandonează sesiunea
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Row 1: Topic as primary title */}
              <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-2 pr-16 relative z-10">
                {session.deck?.topic || session.title || 'Sesiune'}
              </h3>

              {/* Row 2: Flag + Subject pill */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg leading-none" title={session.deck?.language || 'ro'}>
                  {getLanguageFlag(session.deck?.language)}
                </span>
                {session.deck?.subjectName && (
                  <span
                    className="px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm"
                    style={{ backgroundColor: getSubjectColor(session.deck.subjectName) }}
                  >
                    {session.deck.subjectName}
                  </span>
                )}
              </div>

              {/* Row 3: Metadata - Cards Count | Method */}
              <div className="flex items-center gap-2 mb-4 text-sm text-[var(--text-secondary)] font-medium">
                <span>{session.totalCards} carduri</span>
                <span className="text-[var(--text-muted)]">|</span>
                <div className={`flex items-center gap-1 ${methodColor}`}>
                  <MethodIcon size={16} />
                  <span className="capitalize">{session.selectionMethod}</span>
                </div>
              </div>

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
                      className="text-[var(--border-secondary)]"
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
                      className="text-[var(--color-accent)] transition-all duration-500"
                      strokeLinecap="round"
                    />
                  </svg>
                  {/* Center text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-[var(--text-primary)]">
                      {progress}%
                    </span>
                    <span className="text-xs text-[var(--text-tertiary)] font-medium">
                      {session.currentCardIndex}/{session.totalCards}
                    </span>
                  </div>
                </div>
              </div>

              {/* Answer Stats */}
              <div className="text-center mb-4">
                <div className="text-sm text-[var(--text-secondary)] font-medium space-x-3">
                  <span className="text-green-500">✓ {stats.correct} știute</span>
                  <span className="text-red-500">✗ {stats.incorrect} greșite</span>
                  <span className="text-[var(--text-tertiary)]">⊘ {stats.skipped} sărite</span>
                </div>
              </div>

              {/* Time Info */}
              <div className="bg-[var(--bg-surface)]/70 rounded-xl p-3 text-center mb-6 border border-[var(--border-subtle)]">
                <p className="text-xs text-[var(--text-tertiary)] font-medium mb-1">
                  Timp petrecut
                </p>
                <p className="text-lg font-bold text-[var(--text-primary)]">
                  {formatDuration(session.durationSeconds)}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-auto">
                <button
                  onClick={() => onResumeSession(session.id)}
                  className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Play size={18} fill="currentColor" /> Continuă
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
