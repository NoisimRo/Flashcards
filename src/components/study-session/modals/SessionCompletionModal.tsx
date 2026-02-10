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

/** Firework burst for high scores */
const Fireworks: React.FC<{ count: number }> = ({ count }) => {
  const particles = React.useMemo(() => {
    const items: {
      id: number;
      x: number;
      y: number;
      color: string;
      size: number;
      delay: number;
      angle: number;
      distance: number;
    }[] = [];
    const colors = ['#FFD700', '#FF6B35', '#FF1493', '#00E5FF', '#76FF03', '#E040FB', '#FFAB40'];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const distance = 40 + Math.random() * 60;
      items.push({
        id: i,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        color: colors[i % colors.length],
        size: 4 + Math.random() * 4,
        delay: Math.random() * 200,
        angle,
        distance,
      });
    }
    return items;
  }, [count]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2">
        {particles.map(p => (
          <div
            key={p.id}
            className="firework-particle"
            style={
              {
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                '--fw-x': `${p.x}px`,
                '--fw-y': `${p.y}px`,
                '--fw-delay': `${p.delay}ms`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
};

/** Animated number that counts up from 0 */
const CountUpNumber: React.FC<{
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
}> = ({ value, duration = 800, prefix = '', suffix = '' }) => {
  const [display, setDisplay] = React.useState(0);
  const frameRef = React.useRef<number>(0);

  React.useEffect(() => {
    if (value === 0) {
      setDisplay(0);
      return;
    }
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value, duration]);

  return (
    <span>
      {prefix}
      {display}
      {suffix}
    </span>
  );
};

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
        className="rounded-3xl shadow-2xl max-w-md w-full p-6 animate-scale-up max-h-[90vh] overflow-y-auto"
        style={
          isPerfect
            ? {
                background: 'var(--completion-modal-perfect-bg)',
                borderWidth: '2px',
                borderColor: 'var(--completion-modal-perfect-border)',
              }
            : { backgroundColor: 'var(--completion-modal-bg)' }
        }
        onClick={e => e.stopPropagation()}
      >
        {isPerfect && <Fireworks count={20} />}
        {/* XP Earned + Score summary */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            {isPerfect ? (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 shadow-lg flex items-center justify-center">
                <Trophy className="w-7 h-7 text-white" />
              </div>
            ) : (
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-accent-light)' }}
              >
                <CheckCircle className="w-7 h-7" style={{ color: 'var(--color-accent)' }} />
              </div>
            )}
            <div>
              <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                <CountUpNumber value={correctCount} duration={600} />/{totalCards} corecte
              </div>
              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Scor: <CountUpNumber value={score} duration={800} suffix="%" />
              </div>
            </div>
          </div>
          {xpEarned > 0 && (
            <div className="text-right">
              <div
                className="text-2xl font-black animate-count-up"
                style={{ color: 'var(--completion-modal-xp-text)' }}
              >
                +<CountUpNumber value={xpEarned} duration={1000} />
              </div>
              <div
                className="text-xs font-semibold"
                style={{ color: 'var(--completion-modal-xp-label)' }}
              >
                XP
              </div>
            </div>
          )}
        </div>

        {/* Perfect Score Banner */}
        {isPerfect && (
          <div
            className="rounded-xl p-3 mb-5 text-center"
            style={{
              background: 'var(--completion-modal-perfect-banner-bg)',
              borderWidth: '2px',
              borderColor: 'var(--completion-modal-perfect-banner-border)',
            }}
          >
            <p className="font-bold" style={{ color: 'var(--completion-modal-perfect-text)' }}>
              Sesiune Perfecta!
            </p>
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
            className="w-full font-bold py-4 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 active:scale-98"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
          >
            <Save size={20} />
            Salveaza & Iesi
          </button>

          {/* Finish & Exit (sync to backend) */}
          <button
            onClick={onFinishAndExit}
            className="w-full text-white font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 active:scale-98"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            <CheckCircle size={20} />
            Finalizeaza & Iesi
          </button>
        </div>

        {/* Helper Text */}
        <p className="text-xs text-center mt-4" style={{ color: 'var(--text-muted)' }}>
          &ldquo;Salveaza & Iesi&rdquo; pastreaza progresul pentru mai tarziu.
          <br />
          &ldquo;Finalizeaza & Iesi&rdquo; marchează sesiunea completă.
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
    <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${colorClass}`}>
          {tag.tag}
        </span>
        <span className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
          {tag.correct}/{tag.total} ({tag.accuracy}%)
        </span>
      </div>
      {/* Progress bar */}
      <div
        className="w-full h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: 'var(--bg-tertiary)' }}
      >
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
