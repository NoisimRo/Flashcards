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
    label: 'Conținut inadecvat',
    description: 'Conține limbaj ofensator sau inadecvat',
  },
  {
    value: 'incorrect_information',
    label: 'Informații incorecte',
    description: 'Conține erori sau informații greșite',
  },
  {
    value: 'duplicate',
    label: 'Duplicat',
    description: 'Conținutul este duplicat',
  },
  {
    value: 'spam',
    label: 'Spam',
    description: 'Conținut de tip spam sau fără relevanță',
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
      toast.error('Comentariu obligatoriu', 'Te rog descrie problema identificată');
      return;
    }

    if (comment.length > 1000) {
      toast.error('Comentariu prea lung', 'Comentariul nu poate depăși 1000 de caractere');
      return;
    }

    setIsSubmitting(true);

    try {
      let response;

      if (type === 'card') {
        response = await flagCard(itemId, comment);
      } else {
        response = await flagDeck(
          itemId,
          reason !== '' ? reason : undefined,
          comment || undefined
        );
      }

      if (response.success) {
        toast.success(
          'Raport trimis!',
          'Conținutul a fost raportat și va fi revizuit de moderatori'
        );
        onSuccess?.();
        onClose();
      } else {
        toast.error('Eroare', response.error?.message || 'Nu s-a putut trimite raportul');
      }
    } catch (error) {
      console.error('Error flagging content:', error);
      toast.error('Eroare', 'A apărut o eroare la trimiterea raportului');
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
        className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-scale-up max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle size={24} className="text-orange-600" />
              <h2 className="text-2xl font-bold text-gray-900">
                Raportează {type === 'card' ? 'cardul' : 'deck-ul'}
              </h2>
            </div>
            <p className="text-sm text-gray-500 mt-1">{itemTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Card Preview (for card flags) */}
        {type === 'card' && card && (
          <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-xs font-medium text-gray-500 mb-2">PREVIEW CARD</p>
            <div className="space-y-2">
              <div>
                <p className="text-xs font-medium text-gray-600">Față:</p>
                <p className="text-sm text-gray-900">{card.front}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600">Spate:</p>
                <p className="text-sm text-gray-900">{card.back}</p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Reason (for deck flags) */}
          {type === 'deck' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Motivul raportării (opțional)
              </label>
              <div className="space-y-2">
                {FLAG_REASONS.map((flagReason) => (
                  <label
                    key={flagReason.value}
                    className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${
                      reason === flagReason.value
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={flagReason.value}
                      checked={reason === flagReason.value}
                      onChange={(e) => setReason(e.target.value as FlagReason)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {flagReason.label}
                      </p>
                      <p className="text-xs text-gray-500">
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
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Detalii {type === 'card' && <span className="text-red-500">*</span>}
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={1000}
              required={type === 'card'}
              placeholder={
                type === 'card'
                  ? 'Descrie problema cu acest card...'
                  : 'Oferă detalii suplimentare (opțional)...'
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-gray-500">Maxim 1000 de caractere</p>
              <p className="text-xs text-gray-500">{comment.length}/1000</p>
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex gap-3">
              <Flag size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900 mb-1">
                  Raportul tău este anonim
                </p>
                <p className="text-xs text-blue-700">
                  Echipa de moderatori va revizui raportul tău și va lua măsurile
                  necesare. Vei fi notificat despre rezultat.
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
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Anulează
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
