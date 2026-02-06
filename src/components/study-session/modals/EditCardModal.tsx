import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, Plus, Trash2 } from 'lucide-react';
import { Card, CardType } from '../../../types/models';
import { updateCard, UpdateCardRequest } from '../../../api/cards';
import { TagInput } from '../../ui/TagInput';

interface EditCardModalProps {
  card: Card;
  onClose: () => void;
  onSave: (updatedCard: Card) => void;
  existingTags?: string[];
}

/**
 * EditCardModal - Unified single-card editor used across the app.
 * Used in study sessions, EditCardsModal (MyDecks & GlobalDecks), etc.
 * Allows editing all card fields: type, front, back, context, options, tags.
 */
export const EditCardModal: React.FC<EditCardModalProps> = ({
  card,
  onClose,
  onSave,
  existingTags = [],
}) => {
  const { t } = useTranslation('decks');

  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);
  const [context, setContext] = useState(card.context || '');
  const [type, setType] = useState<CardType>(card.type);
  const [options, setOptions] = useState<string[]>(card.options || ['', '', '', '']);
  const [correctOptionIndices, setCorrectOptionIndices] = useState<number[]>(
    card.correctOptionIndices || []
  );
  const [tags, setTags] = useState<string[]>(card.tags || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Reset form when card changes
  useEffect(() => {
    setFront(card.front);
    setBack(card.back);
    setContext(card.context || '');
    setType(card.type);
    setOptions(card.options || ['', '', '', '']);
    setCorrectOptionIndices(card.correctOptionIndices || []);
    setTags(card.tags || []);
    setError('');
  }, [card]);

  const hasOptions = type === 'quiz' || type === 'multiple-answer' || type === 'type-answer';

  const handleAddOption = () => {
    setOptions([...options, '']);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
    setCorrectOptionIndices(
      correctOptionIndices.filter(i => i !== index).map(i => (i > index ? i - 1 : i))
    );
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleCorrectToggle = (index: number) => {
    if (type === 'quiz') {
      setCorrectOptionIndices([index]);
    } else {
      setCorrectOptionIndices(prev =>
        prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
      );
    }
  };

  const handleSave = async () => {
    if (!front.trim() || !back.trim()) {
      setError(t('editCardModal.errorRequired'));
      return;
    }

    if (hasOptions) {
      const nonEmptyOptions = options.filter(o => o.trim());
      if (nonEmptyOptions.length < 2) {
        setError(t('editCardModal.errorMinOptions'));
        return;
      }
      if (correctOptionIndices.length === 0) {
        setError(t('editCardModal.errorNoCorrect'));
        return;
      }
    }

    setSaving(true);
    setError('');

    try {
      const data: UpdateCardRequest = {
        front: front.trim(),
        back: back.trim(),
        context: context.trim() || undefined,
        type,
        tags: tags.length > 0 ? tags : undefined,
      };

      if (hasOptions) {
        data.options = options.filter(o => o.trim());
        data.correctOptionIndices = correctOptionIndices;
      }

      const res = await updateCard(card.deckId, card.id, data);
      if (res?.success && res?.data) {
        onSave({
          ...card,
          front: data.front!,
          back: data.back!,
          context: data.context,
          type: data.type!,
          options: data.options,
          correctOptionIndices: data.correctOptionIndices,
          tags: data.tags,
        });
      } else {
        setError(t('editCardModal.errorSave'));
      }
    } catch {
      setError(t('editCardModal.errorPermission'));
    } finally {
      setSaving(false);
    }
  };

  const cardTypes = [
    { value: 'standard' as CardType, label: t('editCardModal.typeStandard') },
    { value: 'quiz' as CardType, label: t('editCardModal.typeQuiz') },
    { value: 'multiple-answer' as CardType, label: t('editCardModal.typeMultipleAnswer') },
    { value: 'type-answer' as CardType, label: t('editCardModal.typeAnswer') },
  ];

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{t('editCardModal.title')}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}

          {/* Card Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {t('editCardModal.cardType')}
            </label>
            <select
              value={type}
              onChange={e => setType(e.target.value as CardType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {cardTypes.map(ct => (
                <option key={ct.value} value={ct.value}>
                  {ct.label}
                </option>
              ))}
            </select>
          </div>

          {/* Front (Question) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {t('editCardModal.front')}
            </label>
            <textarea
              value={front}
              onChange={e => setFront(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Back (Answer) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {t('editCardModal.back')}
            </label>
            <textarea
              value={back}
              onChange={e => setBack(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Context */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {t('editCardModal.context')}
            </label>
            <textarea
              value={context}
              onChange={e => setContext(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
              placeholder={t('editCardModal.contextPlaceholder')}
            />
          </div>

          {/* Options (for quiz, multiple-answer, type-answer) */}
          {hasOptions && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('editCardModal.optionsLabel')}{' '}
                {type === 'quiz'
                  ? t('editCardModal.optionsSingle')
                  : t('editCardModal.optionsMultiple')}
              </label>
              <div className="space-y-2">
                {options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type={type === 'quiz' ? 'radio' : 'checkbox'}
                      name="correctOption"
                      checked={correctOptionIndices.includes(index)}
                      onChange={() => handleCorrectToggle(index)}
                      className="w-4 h-4 text-indigo-600"
                    />
                    <input
                      type="text"
                      value={option}
                      onChange={e => handleOptionChange(index, e.target.value)}
                      placeholder={t('editCardModal.optionPlaceholder', { number: index + 1 })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    />
                    {options.length > 2 && (
                      <button
                        onClick={() => handleRemoveOption(index)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={handleAddOption}
                className="mt-2 flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                <Plus size={16} />
                {t('editCardModal.addOption')}
              </button>
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {t('editCardModal.tags')}
            </label>
            <TagInput
              tags={tags}
              onChange={setTags}
              existingTags={existingTags}
              placeholder={t('editCardsModal.tagsPlaceholder')}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors"
          >
            {t('editCardModal.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? t('editCardModal.saving') : t('editCardModal.save')}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};
