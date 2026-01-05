import React, { useState, useEffect } from 'react';
import { X, Play, Shuffle, Brain, CheckSquare, List } from 'lucide-react';
import type { CreateStudySessionRequest } from '../../types/api';
import { useStudySessionsStore } from '../../store/studySessionsStore';
import { useToast } from '../ui/Toast';
import { getDeck } from '../../api/decks';

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
  const toast = useToast();
  const createSession = useStudySessionsStore(state => state.createSession);
  const isLoading = useStudySessionsStore(state => state.isLoading);

  const [selectionMethod, setSelectionMethod] = useState<'random' | 'smart' | 'manual' | 'all'>(
    'random'
  );
  const [cardCount, setCardCount] = useState(20);
  const [excludeMastered, setExcludeMastered] = useState(true);
  const [deckCards, setDeckCards] = useState<Array<{ id: string; front: string }>>([]);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);

  const availableCards = deck.totalCards; // In real app, would subtract mastered

  // Fetch deck cards when manual mode is selected
  useEffect(() => {
    if (selectionMethod === 'manual' && deckCards.length === 0) {
      setLoadingCards(true);
      getDeck(deck.id)
        .then(response => {
          if (response.success && response.data?.cards) {
            setDeckCards(response.data.cards.map(c => ({ id: c.id, front: c.front })));
          }
        })
        .catch(err => {
          console.error('Error loading deck cards:', err);
          toast.error('Eroare la încărcarea cardurilor');
        })
        .finally(() => setLoadingCards(false));
    }
  }, [selectionMethod, deck.id, deckCards.length, toast]);

  const toggleCardSelection = (cardId: string) => {
    setSelectedCardIds(prev =>
      prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]
    );
  };

  const handleCreate = async () => {
    // Validate manual selection
    if (selectionMethod === 'manual' && selectedCardIds.length === 0) {
      toast.error('Selectează cel puțin un card');
      return;
    }

    const request: CreateStudySessionRequest = {
      deckId: deck.id,
      selectionMethod,
      excludeMasteredCards: excludeMastered,
    };

    if (selectionMethod === 'random' || selectionMethod === 'smart') {
      request.cardCount = Math.min(cardCount, availableCards);
    }

    if (selectionMethod === 'manual') {
      request.selectedCardIds = selectedCardIds;
    }

    const session = await createSession(request);

    if (session) {
      toast.success(`Sesiune creată: ${session.totalCards} carduri selectate!`);
      onSessionCreated(session.id);
    } else {
      toast.error('Eroare la crearea sesiunii');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Sesiune Nouă</h2>
            <p className="text-sm text-gray-600 mt-1">{deck.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Selection Method */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">
              Metodă Selecție Carduri
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectionMethod('random')}
                title="Selectează carduri aleatorii din deck"
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                  selectionMethod === 'random'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Shuffle size={24} />
                <span className="font-semibold text-sm">Random</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectionMethod('smart')}
                title="Prioritizează carduri care necesită review (SM-2 algorithm)"
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                  selectionMethod === 'smart'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Brain size={24} />
                <span className="font-semibold text-sm">Smart Review</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectionMethod('manual')}
                title="Tu alegi exact ce carduri să studiezi"
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                  selectionMethod === 'manual'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <CheckSquare size={24} />
                <span className="font-semibold text-sm">Manual</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectionMethod('all')}
                title="Include toate cardurile din deck"
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                  selectionMethod === 'all'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <List size={24} />
                <span className="font-semibold text-sm">Toate</span>
              </button>
            </div>
          </div>

          {/* Card Count (for random/smart) */}
          {(selectionMethod === 'random' || selectionMethod === 'smart') && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Număr Carduri: {cardCount}
              </label>
              <input
                type="range"
                min="5"
                max={Math.min(50, availableCards)}
                value={cardCount}
                onChange={e => setCardCount(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>5 carduri</span>
                <span>{Math.min(50, availableCards)} carduri</span>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {availableCards} carduri disponibile în deck
              </p>
            </div>
          )}

          {/* Options */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={excludeMastered}
                onChange={e => setExcludeMastered(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="flex-1">
                <span className="font-semibold text-gray-900">Exclude carduri învățate</span>
                <p className="text-xs text-gray-600">
                  Nu include carduri cu status &quot;mastered&quot;
                </p>
              </div>
            </label>
          </div>

          {/* Manual Card Selection */}
          {selectionMethod === 'manual' && (
            <div className="border-2 border-indigo-200 rounded-xl p-4 bg-indigo-50">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-gray-900">
                  Selectează Carduri ({selectedCardIds.length} selectate)
                </h4>
                {deckCards.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedCardIds(
                        selectedCardIds.length === deckCards.length ? [] : deckCards.map(c => c.id)
                      )
                    }
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    {selectedCardIds.length === deckCards.length
                      ? 'Deselectează tot'
                      : 'Selectează tot'}
                  </button>
                )}
              </div>

              {loadingCards ? (
                <p className="text-sm text-gray-600 text-center py-4">Se încarcă cardurile...</p>
              ) : deckCards.length === 0 ? (
                <p className="text-sm text-gray-600 text-center py-4">
                  Nu există carduri disponibile
                </p>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {deckCards.map((card, index) => (
                    <label
                      key={card.id}
                      className="flex items-start gap-3 p-3 bg-white rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border border-gray-200"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCardIds.includes(card.id)}
                        onChange={() => toggleCardSelection(card.id)}
                        className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold text-gray-500">
                          Card #{index + 1}
                        </span>
                        <p className="text-sm text-gray-900 truncate">{card.front}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            disabled={isLoading}
          >
            Anulează
          </button>
          <button
            onClick={handleCreate}
            disabled={isLoading}
            className="flex-1 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Play size={20} />
            {isLoading ? 'Se creează...' : 'Începe Sesiunea'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateSessionModal;
