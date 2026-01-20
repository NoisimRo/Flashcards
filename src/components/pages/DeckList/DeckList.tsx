import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Deck, DeckWithCards, Difficulty, Card } from '../../../types';
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
  Star,
  Flag,
  ThumbsUp,
} from 'lucide-react';
import { generateDeckWithAI, getDeck } from '../../../api/decks';
import { createCard, updateCard, deleteCard as deleteCardAPI } from '../../../api/cards';
import { useToast } from '../../ui/Toast';
import { ReviewModal } from '../../reviews/ReviewModal';
import { FlagModal } from '../../flags/FlagModal';

interface DeckListProps {
  decks: Deck[];
  onAddDeck: (deck: DeckWithCards) => void;
  onEditDeck: (deck: DeckWithCards) => void;
  onDeleteDeck: (deckId: string) => void;
  onStartSession: (deck: Deck) => void;
  onResetDeck?: (deckId: string) => void;
  isGuest?: boolean;
  onLoginPrompt?: (title: string, message: string) => void;
}

export const DeckList: React.FC<DeckListProps> = ({
  decks,
  onAddDeck,
  onEditDeck,
  onDeleteDeck,
  onStartSession,
  onResetDeck,
  isGuest = false,
  onLoginPrompt,
}) => {
  const { t } = useTranslation('decks');
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
  const [editCardsModalDeck, setEditCardsModalDeck] = useState<DeckWithCards | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editCardFront, setEditCardFront] = useState('');
  const [editCardBack, setEditCardBack] = useState('');
  const [editCardContext, setEditCardContext] = useState('');
  const [editCardType, setEditCardType] = useState<'standard' | 'type-answer' | 'quiz'>('standard');
  const [editCardOptions, setEditCardOptions] = useState<string[]>(['', '', '', '']);
  const [editCardCorrectIndex, setEditCardCorrectIndex] = useState(0);
  const [isSavingCard, setIsSavingCard] = useState(false);

  // Review & Flag Modal State
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedDeckForFlag, setSelectedDeckForFlag] = useState<Deck | null>(null);
  const [selectedDeckForReview, setSelectedDeckForReview] = useState<Deck | null>(null);

  // Loading messages for "The Dealer's Table" loading state
  const dealerMessages = t('loading.dealerMessages', { returnObjects: true }) as string[];
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
    // Guard: Visitors must register to create decks
    if (isGuest && onLoginPrompt) {
      onLoginPrompt(t('guestPrompt.createDeck.title'), t('guestPrompt.createDeck.message'));
      return;
    }

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
    // Guard: Visitors must register to use AI generation
    if (isGuest && onLoginPrompt) {
      onLoginPrompt(t('guestPrompt.aiGeneration.title'), t('guestPrompt.aiGeneration.message'));
      return;
    }

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
        const deckWithCards: DeckWithCards = {
          ...response.data,
          subject: response.data.subjectName || response.data.subject,
          masteredCards: deck.masteredCards || 0, // Preserve from original deck
          cards: response.data.cards,
        };
        setEditCardsModalDeck(deckWithCards);
        setEditCardsModalOpen(true);
        setActiveMenuId(null);
      } else {
        throw new Error('Failed to load deck cards');
      }
    } catch (error) {
      console.error('Error loading deck cards:', error);
      toast.error(t('toast.cardLoadError'));
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
    setEditCardType(card.type);
    if (card.type === 'quiz' && card.options && card.options.length > 0) {
      setEditCardOptions([...card.options]);
      setEditCardCorrectIndex(card.correctOptionIndex || 0);
    } else {
      setEditCardOptions(['', '', '', '']);
      setEditCardCorrectIndex(0);
    }
  };

  const cancelEditCard = () => {
    setEditingCardId(null);
    setEditCardFront('');
    setEditCardBack('');
    setEditCardContext('');
  };

  const saveEditCard = async () => {
    if (!editCardsModalDeck || !editingCardId) return;

    setIsSavingCard(true);
    try {
      const updateData: any = {
        front: editCardFront,
        back: editCardBack,
        context: editCardContext || undefined,
        type: editCardType,
      };

      // Add quiz-specific fields if needed
      if (editCardType === 'quiz') {
        updateData.options = editCardOptions.filter(opt => opt.trim() !== '');
        updateData.correctOptionIndex = editCardCorrectIndex;
      }

      const response = await updateCard(editCardsModalDeck.id, editingCardId, updateData);

      if (response.success) {
        // Update local state with API response
        const updatedCards = editCardsModalDeck.cards.map(card =>
          card.id === editingCardId
            ? {
                ...card,
                front: editCardFront,
                back: editCardBack,
                context: editCardContext,
                type: editCardType,
                options: editCardType === 'quiz' ? editCardOptions : undefined,
                correctOptionIndex: editCardType === 'quiz' ? editCardCorrectIndex : undefined,
              }
            : card
        );

        const updatedDeck = { ...editCardsModalDeck, cards: updatedCards };
        onEditDeck(updatedDeck);
        setEditCardsModalDeck(updatedDeck);
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

  const deleteCard = async (cardId: string) => {
    if (!editCardsModalDeck) return;
    if (!confirm(t('editCardsModal.deleteConfirm'))) return;

    try {
      const response = await deleteCardAPI(editCardsModalDeck.id, cardId);

      if (response.success) {
        const updatedCards = editCardsModalDeck.cards.filter(card => card.id !== cardId);
        const updatedDeck = {
          ...editCardsModalDeck,
          cards: updatedCards,
          totalCards: updatedCards.length,
        };
        onEditDeck(updatedDeck);
        setEditCardsModalDeck(updatedDeck);
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
    if (!editCardsModalDeck) return;

    try {
      const response = await createCard({
        deckId: editCardsModalDeck.id,
        front: t('editCardsModal.newQuestion'),
        back: t('editCardsModal.newAnswer'),
        context: '',
        type: 'standard',
      });

      if (response.success && response.data) {
        const newCard: Card = response.data;

        const updatedCards = [...editCardsModalDeck.cards, newCard];
        const updatedDeck = {
          ...editCardsModalDeck,
          cards: updatedCards,
          totalCards: updatedCards.length,
        };
        onEditDeck(updatedDeck);
        setEditCardsModalDeck(updatedDeck);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);

    if (editingDeckId) {
      // EDIT MODE (metadata only - no cards)
      const existingDeck = decks.find(d => d.id === editingDeckId);
      if (existingDeck) {
        const updatedDeck: DeckWithCards = {
          ...existingDeck,
          title,
          subject,
          difficulty,
          cards: [], // Empty array - we're only updating metadata
        };
        onEditDeck(updatedDeck);
      }
    } else if (generatingForDeckId) {
      // GENERATE CARDS FOR EXISTING EMPTY DECK
      const newCards: Card[] = [];
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
                deckId: generatingForDeckId || `d-${Date.now()}`,
                position: index,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }))
            );
          } else {
            alert(response.error?.message || t('toast.generationError'));
            setIsGenerating(false);
            return;
          }
        } catch (error) {
          console.error('Error generating cards:', error);
          alert(t('toast.generationError'));
          setIsGenerating(false);
          return;
        }
      }

      const existingDeck = decks.find(d => d.id === generatingForDeckId);
      if (existingDeck) {
        const updatedDeck: DeckWithCards = {
          ...existingDeck,
          cards: newCards,
          totalCards: newCards.length,
          masteredCards: 0,
        };
        onEditDeck(updatedDeck);
      }
    } else {
      // CREATE MODE
      const newCards: Card[] = [];
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
                deckId: generatingForDeckId || `d-${Date.now()}`,
                position: index,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }))
            );
          } else {
            alert(response.error?.message || t('toast.generationError'));
            setIsGenerating(false);
            return;
          }
        } catch (error) {
          console.error('Error generating cards:', error);
          alert(t('toast.generationError'));
          setIsGenerating(false);
          return;
        }
      }

      const newDeck: DeckWithCards = {
        id: `d-${Date.now()}`,
        ownerId: '', // Will be set by backend
        title,
        subject,
        topic: title, // Simplified
        difficulty,
        isPublic: false,
        tags: [],
        cards: newCards,
        totalCards: newCards.length,
        masteredCards: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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

  const getDifficultyLabel = (level: Difficulty): string => {
    return t(`difficulty.${level}`);
  };

  return (
    <div className="p-6 md:p-8 space-y-8 h-full overflow-y-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('header.title')}</h1>
          <p className="text-gray-500">{t('header.subtitle')}</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-gray-900 hover:bg-gray-800 text-white px-5 py-3 rounded-xl flex items-center gap-2 font-bold shadow-lg transition-all hover:-translate-y-1"
        >
          <Plus size={20} /> {t('header.newDeck')}
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
          <h3 className="font-bold text-gray-900 text-lg">{t('header.newDeck')}</h3>
          <p className="text-center text-gray-500 text-sm mt-2">
            {t('modal.import')} CSV/TXT sau {t('modal.aiAuto')}
          </p>
        </div>

        {/* Deck Cards */}
        {decks.map(deck => {
          const percentage =
            deck.totalCards > 0 ? Math.round((deck.masteredCards / deck.totalCards) * 100) : 0;
          const hasProgress = deck.masteredCards > 0;
          const inStudy = deck.totalCards - deck.masteredCards;

          return (
            <div
              key={deck.id}
              className="bg-[#F8F6F1] p-6 rounded-3xl relative group hover:shadow-md transition-shadow flex flex-col"
            >
              {/* Rating Display (top-right, before menu) */}
              {deck.averageRating && deck.averageRating > 0 && (
                <div className="absolute top-4 right-12 flex items-center gap-1 bg-white px-2 py-1 rounded-full shadow-sm">
                  <Star size={14} className="fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-semibold text-gray-700">
                    {deck.averageRating.toFixed(1)}
                  </span>
                  <span className="text-xs text-gray-500">({deck.reviewCount})</span>
                </div>
              )}

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
                          <RotateCcw size={16} /> {t('menu.resetProgress')}
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
                        <Edit size={16} /> {t('menu.editDeck')}
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
                          <List size={16} /> {t('menu.editCards')}
                        </button>
                      )}
                      {/* Lasă o recenzie - Only for public decks, not owner */}
                      {deck.isPublic && !deck.isOwner && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedDeckForReview(deck);
                            setReviewModalOpen(true);
                            setActiveMenuId(null);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg flex items-center gap-2 font-medium"
                        >
                          <ThumbsUp size={16} /> {t('menu.leaveReview')}
                        </button>
                      )}
                      {/* Raportează deck - Only for decks not owned by current user */}
                      {!deck.isOwner && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedDeckForFlag(deck);
                            setFlagModalOpen(true);
                            setActiveMenuId(null);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 rounded-lg flex items-center gap-2 font-medium"
                        >
                          <Flag size={16} /> {t('menu.reportDeck')}
                        </button>
                      )}
                      {/* Șterge deck with confirmation */}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          if (confirm(t('menu.deleteConfirm', { title: deck.title }))) {
                            onDeleteDeck(deck.id);
                          }
                          setActiveMenuId(null);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2 font-medium border-t border-gray-100 mt-1 pt-2"
                      >
                        <Trash2 size={16} /> {t('menu.deleteDeck')}
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
                  {deck.difficulty} - {getDifficultyLabel(deck.difficulty)}
                </span>
              </div>

              {/* Footer Stats: Total | In Study | Mastered */}
              <div className="text-sm text-gray-600 mb-4 font-medium">
                {t('deckCard.totalCards', { count: deck.totalCards })} |{' '}
                {t('deckCard.inStudy', { count: inStudy })} |{' '}
                {t('deckCard.mastered', { count: deck.masteredCards })}
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
                  title={t('deckCard.generate')}
                >
                  <Sparkles size={18} /> {t('deckCard.generate')}
                </button>

                {/* 2. Create Session */}
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onStartSession(deck);
                  }}
                  className="flex-1 bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={deck.totalCards === 0}
                  title={
                    deck.totalCards > 0 ? t('deckCard.createSession') : t('deckCard.addCardsFirst')
                  }
                >
                  <Play size={18} fill="currentColor" /> {t('deckCard.createSession')}
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
                ? t('modal.editDeck')
                : generatingForDeckId
                  ? t('modal.generateCards')
                  : t('modal.newDeck')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Form fields same as previous */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  {t('modal.subject')}
                </label>
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
                  {t('modal.titleLabel')}
                </label>
                <input
                  type="text"
                  className="w-full border-2 border-gray-100 bg-gray-50 rounded-xl p-3 font-medium outline-none focus:border-indigo-500 transition-colors"
                  placeholder={t('modal.titlePlaceholder')}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  {t('modal.difficultyLabel')}
                </label>
                <select
                  className="w-full border-2 border-gray-100 bg-gray-50 rounded-xl p-3 font-medium outline-none focus:border-indigo-500 transition-colors"
                  value={difficulty}
                  onChange={e => setDifficulty(e.target.value as Difficulty)}
                >
                  <option value="A1">A1 - {t('difficulty.A1')}</option>
                  <option value="A2">A2 - {t('difficulty.A2')}</option>
                  <option value="B1">B1 - {t('difficulty.B1')}</option>
                  <option value="B2">B2 - {t('difficulty.B2')}</option>
                  <option value="C1">C1 - {t('difficulty.C1')}</option>
                </select>
              </div>

              {!editingDeckId && !generatingForDeckId && (
                <>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      {importMode === 'ai' ? t('modal.numberOfCardsAI') : t('modal.numberOfCards')}
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
                        ? t('modal.cardsRecommendation')
                        : t('modal.cardsFromFile')}
                    </p>
                  </div>

                  <div className="pt-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      {t('modal.creationMethod')}
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setImportMode('ai')}
                        className={`p-3 rounded-xl border-2 text-sm flex flex-col items-center gap-1 font-bold transition-all ${importMode === 'ai' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-gray-100 text-gray-500 hover:bg-gray-50'}`}
                      >
                        <Sparkles size={20} /> {t('modal.aiAuto')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportMode('file')}
                        className={`p-3 rounded-xl border-2 text-sm flex flex-col items-center gap-1 font-bold transition-all ${importMode === 'file' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-gray-100 text-gray-500 hover:bg-gray-50'}`}
                      >
                        <Upload size={20} /> {t('modal.import')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportMode('manual')}
                        className={`p-3 rounded-xl border-2 text-sm flex flex-col items-center gap-1 font-bold transition-all ${importMode === 'manual' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-gray-100 text-gray-500 hover:bg-gray-50'}`}
                      >
                        <Plus size={20} /> {t('modal.manual')}
                      </button>
                    </div>
                  </div>

                  {importMode === 'ai' && (
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-3">
                        {t('modal.cardTypes')}
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
                            <span className="font-semibold text-gray-900">
                              {t('modal.standard')}
                            </span>
                            <p className="text-xs text-gray-600">{t('modal.standardDesc')}</p>
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
                            <span className="font-semibold text-gray-900">{t('modal.quiz')}</span>
                            <p className="text-xs text-gray-600">{t('modal.quizDesc')}</p>
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
                            <span className="font-semibold text-gray-900">
                              {t('modal.typeAnswer')}
                            </span>
                            <p className="text-xs text-gray-600">{t('modal.typeAnswerDesc')}</p>
                          </div>
                        </label>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">{t('modal.deselectCardType')}</p>
                    </div>
                  )}
                </>
              )}

              {generatingForDeckId && (
                <>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      {t('modal.numberOfCardsAI')}
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="50"
                      value={numberOfCards}
                      onChange={e => setNumberOfCards(parseInt(e.target.value) || 10)}
                      className="w-full border-2 border-gray-100 bg-gray-50 rounded-xl p-3 font-medium outline-none focus:border-indigo-500 transition-colors"
                    />
                    <p className="text-xs text-gray-500 mt-1">{t('modal.cardsRecommendation')}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">
                      {t('modal.cardTypes')}
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
                          <span className="font-semibold text-gray-900">{t('modal.standard')}</span>
                          <p className="text-xs text-gray-600">{t('modal.standardDesc')}</p>
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
                          <span className="font-semibold text-gray-900">{t('modal.quiz')}</span>
                          <p className="text-xs text-gray-600">{t('modal.quizDesc')}</p>
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
                          <span className="font-semibold text-gray-900">
                            {t('modal.typeAnswer')}
                          </span>
                          <p className="text-xs text-gray-600">{t('modal.typeAnswerDesc')}</p>
                        </div>
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">{t('modal.deselectCardType')}</p>
                  </div>
                </>
              )}

              {importMode === 'file' && !editingDeckId && !generatingForDeckId && (
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center bg-gray-50">
                  <input type="file" accept=".txt,.csv" className="w-full text-sm text-gray-500" />
                  <p className="text-xs text-gray-400 mt-2 font-medium">{t('modal.fileImport')}</p>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-white border-2 border-gray-200 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  {t('modal.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="flex-1 bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors flex justify-center items-center gap-2 shadow-lg hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <Loader2 className="animate-spin" />
                  ) : editingDeckId ? (
                    t('modal.save')
                  ) : generatingForDeckId ? (
                    t('modal.generateCardsBtn')
                  ) : (
                    t('modal.createDeck')
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
                <h2 className="text-2xl font-bold text-gray-900">{t('editCardsModal.title')}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {t('editCardsModal.subtitle', {
                    title: editCardsModalDeck.title,
                    count: editCardsModalDeck.cards.length,
                  })}
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
                  <p className="font-medium">{t('editCardsModal.noCards')}</p>
                  <p className="text-sm mt-1">{t('editCardsModal.addFirstCard')}</p>
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
                              setEditCardType(e.target.value as 'standard' | 'type-answer' | 'quiz')
                            }
                          >
                            <option value="standard">{t('modal.standard')}</option>
                            <option value="type-answer">{t('modal.typeAnswer')}</option>
                            <option value="quiz">{t('modal.quiz')}</option>
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
                            <p className="text-xs text-gray-500">
                              {t('editCardsModal.selectCorrect')}
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
                              onClick={() => deleteCard(card.id)}
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
      )}

      {/* Review Modal */}
      {reviewModalOpen && selectedDeckForReview && (
        <ReviewModal
          deckId={selectedDeckForReview.id}
          deckTitle={selectedDeckForReview.title}
          onClose={() => {
            setReviewModalOpen(false);
            setSelectedDeckForReview(null);
          }}
          onSuccess={() => {
            // Optionally refresh decks to show updated rating
            window.location.reload();
          }}
        />
      )}

      {/* Flag Modal */}
      {flagModalOpen && selectedDeckForFlag && (
        <FlagModal
          type="deck"
          itemId={selectedDeckForFlag.id}
          itemTitle={selectedDeckForFlag.title}
          onClose={() => {
            setFlagModalOpen(false);
            setSelectedDeckForFlag(null);
          }}
          onSuccess={() => {
            // Flag submitted successfully
          }}
        />
      )}
    </div>
  );
};
