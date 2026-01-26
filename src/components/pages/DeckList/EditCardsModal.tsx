import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, DeckWithCards } from '../../../types';
import { Plus, X, Edit, Trash2, Save } from 'lucide-react';
import { createCard, updateCard, deleteCard as deleteCardAPI } from '../../../api/cards';
import { useToast } from '../../ui/Toast';

interface EditCardsModalProps {
  isOpen: boolean;
  deck: DeckWithCards | null;
  onClose: () => void;
  onDeckUpdate: (deck: DeckWithCards) => void;
}

export const EditCardsModal: React.FC<EditCardsModalProps> = ({
  isOpen,
  deck,
  onClose,
  onDeckUpdate,
}) => {
  const { t } = useTranslation('decks');
  const toast = useToast();

  // Edit card state
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editCardFront, setEditCardFront] = useState('');
  const [editCardBack, setEditCardBack] = useState('');
  const [editCardContext, setEditCardContext] = useState('');
  const [editCardType, setEditCardType] = useState<
    'standard' | 'type-answer' | 'quiz' | 'multiple-answer'
  >('standard');
  const [editCardOptions, setEditCardOptions] = useState<string[]>(['', '', '', '']);
  const [editCardCorrectIndex, setEditCardCorrectIndex] = useState(0);
  const [editCardCorrectIndices, setEditCardCorrectIndices] = useState<number[]>([]);
  const [isSavingCard, setIsSavingCard] = useState(false);

  const startEditCard = (card: Card) => {
    setEditingCardId(card.id);
    setEditCardFront(card.front);
    setEditCardBack(card.back);
    setEditCardContext(card.context || '');
    setEditCardType(card.type);
    if (card.type === 'quiz' && card.options && card.options.length > 0) {
      setEditCardOptions([...card.options]);
      setEditCardCorrectIndex(card.correctOptionIndex || 0);
      setEditCardCorrectIndices([]);
    } else if (card.type === 'multiple-answer' && card.options && card.options.length > 0) {
      setEditCardOptions([...card.options]);
      setEditCardCorrectIndices(card.correctOptionIndices || []);
      setEditCardCorrectIndex(0);
    } else {
      setEditCardOptions(['', '', '', '']);
      setEditCardCorrectIndex(0);
      setEditCardCorrectIndices([]);
    }
  };

  const cancelEditCard = () => {
    setEditingCardId(null);
    setEditCardFront('');
    setEditCardBack('');
    setEditCardContext('');
  };

  const saveEditCard = async () => {
    if (!deck || !editingCardId) return;

    setIsSavingCard(true);
    try {
      const updateData: Record<string, unknown> = {
        front: editCardFront,
        back: editCardBack,
        context: editCardContext || undefined,
        type: editCardType,
      };

      // Add quiz-specific fields if needed
      if (editCardType === 'quiz') {
        updateData.options = editCardOptions.filter(opt => opt.trim() !== '');
        updateData.correctOptionIndex = editCardCorrectIndex;
      } else if (editCardType === 'multiple-answer') {
        updateData.options = editCardOptions.filter(opt => opt.trim() !== '');
        updateData.correctOptionIndices = editCardCorrectIndices;
      }

      const response = await updateCard(deck.id, editingCardId, updateData);

      if (response.success) {
        // Update local state with API response
        const updatedCards = deck.cards.map(card =>
          card.id === editingCardId
            ? {
                ...card,
                front: editCardFront,
                back: editCardBack,
                context: editCardContext,
                type: editCardType,
                options:
                  editCardType === 'quiz' || editCardType === 'multiple-answer'
                    ? editCardOptions
                    : undefined,
                correctOptionIndex: editCardType === 'quiz' ? editCardCorrectIndex : undefined,
                correctOptionIndices:
                  editCardType === 'multiple-answer' ? editCardCorrectIndices : undefined,
              }
            : card
        );

        const updatedDeck = { ...deck, cards: updatedCards };
        onDeckUpdate(updatedDeck);
        cancelEditCard();
        toast.success(t('toast.cardUpdated'));
      } else {
        toast.error(response.error?.message || t('toast.cardUpdateError'));
      }
    } catch (error) {
      console.error('Error updating card:', error);
      toast.error(t('toast.cardUpdateError'));
    } finally {
      setIsSavingCard(false);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!deck) return;
    if (!confirm(t('editCardsModal.deleteConfirm'))) return;

    try {
      const response = await deleteCardAPI(deck.id, cardId);

      if (response.success) {
        const updatedCards = deck.cards.filter(card => card.id !== cardId);
        const updatedDeck = {
          ...deck,
          cards: updatedCards,
          totalCards: updatedCards.length,
        };
        onDeckUpdate(updatedDeck);
        toast.success(t('toast.cardDeleted'));
      } else {
        toast.error(response.error?.message || t('toast.cardDeleteError'));
      }
    } catch (error) {
      console.error('Error deleting card:', error);
      toast.error(t('toast.cardDeleteError'));
    }
  };

  const addNewCard = async () => {
    if (!deck) return;

    try {
      const response = await createCard({
        deckId: deck.id,
        front: t('editCardsModal.newQuestion'),
        back: t('editCardsModal.newAnswer'),
        context: '',
        type: 'standard',
      });

      if (response.success && response.data) {
        const newCard: Card = response.data;

        const updatedCards = [...deck.cards, newCard];
        const updatedDeck = {
          ...deck,
          cards: updatedCards,
          totalCards: updatedCards.length,
        };
        onDeckUpdate(updatedDeck);
        startEditCard(newCard);
        toast.success(t('toast.cardAdded'));
      } else {
        toast.error(response.error?.message || t('toast.cardAddError'));
      }
    } catch (error) {
      console.error('Error creating card:', error);
      toast.error(t('toast.cardAddError'));
    }
  };

  const handleClose = () => {
    cancelEditCard();
    onClose();
  };

  if (!isOpen || !deck) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl animate-scale-up flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t('editCardsModal.title')}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {t('editCardsModal.subtitle', {
                title: deck.title,
                count: deck.cards.length,
              })}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Cards List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {deck.cards.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="font-medium">{t('editCardsModal.noCards')}</p>
              <p className="text-sm mt-1">{t('editCardsModal.addFirstCard')}</p>
            </div>
          ) : (
            deck.cards.map((card, index) => (
              <div
                key={card.id}
                className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-indigo-300 transition-colors"
              >
                {editingCardId === card.id ? (
                  // Edit Mode
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                        {t('editCardsModal.front')}
                      </label>
                      <input
                        type="text"
                        className="w-full border-2 border-gray-200 bg-white rounded-lg p-2 font-medium focus:border-indigo-500 outline-none"
                        value={editCardFront}
                        onChange={e => setEditCardFront(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                        {t('editCardsModal.back')}
                      </label>
                      <input
                        type="text"
                        className="w-full border-2 border-gray-200 bg-white rounded-lg p-2 font-medium focus:border-indigo-500 outline-none"
                        value={editCardBack}
                        onChange={e => setEditCardBack(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                        {t('editCardsModal.context')}
                      </label>
                      <input
                        type="text"
                        className="w-full border-2 border-gray-200 bg-white rounded-lg p-2 font-medium focus:border-indigo-500 outline-none"
                        value={editCardContext}
                        onChange={e => setEditCardContext(e.target.value)}
                        placeholder={t('editCardsModal.contextPlaceholder')}
                      />
                    </div>

                    {/* Card Type Selection */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                        {t('editCardsModal.cardType')}
                      </label>
                      <select
                        className="w-full border-2 border-gray-200 bg-white rounded-lg p-2 font-medium focus:border-indigo-500 outline-none"
                        value={editCardType}
                        onChange={e =>
                          setEditCardType(
                            e.target.value as
                              | 'standard'
                              | 'type-answer'
                              | 'quiz'
                              | 'multiple-answer'
                          )
                        }
                      >
                        <option value="standard">{t('modal.standard')}</option>
                        <option value="type-answer">{t('modal.typeAnswer')}</option>
                        <option value="quiz">{t('modal.quiz')}</option>
                        <option value="multiple-answer">{t('modal.multipleAnswer')}</option>
                      </select>
                    </div>

                    {/* Quiz Options (only for quiz type) */}
                    {editCardType === 'quiz' && (
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase">
                          {t('editCardsModal.quizOptions')}
                        </label>
                        {editCardOptions.map((option, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="correctOption"
                              checked={editCardCorrectIndex === idx}
                              onChange={() => setEditCardCorrectIndex(idx)}
                              className="w-4 h-4 text-indigo-600"
                            />
                            <input
                              type="text"
                              className="flex-1 border-2 border-gray-200 bg-white rounded-lg p-2 text-sm font-medium focus:border-indigo-500 outline-none"
                              value={option}
                              onChange={e => {
                                const newOptions = [...editCardOptions];
                                newOptions[idx] = e.target.value;
                                setEditCardOptions(newOptions);
                              }}
                              placeholder={t('editCardsModal.option', { number: idx + 1 })}
                            />
                          </div>
                        ))}
                        <p className="text-xs text-gray-500">{t('editCardsModal.selectCorrect')}</p>
                      </div>
                    )}

                    {/* Multiple Answer Options (only for multiple-answer type) */}
                    {editCardType === 'multiple-answer' && (
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase">
                          {t('editCardsModal.multipleAnswerOptions')}
                        </label>
                        {editCardOptions.map((option, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={editCardCorrectIndices.includes(idx)}
                              onChange={() => {
                                setEditCardCorrectIndices(prev =>
                                  prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
                                );
                              }}
                              className="w-4 h-4 text-indigo-600 rounded"
                            />
                            <input
                              type="text"
                              className="flex-1 border-2 border-gray-200 bg-white rounded-lg p-2 text-sm font-medium focus:border-indigo-500 outline-none"
                              value={option}
                              onChange={e => {
                                const newOptions = [...editCardOptions];
                                newOptions[idx] = e.target.value;
                                setEditCardOptions(newOptions);
                              }}
                              placeholder={t('editCardsModal.option', { number: idx + 1 })}
                            />
                          </div>
                        ))}
                        <p className="text-xs text-gray-500">
                          {t('editCardsModal.selectMultipleCorrect')}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={saveEditCard}
                        disabled={isSavingCard}
                        className="flex-1 bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Save size={16} />{' '}
                        {isSavingCard ? t('editCardsModal.saving') : t('editCardsModal.save')}
                      </button>
                      <button
                        onClick={cancelEditCard}
                        className="flex-1 bg-white border-2 border-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        {t('editCardsModal.cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-gray-400 uppercase">
                        {t('editCardsModal.cardNumber', { number: index + 1 })}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditCard(card)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title={t('editCardsModal.edit')}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteCard(card.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title={t('editCardsModal.delete')}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-bold text-gray-500">
                          {t('editCardsModal.question')}
                        </p>
                        <p className="text-sm font-medium text-gray-900">{card.front}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-500">
                          {t('editCardsModal.answer')}
                        </p>
                        <p className="text-sm font-medium text-gray-900">{card.back}</p>
                      </div>
                      {card.context && (
                        <div>
                          <p className="text-xs font-bold text-gray-500">
                            {t('editCardsModal.contextLabel')}
                          </p>
                          <p className="text-sm text-gray-600 italic">{card.context}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100">
          <button
            onClick={addNewCard}
            className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={20} /> {t('editCardsModal.addNewCard')}
          </button>
        </div>
      </div>
    </div>
  );
};
