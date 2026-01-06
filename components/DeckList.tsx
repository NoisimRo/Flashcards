import React, { useState, useEffect } from 'react';
import { Deck, Difficulty, Card } from '../types';
import {
  Plus,
  MoreVertical,
  Upload,
  Sparkles,
  Loader2,
  Trash2,
  Play,
  Edit,
  RotateCcw,
  ArrowRight,
  List,
  X,
  Save,
} from 'lucide-react';
import { generateDeckWithAI, getDeck } from '../src/api/decks';
import { useToast } from '../src/components/ui/Toast';

interface DeckListProps {
  decks: Deck[];
  onAddDeck: (deck: Deck) => void;
  onEditDeck: (deck: Deck) => void;
  onDeleteDeck: (deckId: string) => void;
  onStartSession: (deck: Deck) => void;
  onResetDeck?: (deckId: string) => void;
}

const DeckList: React.FC<DeckListProps> = ({
  decks,
  onAddDeck,
  onEditDeck,
  onDeleteDeck,
  onStartSession,
  onResetDeck,
}) => {
  const toast = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Form State
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null);
  const [generatingForDeckId, setGeneratingForDeckId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Limba Română');
  const [difficulty, setDifficulty] = useState<Difficulty>('A2');
  const [importMode, setImportMode] = useState<'manual' | 'ai' | 'file'>('ai');
  const [numberOfCards, setNumberOfCards] = useState(10);
  const [selectedCardTypes, setSelectedCardTypes] = useState<
    Array<'standard' | 'quiz' | 'type-answer'>
  >(['standard', 'quiz', 'type-answer']);

  // Edit Cards Modal State
  const [editCardsModalOpen, setEditCardsModalOpen] = useState(false);
  const [editCardsModalDeck, setEditCardsModalDeck] = useState<Deck | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editCardFront, setEditCardFront] = useState('');
  const [editCardBack, setEditCardBack] = useState('');
  const [editCardContext, setEditCardContext] = useState('');

  // Loading messages for "The Dealer's Table" loading state
  const dealerMessages = [
    'Dealerul nostru AI amestecă pachetul. Sperăm că ai un as în mânecă!',
    'Se împart cărțile! Miza de azi? Viitorul tău de geniu.',
    'Pregătim masa de joc. Fără cacealmele, doar cunoștințe pure!',
    'Jonglăm cu informațiile până obținem pachetul câștigător.',
    'Ce se întâmplă în sesiune, rămâne în sesiune... dar te ajută la examen!',
    'All-in pe învățare? Cărțile sunt aproape gata de servit.',
    'Dealerul AI calculează cotele. Ai șanse 100% să devii mai deștept.',
  ];
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  // Rotate loading messages every 3 seconds
  useEffect(() => {
    if (!isGenerating) return;

    const interval = setInterval(() => {
      setCurrentMessageIndex(prev => (prev + 1) % dealerMessages.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isGenerating, dealerMessages.length]);

  const openCreateModal = () => {
    setEditingDeckId(null);
    setGeneratingForDeckId(null);
    setTitle('');
    setSubject('Limba Română');
    setDifficulty('A2');
    setImportMode('ai');
    setNumberOfCards(10);
    setSelectedCardTypes(['standard', 'quiz', 'type-answer']);
    setIsModalOpen(true);
  };

  const openEditModal = (deck: Deck) => {
    setEditingDeckId(deck.id);
    setGeneratingForDeckId(null);
    setTitle(deck.title);
    setSubject(deck.subject);
    setDifficulty(deck.difficulty);
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const openGenerateCardsModal = (deck: Deck) => {
    setEditingDeckId(null);
    setGeneratingForDeckId(deck.id);
    setTitle(deck.title || '');
    setSubject(deck.subject);
    setDifficulty(deck.difficulty);
    setImportMode('ai');
    setNumberOfCards(10);
    setSelectedCardTypes(['standard', 'quiz', 'type-answer']);
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const toggleCardType = (type: 'standard' | 'quiz' | 'type-answer') => {
    setSelectedCardTypes(prev => {
      if (prev.includes(type)) {
        // Don't allow deselecting if it's the last selected type
        if (prev.length === 1) return prev;
        return prev.filter(t => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  // Edit Cards Modal Functions
  const openEditCardsModal = async (deck: Deck) => {
    try {
      // Fetch full deck with cards from API
      const response = await getDeck(deck.id);

      if (response.success && response.data) {
        // Adapt DeckWithCards to Deck type expected by modal
        const deckWithCards: Deck = {
          ...response.data,
          subject: response.data.subjectName || response.data.subject,
          masteredCards: deck.masteredCards || 0, // Preserve from original deck
          cards: response.data.cards.map(card => ({
            ...card,
            status: 'new' as const, // Default status for modal
          })),
        };
        setEditCardsModalDeck(deckWithCards);
        setEditCardsModalOpen(true);
        setActiveMenuId(null);
      } else {
        throw new Error('Failed to load deck cards');
      }
    } catch (error) {
      console.error('Error loading deck cards:', error);
      toast.error('Eroare la încărcarea cardurilor');
    }
  };

  const closeEditCardsModal = () => {
    setEditCardsModalOpen(false);
    setEditCardsModalDeck(null);
    setEditingCardId(null);
    setEditCardFront('');
    setEditCardBack('');
    setEditCardContext('');
  };

  const startEditCard = (card: Card) => {
    setEditingCardId(card.id);
    setEditCardFront(card.front);
    setEditCardBack(card.back);
    setEditCardContext(card.context || '');
  };

  const cancelEditCard = () => {
    setEditingCardId(null);
    setEditCardFront('');
    setEditCardBack('');
    setEditCardContext('');
  };

  const saveEditCard = () => {
    if (!editCardsModalDeck || !editingCardId) return;

    const updatedCards = editCardsModalDeck.cards.map(card =>
      card.id === editingCardId
        ? { ...card, front: editCardFront, back: editCardBack, context: editCardContext }
        : card
    );

    const updatedDeck = { ...editCardsModalDeck, cards: updatedCards };
    onEditDeck(updatedDeck);
    setEditCardsModalDeck(updatedDeck);
    cancelEditCard();
  };

  const deleteCard = (cardId: string) => {
    if (!editCardsModalDeck) return;
    if (!confirm('Sigur vrei să ștergi acest card?')) return;

    const updatedCards = editCardsModalDeck.cards.filter(card => card.id !== cardId);
    const updatedDeck = {
      ...editCardsModalDeck,
      cards: updatedCards,
      totalCards: updatedCards.length,
    };
    onEditDeck(updatedDeck);
    setEditCardsModalDeck(updatedDeck);
  };

  const addNewCard = () => {
    if (!editCardsModalDeck) return;

    const newCard: Card = {
      id: `card-${Date.now()}`,
      front: 'Întrebare nouă',
      back: 'Răspuns nou',
      context: '',
      type: 'standard',
      status: 'new',
    };

    const updatedCards = [...editCardsModalDeck.cards, newCard];
    const updatedDeck = {
      ...editCardsModalDeck,
      cards: updatedCards,
      totalCards: updatedCards.length,
    };
    onEditDeck(updatedDeck);
    setEditCardsModalDeck(updatedDeck);
    startEditCard(newCard);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);

    if (editingDeckId) {
      // EDIT MODE
      const existingDeck = decks.find(d => d.id === editingDeckId);
      if (existingDeck) {
        const updatedDeck: Deck = {
          ...existingDeck,
          title,
          subject,
          difficulty,
        };
        onEditDeck(updatedDeck);
      }
    } else if (generatingForDeckId) {
      // GENERATE CARDS FOR EXISTING EMPTY DECK
      const newCards: Array<{
        id: string;
        front: string;
        back: string;
        context?: string;
        type: 'standard' | 'type-answer' | 'quiz';
        status: 'new' | 'learning' | 'mastered';
        options?: string[];
        correctOptionIndex?: number;
      }> = [];
      if (importMode === 'ai') {
        try {
          const response = await generateDeckWithAI(
            subject,
            title,
            difficulty,
            numberOfCards,
            selectedCardTypes
          );
          if (response.success && response.data) {
            newCards.push(
              ...response.data.map((card, index) => ({
                ...card,
                id: `ai-${Date.now()}-${index}`,
                status: 'new' as const,
                // Preserve all card type fields
                type: card.type || 'standard',
                options: card.options || undefined,
                correctOptionIndex: card.correctOptionIndex ?? undefined,
              }))
            );
          } else {
            alert(response.error?.message || 'Eroare la generarea AI. Verifică consola.');
            setIsGenerating(false);
            return;
          }
        } catch (error) {
          console.error('Error generating cards:', error);
          alert('Eroare la generarea AI. Verifică consola.');
          setIsGenerating(false);
          return;
        }
      }

      const existingDeck = decks.find(d => d.id === generatingForDeckId);
      if (existingDeck) {
        const updatedDeck: Deck = {
          ...existingDeck,
          cards: newCards,
          totalCards: newCards.length,
          masteredCards: 0,
        };
        onEditDeck(updatedDeck);
      }
    } else {
      // CREATE MODE
      const newCards: Array<{
        id: string;
        front: string;
        back: string;
        context?: string;
        type: 'standard' | 'type-answer' | 'quiz';
        status: 'new' | 'learning' | 'mastered';
        options?: string[];
        correctOptionIndex?: number;
      }> = [];
      if (importMode === 'ai') {
        try {
          const response = await generateDeckWithAI(
            subject,
            title,
            difficulty,
            numberOfCards,
            selectedCardTypes
          );
          if (response.success && response.data) {
            newCards.push(
              ...response.data.map((card, index) => ({
                ...card,
                id: `ai-${Date.now()}-${index}`,
                status: 'new' as const,
                // Preserve all card type fields
                type: card.type || 'standard',
                options: card.options || undefined,
                correctOptionIndex: card.correctOptionIndex ?? undefined,
              }))
            );
          } else {
            alert(response.error?.message || 'Eroare la generarea AI. Verifică consola.');
            setIsGenerating(false);
            return;
          }
        } catch (error) {
          console.error('Error generating cards:', error);
          alert('Eroare la generarea AI. Verifică consola.');
          setIsGenerating(false);
          return;
        }
      }

      const newDeck: Deck = {
        id: `d-${Date.now()}`,
        title,
        subject,
        topic: title, // Simplified
        difficulty,
        cards: newCards,
        totalCards: newCards.length,
        masteredCards: 0,
      };
      onAddDeck(newDeck);
    }

    setIsGenerating(false);
    setIsModalOpen(false);
    setTitle('');
  };

  const toggleMenu = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  // Close menus when clicking outside
  React.useEffect(() => {
    const closeMenu = () => setActiveMenuId(null);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, []);

  return (
    <div className="p-6 md:p-8 space-y-8 h-full overflow-y-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Deck-urile Mele</h1>
          <p className="text-gray-500">
            Gestionează și organizează colecțiile tale de flashcard-uri
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-gray-900 hover:bg-gray-800 text-white px-5 py-3 rounded-xl flex items-center gap-2 font-bold shadow-lg transition-all hover:-translate-y-1"
        >
          <Plus size={20} /> Deck Nou
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-10">
        {/* Create Card (Visual Placeholder) */}
        <div
          onClick={openCreateModal}
          className="border-2 border-dashed border-gray-300 rounded-3xl flex flex-col items-center justify-center p-8 cursor-pointer hover:border-gray-900 hover:bg-gray-50 transition-all group min-h-[200px]"
        >
          <div className="w-16 h-16 bg-[#F8F6F1] rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Plus className="text-gray-400 group-hover:text-gray-900" size={32} />
          </div>
          <h3 className="font-bold text-gray-900 text-lg">Creează un deck nou</h3>
          <p className="text-center text-gray-500 text-sm mt-2">
            Importă din CSV/TXT sau generează cu AI
          </p>
        </div>

        {/* Deck Cards */}
        {decks.map(deck => {
          const percentage =
            deck.totalCards > 0 ? Math.round((deck.masteredCards / deck.totalCards) * 100) : 0;
          const hasProgress =
            percentage > 0 ||
            (deck.sessionData && Object.keys(deck.sessionData.answers).length > 0);
          const inStudy = deck.totalCards - deck.masteredCards;

          return (
            <div
              key={deck.id}
              className="bg-[#F8F6F1] p-6 rounded-3xl relative group hover:shadow-md transition-shadow flex flex-col"
            >
              {/* Three-Dot Menu (top-right corner) */}
              <div className="absolute top-4 right-4">
                <div className="relative">
                  <button
                    onClick={e => toggleMenu(e, deck.id)}
                    className="p-1 text-gray-400 hover:text-gray-900 rounded-full hover:bg-gray-200 transition-colors"
                  >
                    <MoreVertical size={18} />
                  </button>

                  {activeMenuId === deck.id && (
                    <div className="absolute right-0 top-8 bg-white shadow-xl rounded-xl p-2 min-w-[180px] z-10 border border-gray-100 animate-fade-in">
                      {/* Resetează progresul - Only show if has progress */}
                      {hasProgress && onResetDeck && deck.totalCards > 0 && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onResetDeck(deck.id);
                            setActiveMenuId(null);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 rounded-lg flex items-center gap-2 font-medium"
                        >
                          <RotateCcw size={16} /> Resetează progresul
                        </button>
                      )}
                      {/* Editează deck */}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          openEditModal(deck);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg flex items-center gap-2 font-medium"
                      >
                        <Edit size={16} /> Editează deck
                      </button>
                      {/* Editează carduri - Show if deck has at least 1 card */}
                      {deck.totalCards > 0 && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            openEditCardsModal(deck);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-2 font-medium"
                        >
                          <List size={16} /> Editează carduri
                        </button>
                      )}
                      {/* Șterge deck with confirmation */}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          if (confirm(`Sigur vrei să ștergi deck-ul "${deck.title}"?`)) {
                            onDeleteDeck(deck.id);
                          }
                          setActiveMenuId(null);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2 font-medium border-t border-gray-100 mt-1 pt-2"
                      >
                        <Trash2 size={16} /> Șterge deck
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Header: Title/Theme */}
              <h3 className="text-2xl font-bold text-gray-900 mb-3 pr-8">{deck.title}</h3>

              {/* Body: Category Badge (left) + Difficulty Badge (right) */}
              <div className="flex justify-between items-center mb-4">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm
                  ${
                    deck.subject === 'Matematică'
                      ? 'bg-blue-500'
                      : deck.subject === 'Istorie'
                        ? 'bg-orange-500'
                        : 'bg-gray-900'
                  }`}
                >
                  {deck.subject}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-medium text-gray-600 bg-gray-200">
                  {deck.difficulty} -{' '}
                  {deck.difficulty === 'A1'
                    ? 'Începător'
                    : deck.difficulty === 'A2'
                      ? 'Elementar'
                      : deck.difficulty === 'B1'
                        ? 'Intermediar'
                        : deck.difficulty === 'B2'
                          ? 'Intermediar Avansat'
                          : deck.difficulty === 'C1'
                            ? 'Avansat'
                            : 'Expert'}
                </span>
              </div>

              {/* Footer Stats: Total | In Study | Mastered */}
              <div className="text-sm text-gray-600 mb-4 font-medium">
                {deck.totalCards} carduri | {inStudy} în studiu | {deck.masteredCards} învățate
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 h-2 rounded-full mb-6 overflow-hidden">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>

              {/* Permanent Action Bar */}
              <div className="flex gap-2 mt-auto">
                {/* 1. Generate Cards */}
                <button
                  onClick={e => {
                    e.stopPropagation();
                    openGenerateCardsModal(deck);
                  }}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                  title="Generează carduri cu AI"
                >
                  <Sparkles size={18} /> Generează
                </button>

                {/* 2. Create Session */}
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onStartSession(deck);
                  }}
                  className="flex-1 bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={deck.totalCards === 0}
                  title={deck.totalCards > 0 ? 'Creează sesiune' : 'Adaugă carduri mai întâi'}
                >
                  <Play size={18} fill="currentColor" /> Creează sesiune
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal for New/Edit Deck (Code omitted for brevity as it's identical to previous, just wrapped in same component) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto p-8 shadow-2xl animate-scale-up relative">
            {/* "The Dealer's Table" Loading Overlay */}
            {isGenerating && (
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/95 to-purple-900/95 rounded-3xl flex flex-col items-center justify-center z-50 backdrop-blur-sm">
                {/* Juggling Cards Animation */}
                <div className="relative w-32 h-32 mb-8">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="absolute animate-juggle-1">
                      <div className="w-16 h-24 bg-gradient-to-br from-white to-gray-100 rounded-lg shadow-2xl border-2 border-gray-200 flex items-center justify-center text-3xl font-bold text-indigo-600">
                        A
                      </div>
                    </div>
                    <div className="absolute animate-juggle-2" style={{ animationDelay: '0.33s' }}>
                      <div className="w-16 h-24 bg-gradient-to-br from-white to-gray-100 rounded-lg shadow-2xl border-2 border-gray-200 flex items-center justify-center text-3xl font-bold text-purple-600">
                        K
                      </div>
                    </div>
                    <div className="absolute animate-juggle-3" style={{ animationDelay: '0.66s' }}>
                      <div className="w-16 h-24 bg-gradient-to-br from-white to-gray-100 rounded-lg shadow-2xl border-2 border-gray-200 flex items-center justify-center text-3xl font-bold text-pink-600">
                        Q
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dynamic Rotating Messages */}
                <p className="text-white text-center font-semibold text-base px-8 max-w-sm leading-relaxed animate-fade-in">
                  {dealerMessages[currentMessageIndex]}
                </p>

                {/* Loading spinner */}
                <Loader2 className="text-white animate-spin mt-6" size={24} />
              </div>
            )}

            <h2 className="text-2xl font-bold mb-6 text-gray-900">
              {editingDeckId
                ? 'Editează Deck'
                : generatingForDeckId
                  ? 'Generează Carduri'
                  : 'Deck Nou'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Form fields same as previous */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Subiect</label>
                <select
                  className="w-full border-2 border-gray-100 bg-gray-50 rounded-xl p-3 font-medium outline-none focus:border-indigo-500 transition-colors"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                >
                  <option>Limba Română</option>
                  <option>Matematică</option>
                  <option>Istorie</option>
                  <option>Geografie</option>
                  <option>Engleză</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Titlu / Tematică
                </label>
                <input
                  type="text"
                  className="w-full border-2 border-gray-100 bg-gray-50 rounded-xl p-3 font-medium outline-none focus:border-indigo-500 transition-colors"
                  placeholder="ex: Verbe Neregulate"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Dificultate</label>
                <select
                  className="w-full border-2 border-gray-100 bg-gray-50 rounded-xl p-3 font-medium outline-none focus:border-indigo-500 transition-colors"
                  value={difficulty}
                  onChange={e => setDifficulty(e.target.value as Difficulty)}
                >
                  <option value="A1">A1 - Începător</option>
                  <option value="A2">A2 - Elementar</option>
                  <option value="B1">B1 - Intermediar</option>
                  <option value="B2">B2 - Intermediar Avansat</option>
                  <option value="C1">C1 - Avansat</option>
                </select>
              </div>

              {!editingDeckId && !generatingForDeckId && (
                <>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Număr de Carduri {importMode === 'ai' && '(pentru AI)'}
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="50"
                      value={numberOfCards}
                      onChange={e => setNumberOfCards(parseInt(e.target.value) || 10)}
                      className="w-full border-2 border-gray-100 bg-gray-50 rounded-xl p-3 font-medium outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
                      disabled={importMode !== 'ai'}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {importMode === 'ai'
                        ? 'Recomandare: 10-20 carduri pentru sesiuni eficiente'
                        : 'Numărul de carduri va depinde de fișierul importat'}
                    </p>
                  </div>

                  <div className="pt-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Metodă Creare
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setImportMode('ai')}
                        className={`p-3 rounded-xl border-2 text-sm flex flex-col items-center gap-1 font-bold transition-all ${importMode === 'ai' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-gray-100 text-gray-500 hover:bg-gray-50'}`}
                      >
                        <Sparkles size={20} /> AI Auto
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportMode('file')}
                        className={`p-3 rounded-xl border-2 text-sm flex flex-col items-center gap-1 font-bold transition-all ${importMode === 'file' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-gray-100 text-gray-500 hover:bg-gray-50'}`}
                      >
                        <Upload size={20} /> Import
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportMode('manual')}
                        className={`p-3 rounded-xl border-2 text-sm flex flex-col items-center gap-1 font-bold transition-all ${importMode === 'manual' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-gray-100 text-gray-500 hover:bg-gray-50'}`}
                      >
                        <Plus size={20} /> Manual
                      </button>
                    </div>
                  </div>

                  {importMode === 'ai' && (
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-3">
                        Tipuri Carduri
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                          <input
                            type="checkbox"
                            checked={selectedCardTypes.includes('standard')}
                            onChange={() => toggleCardType('standard')}
                            className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="flex-1">
                            <span className="font-semibold text-gray-900">Standard</span>
                            <p className="text-xs text-gray-600">
                              Card tradițional cu întrebare și răspuns
                            </p>
                          </div>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                          <input
                            type="checkbox"
                            checked={selectedCardTypes.includes('quiz')}
                            onChange={() => toggleCardType('quiz')}
                            className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="flex-1">
                            <span className="font-semibold text-gray-900">Quiz</span>
                            <p className="text-xs text-gray-600">
                              Întrebare cu variante multiple de răspuns
                            </p>
                          </div>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                          <input
                            type="checkbox"
                            checked={selectedCardTypes.includes('type-answer')}
                            onChange={() => toggleCardType('type-answer')}
                            className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="flex-1">
                            <span className="font-semibold text-gray-900">Răspuns Scris</span>
                            <p className="text-xs text-gray-600">
                              Scrie răspunsul (potrivit pentru 1-2 cuvinte)
                            </p>
                          </div>
                        </label>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Deselectează tipul de card nedorit
                      </p>
                    </div>
                  )}
                </>
              )}

              {generatingForDeckId && (
                <>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Număr de Carduri (pentru AI)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="50"
                      value={numberOfCards}
                      onChange={e => setNumberOfCards(parseInt(e.target.value) || 10)}
                      className="w-full border-2 border-gray-100 bg-gray-50 rounded-xl p-3 font-medium outline-none focus:border-indigo-500 transition-colors"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Recomandare: 10-20 carduri pentru sesiuni eficiente
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">
                      Tipuri Carduri
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedCardTypes.includes('standard')}
                          onChange={() => toggleCardType('standard')}
                          className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="flex-1">
                          <span className="font-semibold text-gray-900">Standard</span>
                          <p className="text-xs text-gray-600">
                            Card tradițional cu întrebare și răspuns
                          </p>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedCardTypes.includes('quiz')}
                          onChange={() => toggleCardType('quiz')}
                          className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="flex-1">
                          <span className="font-semibold text-gray-900">Quiz</span>
                          <p className="text-xs text-gray-600">
                            Întrebare cu variante multiple de răspuns
                          </p>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedCardTypes.includes('type-answer')}
                          onChange={() => toggleCardType('type-answer')}
                          className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="flex-1">
                          <span className="font-semibold text-gray-900">Răspuns Scris</span>
                          <p className="text-xs text-gray-600">
                            Scrie răspunsul (potrivit pentru 1-2 cuvinte)
                          </p>
                        </div>
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Deselectează tipul de card nedorit</p>
                  </div>
                </>
              )}

              {importMode === 'file' && !editingDeckId && !generatingForDeckId && (
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center bg-gray-50">
                  <input type="file" accept=".txt,.csv" className="w-full text-sm text-gray-500" />
                  <p className="text-xs text-gray-400 mt-2 font-medium">
                    Format suportat: CSV, TXT (Front, Back)
                  </p>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-white border-2 border-gray-200 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="flex-1 bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors flex justify-center items-center gap-2 shadow-lg hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <Loader2 className="animate-spin" />
                  ) : editingDeckId ? (
                    'Salvează'
                  ) : generatingForDeckId ? (
                    'Generează Carduri'
                  ) : (
                    'Creează Deck'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Cards Modal */}
      {editCardsModalOpen && editCardsModalDeck && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={closeEditCardsModal}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl animate-scale-up flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Modifică Carduri</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {editCardsModalDeck.title} • {editCardsModalDeck.cards.length} carduri
                </p>
              </div>
              <button
                onClick={closeEditCardsModal}
                className="text-gray-400 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Cards List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {editCardsModalDeck.cards.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="font-medium">Niciun card în acest deck</p>
                  <p className="text-sm mt-1">Adaugă primul card folosind butonul de mai jos</p>
                </div>
              ) : (
                editCardsModalDeck.cards.map((card, index) => (
                  <div
                    key={card.id}
                    className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-indigo-300 transition-colors"
                  >
                    {editingCardId === card.id ? (
                      // Edit Mode
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                            Față (Întrebare)
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
                            Spate (Răspuns)
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
                            Context (Opțional)
                          </label>
                          <input
                            type="text"
                            className="w-full border-2 border-gray-200 bg-white rounded-lg p-2 font-medium focus:border-indigo-500 outline-none"
                            value={editCardContext}
                            onChange={e => setEditCardContext(e.target.value)}
                            placeholder="Ex: propoziție exemplu"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={saveEditCard}
                            className="flex-1 bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                          >
                            <Save size={16} /> Salvează
                          </button>
                          <button
                            onClick={cancelEditCard}
                            className="flex-1 bg-white border-2 border-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            Anulează
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-bold text-gray-400 uppercase">
                            Card #{index + 1}
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEditCard(card)}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Editează"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => deleteCard(card.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Șterge"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <p className="text-xs font-bold text-gray-500">Întrebare:</p>
                            <p className="text-sm font-medium text-gray-900">{card.front}</p>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-500">Răspuns:</p>
                            <p className="text-sm font-medium text-gray-900">{card.back}</p>
                          </div>
                          {card.context && (
                            <div>
                              <p className="text-xs font-bold text-gray-500">Context:</p>
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
                <Plus size={20} /> Adaugă Card Nou
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeckList;
