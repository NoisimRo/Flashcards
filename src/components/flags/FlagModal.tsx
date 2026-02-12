import React, { useState, useEffect } from 'react';
import { X, Flag, AlertTriangle } from 'lucide-react';
import { useToast } from '../ui/Toast';
import { flagCard, flagDeck, type FlagReason } from '../../api/flags';
import type { Card } from '../../types';

interface FlagModalProps {
  type: 'card' | 'deck';
  itemId: string;
  itemTitle: string;
  card?: Card; // For card flags, show preview
  onClose: () => void;
  onSuccess?: () => void;
}

const FLAG_REASONS: { value: FlagReason; label: string; description: string }[] = [
  {
    value: 'inappropriate',
    label: 'Continut inadecvat',
    description: 'Contine limbaj ofensator sau inadecvat',
  },
  {
    value: 'incorrect_information',
    label: 'Informatii incorecte',
    description: 'Contine erori sau informatii gresite',
  },
  {
    value: 'duplicate',
    label: 'Duplicat',
    description: 'Continutul este duplicat',
  },
  {
    value: 'spam',
    label: 'Spam',
    description: 'Continut de tip spam sau fara relevanta',
  },
  {
    value: 'other',
    label: 'Altele',
    description: 'Alt motiv',
  },
];

export const FlagModal: React.FC<FlagModalProps> = ({
  type,
  itemId,
  itemTitle,
  card,
  onClose,
  onSuccess,
}) => {
  const [reason, setReason] = useState<FlagReason | ''>('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    // Prevent background scrolling
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (comment.trim().length === 0 && type === 'card') {
      toast.error('Comentariu obligatoriu', 'Te rog descrie problema identificata');
      return;
    }

    if (comment.length > 1000) {
      toast.error('Comentariu prea lung', 'Comentariul nu poate depasi 1000 de caractere');
      return;
    }

    setIsSubmitting(true);

    try {
      let response;

      if (type === 'card') {
        response = await flagCard(itemId, comment);
      } else {
        response = await flagDeck(itemId, reason !== '' ? reason : undefined, comment || undefined);
      }

      if (response.success) {
        toast.success(
          'Raport trimis!',
          'Continutul a fost raportat si va fi revizuit de moderatori'
        );
        onSuccess?.();
        onClose();
      } else {
        toast.error('Eroare', response.error?.message || 'Nu s-a putut trimite raportul');
      }
    } catch (error) {
      console.error('Error flagging content:', error);
      toast.error('Eroare', 'A aparut o eroare la trimiterea raportului');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-surface)] rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-scale-up max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle size={24} className="text-orange-600" />
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                Raporteaza {type === 'card' ? 'cardul' : 'deck-ul'}
              </h2>
            </div>
            <p className="text-sm text-[var(--text-tertiary)] mt-1">{itemTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg-tertiary)] rounded-full transition-colors"
          >
            <X size={24} className="text-[var(--text-tertiary)]" />
          </button>
        </div>

        {/* Card Preview (for card flags) - Only show front to prevent cheating */}
        {type === 'card' && card && (
          <div
            className="mb-6 p-4 rounded-xl border"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              borderColor: 'var(--border-secondary)',
            }}
          >
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-tertiary)' }}>
              PREVIEW CARD
            </p>
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Fata:
              </p>
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                {card.front}
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Reason (for deck flags) */}
          {type === 'deck' && (
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">
                Motivul raportarii (optional)
              </label>
              <div className="space-y-2">
                {FLAG_REASONS.map(flagReason => (
                  <label
                    key={flagReason.value}
                    className="flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors"
                    style={{
                      borderColor:
                        reason === flagReason.value ? '#f97316' : 'var(--border-secondary)',
                      backgroundColor:
                        reason === flagReason.value ? 'var(--color-accent-light)' : 'transparent',
                    }}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={flagReason.value}
                      checked={reason === flagReason.value}
                      onChange={e => setReason(e.target.value as FlagReason)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {flagReason.label}
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)]">
                        {flagReason.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Comment */}
          <div>
            <label
              htmlFor="comment"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
            >
              Detalii {type === 'card' && <span className="text-red-500">*</span>}
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={4}
              maxLength={1000}
              required={type === 'card'}
              placeholder={
                type === 'card'
                  ? 'Descrie problema cu acest card...'
                  : 'Ofera detalii suplimentare (optional)...'
              }
              className="w-full px-4 py-3 border border-[var(--input-border)] rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none bg-[var(--input-bg)]"
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-[var(--text-tertiary)]">Maxim 1000 de caractere</p>
              <p className="text-xs text-[var(--text-tertiary)]">{comment.length}/1000</p>
            </div>
          </div>

          {/* Info */}
          <div
            className="rounded-xl p-4"
            style={{
              backgroundColor: 'var(--color-accent-light)',
              border: '1px solid var(--border-secondary)',
            }}
          >
            <div className="flex gap-3">
              <Flag
                size={20}
                className="flex-shrink-0 mt-0.5"
                style={{ color: 'var(--color-accent)' }}
              />
              <div>
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                  Raportul tau este anonim
                </p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Echipa de moderatori va revizui raportul tau si va lua masurile necesare. Vei fi
                  notificat despre rezultat.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 border border-[var(--border-primary)] text-[var(--text-secondary)] rounded-xl font-medium hover:bg-[var(--bg-surface-hover)] transition-colors disabled:opacity-50"
            >
              Anuleaza
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-xl font-medium hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Se trimite...' : 'Trimite raportul'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
