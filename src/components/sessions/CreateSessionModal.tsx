import React, { useState, useEffect, useCallback } from 'react';
import { X, Play, Shuffle, Brain, CheckSquare, List, Tag, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CreateStudySessionRequest } from '../../types/api';
import { useStudySessionsStore } from '../../store/studySessionsStore';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../ui/Toast';
import { getDeck } from '../../api/decks';
import { getAvailableCardCount } from '../../api/studySessions';
import { getTagColor } from '../../utils/tagColors';

interface CreateSessionModalProps {
  deck: {
    id: string;
    title?: string;
    totalCards: number;
  };
  onClose: () => void;
  onSessionCreated: (sessionId: string) => void;
}

const CreateSessionModal: React.FC<CreateSessionModalProps> = ({
  deck,
  onClose,
  onSessionCreated,
}) => {
  const { t } = useTranslation('session');
  const toast = useToast();
  const { isAuthenticated } = useAuth();
  const createSession = useStudySessionsStore(state => state.createSession);
  const createGuestSession = useStudySessionsStore(state => state.createGuestSession);
  const isLoading = useStudySessionsStore(state => state.isLoading);

  const isGuest = !isAuthenticated;

  const [selectionMethod, setSelectionMethod] = useState<'random' | 'smart' | 'manual' | 'all'>(
    'random'
  );
  const [cardCount, setCardCount] = useState(20);
  const [excludeMastered, setExcludeMastered] = useState(true);
  const [excludeActiveSessionCards, setExcludeActiveSessionCards] = useState(false);
  const [deckCards, setDeckCards] = useState<Array<{ id: string; front: string; tags?: string[] }>>(
    []
  );
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Dynamic available card count
  const [availableCards, setAvailableCards] = useState(deck?.totalCards || 0);
  const [loadingCount, setLoadingCount] = useState(false);

  // Fetch available card count from backend
  const fetchAvailableCount = useCallback(
    async (mastered: boolean, activeSessions: boolean) => {
      if (isGuest) {
        setAvailableCards(deck?.totalCards || 0);
        return;
      }
      setLoadingCount(true);
      try {
        const response = await getAvailableCardCount(deck.id, mastered, activeSessions);
        if (response.success && response.data) {
          setAvailableCards(response.data.availableCount);
        }
      } catch {
        // Fallback to total cards on error
        setAvailableCards(deck?.totalCards || 0);
      } finally {
        setLoadingCount(false);
      }
    },
    [deck.id, deck?.totalCards, isGuest]
  );

  // Fetch count on mount and when checkboxes change
  useEffect(() => {
    fetchAvailableCount(excludeMastered, excludeActiveSessionCards);
  }, [excludeMastered, excludeActiveSessionCards, fetchAvailableCount]);

  // Clamp cardCount when availableCards changes
  useEffect(() => {
    const maxSlider = Math.max(5, Math.min(50, availableCards));
    if (cardCount > maxSlider) {
      setCardCount(maxSlider);
    }
  }, [availableCards, cardCount]);

  // Fetch deck cards when manual mode is selected
  useEffect(() => {
    if (selectionMethod === 'manual' && deckCards.length === 0) {
      setLoadingCards(true);
      getDeck(deck.id)
        .then(response => {
          if (response.success && response.data?.cards) {
            const cards = response.data.cards;
            setDeckCards(cards.map(c => ({ id: c.id, front: c.front, tags: c.tags || [] })));
            // Extract unique tags from cards
            const tagSet = new Set<string>();
            cards.forEach(c => (c.tags || []).forEach(t => tagSet.add(t)));
            setAvailableTags(Array.from(tagSet).sort());
          }
        })
        .catch(err => {
          console.error('Error loading deck cards:', err);
          toast.error(t('create.errors.loadingCards'));
        })
        .finally(() => setLoadingCards(false));
    }
  }, [selectionMethod, deck.id, deckCards.length, toast, t]);

  // Auto-select cards when tags change
  useEffect(() => {
    if (selectedTags.length > 0 && deckCards.length > 0) {
      const matchingIds = deckCards
        .filter(card => card.tags?.some(t => selectedTags.includes(t)))
        .map(c => c.id);
      setSelectedCardIds(matchingIds);
    }
  }, [selectedTags, deckCards]);

  const toggleCardSelection = (cardId: string) => {
    setSelectedCardIds(prev =>
      prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]
    );
  };

  const handleCreate = async () => {
    // Validate manual selection
    if (selectionMethod === 'manual' && selectedCardIds.length === 0) {
      toast.error(t('create.errors.selectAtLeastOne'));
      return;
    }

    // Guest users: simplified session creation
    if (isGuest) {
      // For guests, we only support 'all' selection method (study all cards)
      // This creates a guest session via the special guest endpoint
      await createGuestSession(deck.id);
      const currentSession = useStudySessionsStore.getState().currentSession;

      if (currentSession) {
        toast.success(t('create.success', { cards: currentSession.totalCards || 0 }));
        onSessionCreated(currentSession.id);
      } else {
        toast.error(t('create.errors.creating'));
      }
      return;
    }

    // Authenticated users: full session creation with options
    const request: CreateStudySessionRequest = {
      deckId: deck.id,
      selectionMethod,
      excludeMasteredCards: excludeMastered,
      excludeActiveSessionCards,
    };

    if (selectionMethod === 'random' || selectionMethod === 'smart') {
      request.cardCount = Math.min(cardCount, availableCards);
    }

    if (selectionMethod === 'manual') {
      request.selectedCardIds = selectedCardIds;
    }

    const session = await createSession(request);

    if (session) {
      toast.success(t('create.success', { cards: session.totalCards }));
      onSessionCreated(session.id);
    } else {
      // Check store error for more descriptive feedback
      const storeError = useStudySessionsStore.getState().error;
      if (storeError) {
        toast.error(storeError);
      } else {
        toast.error(t('create.errors.creating'));
      }
    }
  };

  const sliderMax = Math.max(5, Math.min(50, availableCards));
  const noCardsAvailable = availableCards === 0 && !loadingCount;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: 'var(--overlay-bg)' }}
    >
      <div
        className="rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        style={{ backgroundColor: 'var(--bg-surface)' }}
      >
        {/* Header */}
        <div
          className="p-6 flex justify-between items-center sticky top-0"
          style={{
            borderBottomWidth: '1px',
            borderBottomColor: 'var(--border-secondary)',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          <div>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {t('create.title')}
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
              {deck.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg-tertiary)] rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Selection Method */}
          <div>
            <label className="block text-sm font-bold text-[var(--text-secondary)] mb-3">
              {t('create.method.label')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectionMethod('random')}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                  selectionMethod === 'random'
                    ? 'border-[var(--color-accent)]'
                    : 'border-[var(--border-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]'
                }`}
              >
                <Shuffle size={24} />
                <span className="font-semibold text-sm">{t('create.method.random.title')}</span>
                <p className="text-xs text-center text-[var(--text-tertiary)] mt-1 leading-tight">
                  {t('create.method.random.description')}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSelectionMethod('smart')}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all relative ${
                  selectionMethod === 'smart'
                    ? 'border-[var(--color-accent)]'
                    : 'border-[var(--border-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]'
                }`}
              >
                {isGuest && (
                  <div className="absolute top-2 right-2 bg-amber-100 text-amber-600 rounded-full p-1">
                    <Lock size={12} />
                  </div>
                )}
                <Brain size={24} />
                <span className="font-semibold text-sm">{t('create.method.smart.title')}</span>
                <p className="text-xs text-center text-[var(--text-tertiary)] mt-1 leading-tight">
                  {t('create.method.smart.description')}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSelectionMethod('manual')}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all relative ${
                  selectionMethod === 'manual'
                    ? 'border-[var(--color-accent)]'
                    : 'border-[var(--border-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]'
                }`}
              >
                {isGuest && (
                  <div className="absolute top-2 right-2 bg-amber-100 text-amber-600 rounded-full p-1">
                    <Lock size={12} />
                  </div>
                )}
                <CheckSquare size={24} />
                <span className="font-semibold text-sm">{t('create.method.manual.title')}</span>
                <p className="text-xs text-center text-[var(--text-tertiary)] mt-1 leading-tight">
                  {t('create.method.manual.description')}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSelectionMethod('all')}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                  selectionMethod === 'all'
                    ? 'border-[var(--color-accent)]'
                    : 'border-[var(--border-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]'
                }`}
              >
                <List size={24} />
                <span className="font-semibold text-sm">{t('create.method.all.title')}</span>
                <p className="text-xs text-center text-[var(--text-tertiary)] mt-1 leading-tight">
                  {t('create.method.all.description')}
                </p>
              </button>
            </div>
          </div>

          {/* Smart mode premium lock for guests */}
          {selectionMethod === 'smart' && isGuest && (
            <div className="border-2 border-amber-300/50 rounded-xl p-6 bg-amber-50/10 text-center">
              <Lock size={32} className="mx-auto text-amber-500 mb-3" />
              <h4 className="font-bold text-[var(--text-primary)] mb-2">
                {t('create.smart.premiumTitle')}
              </h4>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                {t('create.smart.premiumDescription')}
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">{t('create.smart.premiumHint')}</p>
            </div>
          )}

          {/* Card Count (for random/smart) */}
          {(selectionMethod === 'random' || (selectionMethod === 'smart' && !isGuest)) && (
            <div>
              <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">
                {t('create.cardCount.label')}: {cardCount}
              </label>
              <input
                type="range"
                min="5"
                max={sliderMax}
                value={Math.min(cardCount, sliderMax)}
                onChange={e => setCardCount(parseInt(e.target.value))}
                className="w-full h-2 bg-[var(--border-secondary)] rounded-lg appearance-none cursor-pointer"
                disabled={noCardsAvailable}
              />
              <div className="flex justify-between text-xs text-[var(--text-tertiary)] mt-1">
                <span>{t('create.cardCount.min')}</span>
                <span>{t('create.cardCount.max', { count: Math.min(50, availableCards) })}</span>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mt-2">
                {loadingCount ? '...' : t('create.cardCount.available', { count: availableCards })}
              </p>
            </div>
          )}

          {/* Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={excludeMastered}
                onChange={e => setExcludeMastered(e.target.checked)}
                className="w-5 h-5 rounded border-[var(--border-primary)] text-[var(--color-accent)] focus:ring-[var(--color-accent-ring)] mt-0.5"
              />
              <div className="flex-1">
                <span className="font-semibold text-[var(--text-primary)]">
                  {t('create.options.excludeMastered.label')}
                </span>
                <p className="text-xs text-[var(--text-secondary)]">
                  {t('create.options.excludeMastered.description')}
                </p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={excludeActiveSessionCards}
                onChange={e => setExcludeActiveSessionCards(e.target.checked)}
                className="w-5 h-5 rounded border-[var(--border-primary)] text-[var(--color-accent)] focus:ring-[var(--color-accent-ring)] mt-0.5"
              />
              <div className="flex-1">
                <span className="font-semibold text-[var(--text-primary)]">
                  {t('create.options.excludeActiveSessions.label')}
                </span>
                <p className="text-xs text-[var(--text-secondary)]">
                  {t('create.options.excludeActiveSessions.description')}
                </p>
              </div>
            </label>
          </div>

          {/* Warning when no cards are available */}
          {noCardsAvailable && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-amber-800">
                {t('create.errors.noCardsAvailable')}
              </p>
              <p className="text-xs text-amber-700 mt-1">
                {t('create.errors.noCardsAvailableHint')}
              </p>
            </div>
          )}

          {/* Manual Card Selection */}
          {selectionMethod === 'manual' && isGuest && (
            <div className="border-2 border-amber-300/50 rounded-xl p-6 bg-amber-50/10 text-center">
              <Lock size={32} className="mx-auto text-amber-500 mb-3" />
              <h4 className="font-bold text-[var(--text-primary)] mb-2">
                {t('create.manual.premiumTitle')}
              </h4>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                {t('create.manual.premiumDescription')}
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">
                {t('create.manual.premiumHint')}
              </p>
            </div>
          )}
          {selectionMethod === 'manual' && !isGuest && (
            <div className="border-2 border-[var(--color-accent)]/30 rounded-xl p-4 bg-[var(--color-accent-light)]">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-[var(--text-primary)]">
                  {t('create.manual.title', { count: selectedCardIds.length })}
                </h4>
                {deckCards.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedCardIds(
                        selectedCardIds.length === deckCards.length ? [] : deckCards.map(c => c.id)
                      )
                    }
                    className="text-sm text-[var(--color-accent-text)] hover:opacity-80 font-medium"
                  >
                    {selectedCardIds.length === deckCards.length
                      ? t('create.manual.deselectAll')
                      : t('create.manual.selectAll')}
                  </button>
                )}
              </div>

              {/* Topic filter pills */}
              {availableTags.length > 0 && (
                <div className="mb-3">
                  <h5 className="text-xs font-bold text-[var(--text-tertiary)] uppercase mb-2 flex items-center gap-1">
                    <Tag size={12} />
                    {t('create.manual.filterByTopics')}
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map(tag => {
                      const isSelected = selectedTags.includes(tag);
                      const color = getTagColor(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() =>
                            setSelectedTags(prev =>
                              isSelected ? prev.filter(t => t !== tag) : [...prev, tag]
                            )
                          }
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                            isSelected
                              ? `${color.bg} ${color.text} ring-2 ring-[var(--color-accent)]`
                              : 'bg-[var(--bg-surface)] text-[var(--text-tertiary)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-secondary)]'
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                    {selectedTags.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTags([]);
                          setSelectedCardIds([]);
                        }}
                        className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] underline ml-1"
                      >
                        {t('create.manual.clearFilters')}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {loadingCards ? (
                <p className="text-sm text-[var(--text-secondary)] text-center py-4">
                  {t('create.manual.loading')}
                </p>
              ) : deckCards.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)] text-center py-4">
                  {t('create.manual.noCards')}
                </p>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {deckCards.map((card, index) => (
                    <label
                      key={card.id}
                      className="flex items-start gap-3 p-3 bg-[var(--bg-surface)] rounded-lg hover:bg-[var(--bg-surface-hover)] cursor-pointer transition-colors border border-[var(--border-secondary)]"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCardIds.includes(card.id)}
                        onChange={() => toggleCardSelection(card.id)}
                        className="w-5 h-5 rounded border-[var(--border-primary)] text-[var(--color-accent)] focus:ring-[var(--color-accent-ring)] mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold text-[var(--text-tertiary)]">
                          {t('create.manual.cardNumber', { number: index + 1 })}
                        </span>
                        <p className="text-sm text-[var(--text-primary)] truncate">{card.front}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="p-6 flex gap-3"
          style={{ borderTopWidth: '1px', borderTopColor: 'var(--border-secondary)' }}
        >
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border-2 font-semibold rounded-xl transition-colors"
            style={{ borderColor: 'var(--border-secondary)', color: 'var(--text-secondary)' }}
            disabled={isLoading}
          >
            {t('create.buttons.cancel')}
          </button>
          <button
            onClick={handleCreate}
            disabled={isLoading || noCardsAvailable}
            className="flex-1 px-6 py-3 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            <Play size={20} />
            {isLoading ? t('create.buttons.creating') : t('create.buttons.start')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateSessionModal;
