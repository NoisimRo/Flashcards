import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, DeckWithCards } from '../../../types';
import { Plus, X, Edit, Trash2, Tags, Search, Filter } from 'lucide-react';
import {
  createCard,
  updateCard,
  deleteCard as deleteCardAPI,
  getCardTags,
} from '../../../api/cards';
import { useToast } from '../../ui/Toast';
import { TagInput } from '../../ui/TagInput';
import { getTagColor } from '../../../utils/tagColors';
import { EditCardModal } from '../../study-session/modals/EditCardModal';

type CardType = 'standard' | 'type-answer' | 'quiz' | 'multiple-answer';

const CARD_TYPE_LABELS: Record<CardType, string> = {
  standard: 'editCardsModal.typeStandard',
  quiz: 'editCardsModal.typeQuiz',
  'type-answer': 'editCardsModal.typeAnswer',
  'multiple-answer': 'editCardsModal.typeMultipleAnswer',
};

const CARD_TYPE_STYLES: Record<CardType, { bg: string; text: string }> = {
  standard: { bg: 'var(--bg-tertiary)', text: 'var(--text-secondary)' },
  quiz: { bg: 'rgba(168, 85, 247, 0.15)', text: '#a855f7' },
  'type-answer': { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6' },
  'multiple-answer': { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b' },
};

interface EditCardsModalProps {
  isOpen: boolean;
  deck: DeckWithCards | null;
  onClose: () => void;
  onDeckUpdate: (deck: DeckWithCards) => void;
}

/** Extract all unique tags from a deck's cards */
function extractLocalTags(deck: DeckWithCards | null): string[] {
  if (!deck) return [];
  const tagSet = new Set<string>();
  deck.cards.forEach(c => (c.tags || []).forEach(t => tagSet.add(t)));
  return Array.from(tagSet).sort();
}

export const EditCardsModal: React.FC<EditCardsModalProps> = ({
  isOpen,
  deck,
  onClose,
  onDeckUpdate,
}) => {
  const { t } = useTranslation('decks');
  const toast = useToast();

  // Individual card editing via EditCardModal
  const [editingCard, setEditingCard] = useState<Card | null>(null);

  // Tag suggestion state
  const [existingTags, setExistingTags] = useState<string[]>([]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<CardType | 'all'>('all');

  // Saving state (for bulk operations)
  const [isSavingCard, setIsSavingCard] = useState(false);

  // Fetch tags for autocomplete: combine API tags + local deck tags
  useEffect(() => {
    if (isOpen && deck) {
      const localTags = extractLocalTags(deck);

      // Fetch deck-level tags from API
      const deckTagsPromise = getCardTags(deck.id).then(response =>
        response.success && response.data ? response.data : []
      );

      // Fetch all user tags from API
      const allTagsPromise = getCardTags().then(response =>
        response.success && response.data ? response.data : []
      );

      Promise.all([deckTagsPromise, allTagsPromise]).then(([deckTags, allTags]) => {
        // Merge all sources: API deck tags + API all tags + local card tags
        const merged = new Set<string>([...deckTags, ...allTags, ...localTags]);
        setExistingTags(Array.from(merged).sort());
      });
    }
  }, [isOpen, deck]);

  // Filtered cards based on search and type filter
  const filteredCards = useMemo(() => {
    if (!deck) return [];
    return deck.cards.filter(card => {
      const matchesSearch =
        searchQuery === '' ||
        card.front.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.back.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (card.context && card.context.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType = filterType === 'all' || card.type === filterType;

      return matchesSearch && matchesType;
    });
  }, [deck, searchQuery, filterType]);

  // Handle save from EditCardModal
  const handleCardSaved = (updatedCard: Card) => {
    if (!deck) return;

    const updatedCards = deck.cards.map(card => (card.id === updatedCard.id ? updatedCard : card));
    const updatedDeck = { ...deck, cards: updatedCards };
    onDeckUpdate(updatedDeck);
    setEditingCard(null);

    // Refresh tags from the updated cards
    const tagSet = new Set(existingTags);
    (updatedCard.tags || []).forEach(t => tagSet.add(t));
    setExistingTags(Array.from(tagSet).sort());

    toast.success(t('toast.cardUpdated'));
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
        setEditingCard(newCard);
        toast.success(t('toast.cardAdded'));
      } else {
        toast.error(response.error?.message || t('toast.cardAddError'));
      }
    } catch (error) {
      console.error('Error creating card:', error);
      toast.error(t('toast.cardAddError'));
    }
  };

  // Bulk edit state
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkSelectedCardIds, setBulkSelectedCardIds] = useState<Set<string>>(new Set());
  const [bulkTags, setBulkTags] = useState<string[]>([]);
  const [bulkType, setBulkType] = useState<CardType>('standard');

  // Select all visible (filtered) cards
  const handleSelectAll = () => {
    const filteredIds = filteredCards.map(c => c.id);
    const allSelected = filteredIds.every(id => bulkSelectedCardIds.has(id));

    if (allSelected) {
      const newSet = new Set(bulkSelectedCardIds);
      filteredIds.forEach(id => newSet.delete(id));
      setBulkSelectedCardIds(newSet);
    } else {
      const newSet = new Set(bulkSelectedCardIds);
      filteredIds.forEach(id => newSet.add(id));
      setBulkSelectedCardIds(newSet);
    }
  };

  const allFilteredSelected =
    filteredCards.length > 0 && filteredCards.every(c => bulkSelectedCardIds.has(c.id));

  const handleBulkApplyTags = async () => {
    if (!deck || bulkSelectedCardIds.size === 0 || bulkTags.length === 0) return;
    setIsSavingCard(true);
    try {
      const updates = Array.from(bulkSelectedCardIds).map(cardId => {
        const card = deck.cards.find(c => c.id === cardId);
        if (!card) return null;
        const mergedTags = [...(card.tags || [])];
        bulkTags.forEach(newTag => {
          if (!mergedTags.some(t => t.toLowerCase() === newTag.toLowerCase())) {
            mergedTags.push(newTag);
          }
        });
        return updateCard(deck.id, cardId, {
          front: card.front,
          back: card.back,
          context: card.context,
          type: card.type,
          options: card.options,
          correctOptionIndices: card.correctOptionIndices,
          tags: mergedTags,
        });
      });

      await Promise.all(updates.filter(Boolean));

      const updatedCards = deck.cards.map(card => {
        if (bulkSelectedCardIds.has(card.id)) {
          const mergedTags = [...(card.tags || [])];
          bulkTags.forEach(newTag => {
            if (!mergedTags.some(t => t.toLowerCase() === newTag.toLowerCase())) {
              mergedTags.push(newTag);
            }
          });
          return { ...card, tags: mergedTags };
        }
        return card;
      });
      onDeckUpdate({ ...deck, cards: updatedCards });

      // Refresh existing tags
      const tagSet = new Set(existingTags);
      updatedCards.forEach(c => (c.tags || []).forEach(t => tagSet.add(t)));
      setExistingTags(Array.from(tagSet).sort());

      const count = bulkSelectedCardIds.size;
      setBulkSelectedCardIds(new Set());
      setBulkTags([]);
      toast.success(t('toast.bulkTagsApplied', { count }));
    } catch (error) {
      console.error('Bulk tag error:', error);
      toast.error(t('toast.bulkTagsError'));
    } finally {
      setIsSavingCard(false);
    }
  };

  const handleBulkChangeType = async () => {
    if (!deck || bulkSelectedCardIds.size === 0) return;
    setIsSavingCard(true);
    try {
      const updates = Array.from(bulkSelectedCardIds).map(cardId => {
        const card = deck.cards.find(c => c.id === cardId);
        if (!card) return null;
        return updateCard(deck.id, cardId, {
          front: card.front,
          back: card.back,
          context: card.context,
          type: bulkType,
          options: card.options,
          correctOptionIndices: card.correctOptionIndices,
          tags: card.tags,
        });
      });

      await Promise.all(updates.filter(Boolean));

      const updatedCards = deck.cards.map(card => {
        if (bulkSelectedCardIds.has(card.id)) {
          return { ...card, type: bulkType };
        }
        return card;
      });
      onDeckUpdate({ ...deck, cards: updatedCards });

      const count = bulkSelectedCardIds.size;
      setBulkSelectedCardIds(new Set());
      toast.success(t('toast.bulkTypeApplied', { count }));
    } catch (error) {
      console.error('Bulk type change error:', error);
      toast.error(t('toast.bulkTypeError'));
    } finally {
      setIsSavingCard(false);
    }
  };

  const handleClose = () => {
    setEditingCard(null);
    setIsBulkMode(false);
    setBulkSelectedCardIds(new Set());
    setBulkTags([]);
    setSearchQuery('');
    setFilterType('all');
    onClose();
  };

  if (!isOpen || !deck) return null;

  const getOriginalIndex = (cardId: string) => deck.cards.findIndex(c => c.id === cardId);

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="bg-[var(--bg-surface)] rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl animate-scale-up flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-[var(--border-subtle)] flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">
              {t('editCardsModal.title')}
            </h2>
            <p className="text-sm text-[var(--text-tertiary)] mt-1">
              {t('editCardsModal.subtitle', {
                title: deck.title,
                count: deck.cards.length,
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsBulkMode(!isBulkMode);
                setBulkSelectedCardIds(new Set());
                setBulkTags([]);
              }}
              className="text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
              style={
                isBulkMode
                  ? {
                      backgroundColor: 'var(--color-accent-light)',
                      color: 'var(--color-accent-text)',
                    }
                  : {
                      color: 'var(--text-tertiary)',
                    }
              }
            >
              <Tags size={16} />
              {t('editCardsModal.bulkEdit')}
            </button>
            <button
              onClick={handleClose}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-2 hover:bg-[var(--bg-tertiary)] rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="px-6 pt-4 pb-2 flex flex-col sm:flex-row gap-2 border-b border-[var(--border-subtle)]">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              size={16}
            />
            <input
              type="text"
              placeholder={t('editCardsModal.searchPlaceholder')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-[var(--input-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-ring)] focus:border-transparent bg-[var(--input-bg)]"
            />
          </div>
          <div className="relative">
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value as CardType | 'all')}
              className="pl-3 pr-8 py-2 border border-[var(--input-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-ring)] focus:border-transparent bg-[var(--input-bg)] appearance-none"
            >
              <option value="all">{t('editCardsModal.filterByType')}</option>
              <option value="standard">{t('editCardsModal.typeStandard')}</option>
              <option value="quiz">{t('editCardsModal.typeQuiz')}</option>
              <option value="type-answer">{t('editCardsModal.typeAnswer')}</option>
              <option value="multiple-answer">{t('editCardsModal.typeMultipleAnswer')}</option>
            </select>
            <Filter
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
              size={14}
            />
          </div>
        </div>

        {/* Select All (only in bulk mode) */}
        {isBulkMode && filteredCards.length > 0 && (
          <div className="px-6 py-2 flex items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)]">
            <input
              type="checkbox"
              checked={allFilteredSelected}
              onChange={handleSelectAll}
              className="w-5 h-5 rounded border-[var(--input-border)] text-[var(--color-accent-text)] focus:ring-[var(--color-accent-ring)]"
            />
            <span className="text-sm font-medium text-[var(--text-secondary)]">
              {allFilteredSelected
                ? t('editCardsModal.deselectAll')
                : t('editCardsModal.selectAll')}
            </span>
            {bulkSelectedCardIds.size > 0 && (
              <span className="text-xs text-[var(--color-accent-text)] font-semibold ml-auto">
                {bulkSelectedCardIds.size} / {deck.cards.length}
              </span>
            )}
          </div>
        )}

        {/* Cards List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {deck.cards.length === 0 ? (
            <div className="text-center py-12 text-[var(--text-muted)]">
              <p className="font-medium">{t('editCardsModal.noCards')}</p>
              <p className="text-sm mt-1">{t('editCardsModal.addFirstCard')}</p>
            </div>
          ) : filteredCards.length === 0 ? (
            <div className="text-center py-12 text-[var(--text-muted)]">
              <Search className="mx-auto mb-3" size={32} style={{ color: 'var(--text-muted)' }} />
              <p className="font-medium">{t('editCardsModal.noCards')}</p>
            </div>
          ) : (
            filteredCards.map(card => {
              const originalIndex = getOriginalIndex(card.id);
              return (
                <div
                  key={card.id}
                  className="bg-[var(--bg-tertiary)] rounded-xl p-4 border border-[var(--border-secondary)] transition-colors"
                  style={{ ['--tw-border-opacity' as string]: 1 }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
                  onMouseLeave={e =>
                    (e.currentTarget.style.borderColor = 'var(--border-secondary)')
                  }
                >
                  {/* View Mode (always shown - edit opens as separate modal) */}
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        {isBulkMode && (
                          <input
                            type="checkbox"
                            checked={bulkSelectedCardIds.has(card.id)}
                            onChange={() => {
                              const newSet = new Set(bulkSelectedCardIds);
                              if (newSet.has(card.id)) newSet.delete(card.id);
                              else newSet.add(card.id);
                              setBulkSelectedCardIds(newSet);
                            }}
                            className="w-5 h-5 rounded border-[var(--input-border)] text-[var(--color-accent-text)] focus:ring-[var(--color-accent-ring)]"
                          />
                        )}
                        <span className="text-xs font-bold text-[var(--text-muted)] uppercase">
                          {t('editCardsModal.cardNumber', { number: originalIndex + 1 })}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{
                            backgroundColor: CARD_TYPE_STYLES[card.type].bg,
                            color: CARD_TYPE_STYLES[card.type].text,
                          }}
                        >
                          {t(CARD_TYPE_LABELS[card.type])}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingCard(card)}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: 'var(--color-accent-text)' }}
                          onMouseEnter={e =>
                            (e.currentTarget.style.backgroundColor = 'var(--color-accent-subtle)')
                          }
                          onMouseLeave={e =>
                            (e.currentTarget.style.backgroundColor = 'transparent')
                          }
                          title={t('editCardsModal.edit')}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteCard(card.id)}
                          className="p-1.5 text-red-500 rounded-lg transition-colors"
                          onMouseEnter={e =>
                            (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)')
                          }
                          onMouseLeave={e =>
                            (e.currentTarget.style.backgroundColor = 'transparent')
                          }
                          title={t('editCardsModal.delete')}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-bold text-[var(--text-tertiary)]">
                          {t('editCardsModal.question')}
                        </p>
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {card.front}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[var(--text-tertiary)]">
                          {t('editCardsModal.answer')}
                        </p>
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {card.back}
                        </p>
                      </div>
                      {card.context && (
                        <div>
                          <p className="text-xs font-bold text-[var(--text-tertiary)]">
                            {t('editCardsModal.contextLabel')}
                          </p>
                          <p className="text-sm text-[var(--text-secondary)] italic">
                            {card.context}
                          </p>
                        </div>
                      )}
                      {card.tags && card.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {card.tags.map((tag, i) => {
                            const color = getTagColor(tag);
                            return (
                              <span
                                key={i}
                                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${color.bg} ${color.text}`}
                              >
                                {tag}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bulk Edit Panel */}
        {isBulkMode && bulkSelectedCardIds.size > 0 && (
          <div
            className="p-4 border-t space-y-3"
            style={{
              backgroundColor: 'var(--color-accent-subtle)',
              borderColor: 'var(--border-secondary)',
            }}
          >
            {/* Bulk Tags */}
            <div>
              <p
                className="text-sm font-semibold mb-2"
                style={{ color: 'var(--color-accent-text)' }}
              >
                {t('editCardsModal.bulkTagsLabel', { count: bulkSelectedCardIds.size })}
              </p>
              <TagInput
                tags={bulkTags}
                onChange={setBulkTags}
                existingTags={existingTags}
                placeholder={t('editCardsModal.tagsPlaceholder')}
              />
              <button
                onClick={handleBulkApplyTags}
                disabled={isSavingCard || bulkTags.length === 0}
                className="mt-2 bg-[var(--color-accent)] text-white font-bold py-2 px-4 rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors text-sm disabled:opacity-50 flex items-center gap-2"
              >
                <Tags size={14} />
                {isSavingCard ? t('editCardsModal.saving') : t('editCardsModal.applyTags')}
              </button>
            </div>

            {/* Bulk Type Change */}
            <div className="border-t pt-3" style={{ borderColor: 'var(--border-secondary)' }}>
              <p
                className="text-sm font-semibold mb-2"
                style={{ color: 'var(--color-accent-text)' }}
              >
                {t('editCardsModal.bulkTypeLabel', { count: bulkSelectedCardIds.size })}
              </p>
              <div className="flex gap-2">
                <select
                  value={bulkType}
                  onChange={e => setBulkType(e.target.value as CardType)}
                  className="flex-1 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-ring)]"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderWidth: '1px',
                    borderColor: 'var(--input-border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="standard">{t('editCardsModal.typeStandard')}</option>
                  <option value="quiz">{t('editCardsModal.typeQuiz')}</option>
                  <option value="type-answer">{t('editCardsModal.typeAnswer')}</option>
                  <option value="multiple-answer">{t('editCardsModal.typeMultipleAnswer')}</option>
                </select>
                <button
                  onClick={handleBulkChangeType}
                  disabled={isSavingCard}
                  className="bg-[var(--color-accent)] text-white font-bold py-2 px-4 rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors text-sm disabled:opacity-50 flex items-center gap-2"
                >
                  <Filter size={14} />
                  {isSavingCard ? t('editCardsModal.saving') : t('editCardsModal.applyType')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-6 border-t border-[var(--border-subtle)]">
          <button
            onClick={addNewCard}
            className="w-full bg-[var(--color-accent)] text-white font-bold py-3 rounded-xl hover:bg-[var(--color-accent-hover)] transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={20} /> {t('editCardsModal.addNewCard')}
          </button>
        </div>
      </div>

      {/* Individual Card Editor Modal */}
      {editingCard && (
        <EditCardModal
          card={editingCard}
          onClose={() => setEditingCard(null)}
          onSave={handleCardSaved}
          existingTags={existingTags}
        />
      )}
    </div>
  );
};
