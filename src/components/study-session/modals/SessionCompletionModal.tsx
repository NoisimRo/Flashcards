import React from 'react';
import { Trophy, Save, CheckCircle, RefreshCw, TrendingUp, AlertTriangle } from 'lucide-react';
import { Card, AnswerStatus } from '../../../types/models';
import '../animations/animations.css';

interface TagAccuracy {
  tag: string;
  correct: number;
  total: number;
  accuracy: number;
}

interface SessionCompletionModalProps {
  score: number;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  totalCards: number;
  xpEarned: number;
  cards: Card[];
  answers: Record<string, AnswerStatus>;
  onSaveAndExit: () => void;
  onFinishAndExit: () => void;
  onReviewMistakes?: () => void;
}

// Rotate through a palette for tag badge colors
const TAG_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-teal-100 text-teal-700',
  'bg-pink-100 text-pink-700',
  'bg-amber-100 text-amber-700',
  'bg-cyan-100 text-cyan-700',
  'bg-rose-100 text-rose-700',
  'bg-emerald-100 text-emerald-700',
];

function computeTagAccuracies(cards: Card[], answers: Record<string, AnswerStatus>): TagAccuracy[] {
  const tagMap = new Map<string, { correct: number; total: number }>();

  for (const card of cards) {
    const answer = answers[card.id];
    if (!answer || answer === 'skipped') continue;

    const cardTags = card.tags && card.tags.length > 0 ? card.tags : ['Fără tag'];

    for (const tag of cardTags) {
      const entry = tagMap.get(tag) || { correct: 0, total: 0 };
      entry.total++;
      if (answer === 'correct') entry.correct++;
      tagMap.set(tag, entry);
    }
  }

  return Array.from(tagMap.entries()).map(([tag, { correct, total }]) => ({
    tag,
    correct,
    total,
    accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
  }));
}

/**
 * SessionCompletionModal - Modal shown when all cards are completed
 * Shows Strengths vs Growth Areas grouped by card tags
 */
export const SessionCompletionModal: React.FC<SessionCompletionModalProps> = ({
  score,
  correctCount,
  incorrectCount,
  skippedCount,
  totalCards,
  xpEarned,
  cards,
  answers,
  onSaveAndExit,
  onFinishAndExit,
  onReviewMistakes,
}) => {
  const isPerfect = score === 100;
  const hasReviewableCards = incorrectCount + skippedCount > 0;

  const tagAccuracies = React.useMemo(
    () => computeTagAccuracies(cards, answers).filter(t => t.total > 1),
    [cards, answers]
  );

  // Build a stable color index map: each unique tag gets a consistent color
  const tagColorMap = React.useMemo(() => {
    const map = new Map<string, number>();
    tagAccuracies.forEach((t, i) => map.set(t.tag, i));
    return map;
  }, [tagAccuracies]);

  // Strengths: >= 80% accuracy, sorted highest first, top 3
  const strengths = tagAccuracies
    .filter(t => t.accuracy >= 80)
    .sort((a, b) => b.accuracy - a.accuracy)
    .slice(0, 3);

  // Growth areas: < 80% accuracy, sorted lowest first (most urgent), top 3
  const growthAreas = tagAccuracies
    .filter(t => t.accuracy < 80)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3);

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"
      onClick={onSaveAndExit}
    >
      <div
        className={`rounded-3xl shadow-2xl max-w-md w-full p-6 animate-scale-up max-h-[90vh] overflow-y-auto ${
          isPerfect
            ? 'bg-gradient-to-br from-yellow-50 via-amber-50 to-yellow-100 border-2 border-yellow-400'
            : 'bg-white'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* XP Earned + Score summary */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            {isPerfect ? (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 shadow-lg flex items-center justify-center">
                <Trophy className="w-7 h-7 text-white" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-indigo-600" />
              </div>
            )}
            <div>
              <div className="text-lg font-bold text-gray-900">
                {correctCount}/{totalCards} corecte
              </div>
              <div className="text-sm text-gray-500">Scor: {score}%</div>
            </div>
          </div>
          {xpEarned > 0 && (
            <div className="text-right">
              <div className="text-2xl font-black text-yellow-600">+{xpEarned}</div>
              <div className="text-xs font-semibold text-yellow-700">XP</div>
            </div>
          )}
        </div>

        {/* Perfect Score Banner */}
        {isPerfect && (
          <div className="bg-gradient-to-r from-yellow-100 to-amber-100 border-2 border-yellow-300 rounded-xl p-3 mb-5 text-center">
            <p className="text-yellow-900 font-bold">Sesiune Perfecta!</p>
          </div>
        )}

        {/* Strengths Section */}
        {strengths.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={18} className="text-green-600" />
              <h3 className="text-sm font-bold text-green-700 uppercase tracking-wide">
                Puncte Tari
              </h3>
            </div>
            <div className="space-y-2">
              {strengths.map(tag => (
                <TagProgressBar
                  key={tag.tag}
                  tag={tag}
                  variant="strength"
                  colorIndex={tagColorMap.get(tag.tag) ?? 0}
                />
              ))}
            </div>
          </div>
        )}

        {/* Growth Areas Section */}
        {growthAreas.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={18} className="text-orange-600" />
              <h3 className="text-sm font-bold text-orange-700 uppercase tracking-wide">
                Zone de Crestere
              </h3>
            </div>
            <div className="space-y-2">
              {growthAreas.map(tag => (
                <TagProgressBar
                  key={tag.tag}
                  tag={tag}
                  variant="growth"
                  colorIndex={tagColorMap.get(tag.tag) ?? 0}
                />
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 mt-5">
          {/* Review Unknown/Skipped Cards */}
          {hasReviewableCards && onReviewMistakes && (
            <button
              onClick={onReviewMistakes}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 active:scale-98"
            >
              <RefreshCw size={20} />
              Exerseaza Gresite & Sarite ({incorrectCount + skippedCount})
            </button>
          )}

          {/* Save & Exit (without syncing) */}
          <button
            onClick={onSaveAndExit}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-4 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 active:scale-98"
          >
            <Save size={20} />
            Salveaza & Iesi
          </button>

          {/* Finish & Exit (sync to backend) */}
          <button
            onClick={onFinishAndExit}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 active:scale-98"
          >
            <CheckCircle size={20} />
            Finalizeaza & Iesi
          </button>
        </div>

        {/* Helper Text */}
        <p className="text-xs text-gray-500 text-center mt-4">
          &ldquo;Salveaza & Iesi&rdquo; pastreaza progresul pentru mai tarziu.
          <br />
          &ldquo;Finalizeaza & Iesi&rdquo; marcheaza sesiunea ca completa.
        </p>
      </div>
    </div>
  );
};

/** Mini progress bar for a tag's accuracy */
const TagProgressBar: React.FC<{
  tag: TagAccuracy;
  variant: 'strength' | 'growth';
  colorIndex: number;
}> = ({ tag, variant, colorIndex }) => {
  const colorClass = TAG_COLORS[colorIndex % TAG_COLORS.length];

  const barColor =
    variant === 'strength' ? 'bg-green-500' : tag.accuracy === 0 ? 'bg-red-500' : 'bg-orange-500';

  const priorityLabel = tag.accuracy === 0 ? 'Prioritate critica' : null;

  return (
    <div className="rounded-xl bg-gray-50 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${colorClass}`}>
          {tag.tag}
        </span>
        <span className="text-sm font-bold text-gray-700">
          {tag.correct}/{tag.total} ({tag.accuracy}%)
        </span>
      </div>
      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.max(tag.accuracy, 2)}%` }}
        />
      </div>
      {priorityLabel && (
        <div className="text-xs font-semibold text-red-600 mt-1">{priorityLabel}</div>
      )}
    </div>
  );
};
