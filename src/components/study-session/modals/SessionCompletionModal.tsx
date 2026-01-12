import React from 'react';
import { Trophy, Save, CheckCircle } from 'lucide-react';
import '../animations/animations.css';

interface SessionCompletionModalProps {
  score: number;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  xpEarned: number;
  onSaveAndExit: () => void;
  onFinishAndExit: () => void;
}

/**
 * SessionCompletionModal - Modal shown when all cards are completed
 * Offers two options: Save progress or Finish session
 */
export const SessionCompletionModal: React.FC<SessionCompletionModalProps> = ({
  score,
  correctCount,
  incorrectCount,
  skippedCount,
  xpEarned,
  onSaveAndExit,
  onFinishAndExit,
}) => {
  const isPerfect = score === 100;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Icon */}
        <div
          className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
            isPerfect ? 'bg-green-100' : 'bg-orange-100'
          }`}
        >
          {isPerfect ? (
            <Trophy className="w-12 h-12 text-green-600" />
          ) : (
            <CheckCircle className="w-12 h-12 text-orange-600" />
          )}
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
          {isPerfect ? 'Sesiune Perfectă!' : 'Sesiune Completată!'}
        </h2>

        {/* Score */}
        <div className="text-center mb-6">
          <div className="text-4xl font-black text-indigo-600 mb-2">{score}%</div>
          <div className="text-sm text-gray-600">
            {correctCount} corecte • {incorrectCount} greșite • {skippedCount} sărite
          </div>
        </div>

        {/* XP Earned */}
        {xpEarned > 0 && (
          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-4 mb-6 text-center">
            <div className="text-sm font-semibold text-gray-600 mb-1">XP Câștigat</div>
            <div className="text-3xl font-black text-yellow-600">+{xpEarned} XP</div>
          </div>
        )}

        {/* Perfect Score Message */}
        {isPerfect && (
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-6 text-center">
            <p className="text-green-900 font-semibold">
              🎉 Felicitări! Ai răspuns corect la toate întrebările!
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Save & Exit (without syncing) */}
          <button
            onClick={onSaveAndExit}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-4 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <Save size={20} />
            Salvează & Ieși
          </button>

          {/* Finish & Exit (sync to backend) */}
          <button
            onClick={onFinishAndExit}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2"
          >
            <CheckCircle size={20} />
            Finalizează & Ieși
          </button>
        </div>

        {/* Helper Text */}
        <p className="text-xs text-gray-500 text-center mt-4">
          &ldquo;Salvează & Ieși&rdquo; păstrează progresul pentru mai târziu.
          <br />
          &ldquo;Finalizează & Ieși&rdquo; marchează sesiunea ca completă.
        </p>
      </div>
    </div>
  );
};
