import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Star,
  Flame,
  Clock,
  BookOpen,
  GraduationCap,
  Target,
  AlertTriangle,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  TrendingUp,
  Brain,
  Award,
} from 'lucide-react';
import { useToast } from '../../ui/Toast';
import { getStudentDetail, generateAIReport, getStudentReports } from '../../../api/catalog';
import type { StudentDetail, ProgressReport } from '../../../types';
import { AVATARS } from '../Settings/AvatarPicker';

function getAvatarEmoji(avatarId?: string): string | null {
  if (!avatarId || avatarId === 'default') return null;
  const avatar = AVATARS.find(a => a.id === avatarId);
  return avatar?.emoji || null;
}

const GRADE_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  excelent: { label: 'Excelent', color: 'text-green-700', bgColor: 'bg-green-100' },
  bun: { label: 'Bun', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  satisfăcător: { label: 'Satisfacator', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  satisfacator: { label: 'Satisfacator', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  'necesită îmbunătățire': {
    label: 'Necesita imbunatatire',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
  },
  'necesita imbunatatire': {
    label: 'Necesita imbunatatire',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
  },
  nesatisfacator: {
    label: 'Nesatisfacator',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
  },
};

interface Props {
  studentId: string;
  onBack: () => void;
}

export const StudentDetailView: React.FC<Props> = ({ studentId, onBack }) => {
  const toast = useToast();
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [report, setReport] = useState<ProgressReport | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [previousReports, setPreviousReports] = useState<ProgressReport[]>([]);
  const [showPreviousReports, setShowPreviousReports] = useState(false);
  const [showAllIncorrect, setShowAllIncorrect] = useState(false);

  useEffect(() => {
    loadDetail();
    loadReports();
  }, [studentId]);

  const loadDetail = async () => {
    setIsLoading(true);
    try {
      const response = await getStudentDetail(studentId);
      if (response.success && response.data) {
        setDetail(response.data as StudentDetail);
      } else {
        toast.error('Eroare', 'Nu s-au putut incarca detaliile elevului');
      }
    } catch (error) {
      console.error('Error loading student detail:', error);
      toast.error('Eroare', 'A aparut o eroare la incarcarea datelor');
    } finally {
      setIsLoading(false);
    }
  };

  const loadReports = async () => {
    try {
      const response = await getStudentReports(studentId);
      if (response.success && response.data) {
        setPreviousReports(response.data as ProgressReport[]);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      const response = await generateAIReport(studentId);
      if (response.success && response.data) {
        setReport(response.data as ProgressReport);
        loadReports();
        toast.success(
          'Raport generat',
          (response.data as ProgressReport).cached
            ? 'Raport incarcat din cache (< 24h)'
            : 'Raport nou generat cu AI'
        );
      } else {
        toast.error('Eroare', response.error?.message || 'Nu s-a putut genera raportul');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Eroare', 'A aparut o eroare la generarea raportului AI');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-2 text-[var(--text-tertiary)]" size={32} />
          <p className="text-[var(--text-tertiary)]">Se incarca detaliile elevului...</p>
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] p-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6"
        >
          <ArrowLeft size={20} />
          Inapoi la catalog
        </button>
        <div className="text-center">
          <p className="text-[var(--text-tertiary)]">Elevul nu a fost gasit</p>
        </div>
      </div>
    );
  }

  const {
    user,
    cardStats,
    weeklyProgress,
    frequentlyIncorrectCards,
    decksStudied,
    subjectBreakdown,
  } = detail;
  const accuracy =
    user.totalAnswers > 0 ? Math.round((user.totalCorrectAnswers / user.totalAnswers) * 100) : 0;
  const avatarEmoji = getAvatarEmoji(user.avatar);
  const displayedIncorrect = showAllIncorrect
    ? frequentlyIncorrectCards
    : frequentlyIncorrectCards.slice(0, 5);

  const activeReport = report || (previousReports.length > 0 ? previousReports[0] : null);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          Inapoi la catalog
        </button>

        {/* Student Header */}
        <div className="bg-[var(--card-bg)] rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl"
              style={{
                background: 'var(--color-accent-gradient)',
                color: 'var(--text-inverse)',
              }}
            >
              {avatarEmoji ? (
                <span className="text-3xl">{avatarEmoji}</span>
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">{user.name}</h1>
              <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                <span>{user.email}</span>
                <span className="px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-xs font-medium">
                  Nivel {user.level}
                </span>
                <span>Inregistrat: {new Date(user.createdAt).toLocaleDateString('ro-RO')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {[
            {
              icon: Star,
              label: 'XP Total',
              value: user.totalXP.toLocaleString('ro-RO'),
              color: '#eab308',
            },
            { icon: Flame, label: 'Streak', value: `${user.streak} zile`, color: '#f97316' },
            {
              icon: Target,
              label: 'Acuratete',
              value: `${accuracy}%`,
              color: accuracy >= 80 ? '#22c55e' : accuracy >= 60 ? '#f59e0b' : '#ef4444',
            },
            {
              icon: GraduationCap,
              label: 'Carduri invatate',
              value: String(user.totalCardsLearned),
              color: '#22c55e',
            },
            {
              icon: BookOpen,
              label: 'Deck-uri completate',
              value: String(user.totalDecksCompleted),
              color: '#3b82f6',
            },
            {
              icon: Clock,
              label: 'Timp total',
              value: `${user.totalTimeSpent} min`,
              color: '#8b5cf6',
            },
          ].map(stat => (
            <div
              key={stat.label}
              className="bg-[var(--card-bg)] rounded-xl p-4 shadow-sm text-center"
            >
              <stat.icon size={20} className="mx-auto mb-1" style={{ color: stat.color }} />
              <div className="text-lg font-bold text-[var(--text-primary)]">{stat.value}</div>
              <div className="text-xs text-[var(--text-tertiary)]">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Card Status Breakdown */}
          <div className="bg-[var(--card-bg)] rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Status carduri</h2>
            <div className="space-y-3">
              {[
                { label: 'Noi', count: cardStats.statusCounts.new, color: '#94a3b8' },
                {
                  label: 'In curs de invatare',
                  count: cardStats.statusCounts.learning,
                  color: '#f59e0b',
                },
                {
                  label: 'In revizuire',
                  count: cardStats.statusCounts.reviewing,
                  color: '#3b82f6',
                },
                { label: 'Masterizate', count: cardStats.statusCounts.mastered, color: '#22c55e' },
              ].map(item => {
                const total =
                  cardStats.statusCounts.new +
                  cardStats.statusCounts.learning +
                  cardStats.statusCounts.reviewing +
                  cardStats.statusCounts.mastered;
                const pct = total > 0 ? (item.count / total) * 100 : 0;
                return (
                  <div key={item.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[var(--text-secondary)]">{item.label}</span>
                      <span className="font-medium text-[var(--text-primary)]">{item.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Subject Breakdown */}
          <div className="bg-[var(--card-bg)] rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">
              Performanta pe materii
            </h2>
            {subjectBreakdown.length === 0 ? (
              <p className="text-[var(--text-tertiary)] text-sm">
                Nicio sesiune de studiu completata
              </p>
            ) : (
              <div className="space-y-3">
                {subjectBreakdown.map(s => (
                  <div key={s.subject}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[var(--text-secondary)]">{s.subject}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--text-tertiary)]">
                          {s.sessionsCompleted} sesiuni
                        </span>
                        <span
                          className="font-medium"
                          style={{
                            color:
                              s.correctRate >= 80
                                ? '#22c55e'
                                : s.correctRate >= 60
                                  ? '#f59e0b'
                                  : '#ef4444',
                          }}
                        >
                          {Math.round(s.correctRate)}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(s.correctRate, 100)}%`,
                          backgroundColor:
                            s.correctRate >= 80
                              ? '#22c55e'
                              : s.correctRate >= 60
                                ? '#f59e0b'
                                : '#ef4444',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Weekly Progress */}
        {weeklyProgress.length > 0 && (
          <div className="bg-[var(--card-bg)] rounded-2xl p-6 shadow-sm mb-6">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">
              Progres saptamanal
            </h2>
            <div className="grid grid-cols-7 gap-2">
              {weeklyProgress.map(day => (
                <div key={day.date} className="text-center">
                  <div className="text-xs text-[var(--text-tertiary)] mb-1">
                    {new Date(day.date).toLocaleDateString('ro-RO', { weekday: 'short' })}
                  </div>
                  <div
                    className="w-full aspect-square rounded-lg flex items-center justify-center text-xs font-bold"
                    style={{
                      backgroundColor:
                        day.cardsStudied > 20
                          ? '#22c55e'
                          : day.cardsStudied > 10
                            ? '#86efac'
                            : day.cardsStudied > 0
                              ? '#bbf7d0'
                              : 'var(--bg-tertiary)',
                      color: day.cardsStudied > 10 ? 'white' : 'var(--text-secondary)',
                    }}
                  >
                    {day.cardsStudied}
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-1">
                    {day.timeSpentMinutes}m
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Frequently Incorrect Cards */}
        <div className="bg-[var(--card-bg)] rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <AlertTriangle size={20} className="text-orange-500" />
              Carduri problematice ({frequentlyIncorrectCards.length})
            </h2>
          </div>
          {frequentlyIncorrectCards.length === 0 ? (
            <p className="text-[var(--text-tertiary)] text-sm">
              Niciun card problematic identificat
            </p>
          ) : (
            <>
              <div className="space-y-3">
                {displayedIncorrect.map(card => (
                  <div key={card.id} className="p-3 bg-[var(--bg-tertiary)] rounded-xl">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-[var(--text-primary)]">
                          {card.front}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">{card.back}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-tertiary)]">
                          <span>{card.deckTitle}</span>
                          {card.subject && (
                            <>
                              <span>·</span>
                              <span>{card.subject}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1 text-red-500 text-sm font-medium">
                          <XCircle size={14} />
                          {card.timesIncorrect}
                        </div>
                        <div className="text-xs text-[var(--text-tertiary)]">
                          din {card.timesSeen} incercari
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {frequentlyIncorrectCards.length > 5 && (
                <button
                  onClick={() => setShowAllIncorrect(!showAllIncorrect)}
                  className="mt-3 text-sm font-medium text-[var(--color-accent)] hover:underline flex items-center gap-1"
                >
                  {showAllIncorrect ? (
                    <>
                      <ChevronUp size={14} /> Arata mai putine
                    </>
                  ) : (
                    <>
                      <ChevronDown size={14} /> Arata toate ({frequentlyIncorrectCards.length})
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>

        {/* AI Progress Report */}
        <div className="bg-[var(--card-bg)] rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Brain size={20} className="text-purple-500" />
              Raport AI de progres
            </h2>
            <button
              onClick={handleGenerateReport}
              disabled={isGeneratingReport}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] text-white rounded-xl font-medium hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50"
            >
              {isGeneratingReport ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Se genereaza...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  {activeReport ? 'Regenereaza raport' : 'Genereaza raport'}
                </>
              )}
            </button>
          </div>

          {activeReport ? (
            <div className="space-y-5">
              {/* Overall Grade */}
              {activeReport.overallGrade && (
                <div className="flex items-center gap-3">
                  <Award size={24} className="text-[var(--color-accent)]" />
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-bold ${
                      (GRADE_CONFIG[activeReport.overallGrade.toLowerCase()] || GRADE_CONFIG.bun)
                        .color
                    } ${
                      (GRADE_CONFIG[activeReport.overallGrade.toLowerCase()] || GRADE_CONFIG.bun)
                        .bgColor
                    }`}
                  >
                    {
                      (
                        GRADE_CONFIG[activeReport.overallGrade.toLowerCase()] || {
                          label: activeReport.overallGrade,
                        }
                      ).label
                    }
                  </span>
                  {activeReport.cached && (
                    <span className="text-xs text-[var(--text-muted)]">(din cache)</span>
                  )}
                </div>
              )}

              {/* Summary */}
              <div>
                <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                  {activeReport.summary}
                </p>
              </div>

              {/* Strengths */}
              {activeReport.strengths && activeReport.strengths.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-green-700 mb-2 flex items-center gap-1">
                    <CheckCircle size={16} />
                    Puncte tari
                  </h3>
                  <ul className="space-y-1">
                    {activeReport.strengths.map((s, i) => (
                      <li
                        key={i}
                        className="text-sm text-[var(--text-secondary)] flex items-start gap-2"
                      >
                        <span className="text-green-500 mt-0.5 shrink-0">+</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Weaknesses */}
              {activeReport.weaknesses && activeReport.weaknesses.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-orange-700 mb-2 flex items-center gap-1">
                    <AlertTriangle size={16} />
                    Puncte slabe
                  </h3>
                  <ul className="space-y-1">
                    {activeReport.weaknesses.map((w, i) => (
                      <li
                        key={i}
                        className="text-sm text-[var(--text-secondary)] flex items-start gap-2"
                      >
                        <span className="text-orange-500 mt-0.5 shrink-0">-</span>
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {activeReport.recommendations && activeReport.recommendations.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-blue-700 mb-2 flex items-center gap-1">
                    <TrendingUp size={16} />
                    Recomandari
                  </h3>
                  <ul className="space-y-1">
                    {activeReport.recommendations.map((r, i) => (
                      <li
                        key={i}
                        className="text-sm text-[var(--text-secondary)] flex items-start gap-2"
                      >
                        <span className="text-blue-500 mt-0.5 shrink-0">{i + 1}.</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Subject Breakdown from AI */}
              {activeReport.subjectBreakdown && activeReport.subjectBreakdown.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] mb-2">
                    Analiza pe materii
                  </h3>
                  <div className="space-y-2">
                    {activeReport.subjectBreakdown.map((s, i) => (
                      <div key={i} className="p-3 bg-[var(--bg-tertiary)] rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-[var(--text-primary)]">
                            {s.subject}
                          </span>
                          <span className="text-xs font-medium text-[var(--text-secondary)]">
                            {s.performance}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-tertiary)]">{s.notes}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Study Habits & Motivational Note */}
              {(activeReport.studyHabits || activeReport.motivationalNote) && (
                <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                  {activeReport.studyHabits && (
                    <p className="text-sm text-purple-800 mb-2">{activeReport.studyHabits}</p>
                  )}
                  {activeReport.motivationalNote && (
                    <p className="text-sm font-medium text-purple-900 italic">
                      "{activeReport.motivationalNote}"
                    </p>
                  )}
                </div>
              )}

              {/* Generated At */}
              {activeReport.generatedAt && (
                <p className="text-xs text-[var(--text-muted)]">
                  Generat: {new Date(activeReport.generatedAt).toLocaleString('ro-RO')}
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Brain size={48} className="mx-auto mb-3 text-[var(--text-muted)]" />
              <p className="text-[var(--text-tertiary)] mb-2">Niciun raport generat inca</p>
              <p className="text-xs text-[var(--text-muted)]">
                Apasa "Genereaza raport" pentru a crea o analiza AI a progresului elevului
              </p>
            </div>
          )}
        </div>

        {/* Previous Reports */}
        {previousReports.length > 1 && (
          <div className="bg-[var(--card-bg)] rounded-2xl p-6 shadow-sm mb-6">
            <button
              onClick={() => setShowPreviousReports(!showPreviousReports)}
              className="flex items-center justify-between w-full"
            >
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Rapoarte anterioare ({previousReports.length - 1})
              </h2>
              {showPreviousReports ? (
                <ChevronUp size={20} className="text-[var(--text-secondary)]" />
              ) : (
                <ChevronDown size={20} className="text-[var(--text-secondary)]" />
              )}
            </button>
            {showPreviousReports && (
              <div className="mt-4 space-y-3">
                {previousReports.slice(1).map(r => (
                  <div
                    key={r.id}
                    className="p-4 bg-[var(--bg-tertiary)] rounded-xl cursor-pointer hover:bg-[var(--bg-surface)] transition-colors"
                    onClick={() => setReport(r)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {r.overallGrade &&
                          (GRADE_CONFIG[r.overallGrade.toLowerCase()] || { label: r.overallGrade })
                            .label}
                      </span>
                      <span className="text-xs text-[var(--text-tertiary)]">
                        {new Date(r.generatedAt).toLocaleDateString('ro-RO')}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{r.summary}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Decks Studied */}
        {decksStudied.length > 0 && (
          <div className="bg-[var(--card-bg)] rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <BookOpen size={20} className="text-blue-500" />
              Deck-uri studiate ({decksStudied.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {decksStudied.map(d => (
                <span
                  key={d.id}
                  className="px-3 py-1.5 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-secondary)]"
                >
                  {d.title}
                  {d.subjectName && (
                    <span className="text-xs text-[var(--text-muted)] ml-1">({d.subjectName})</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
