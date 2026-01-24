import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Deck, DeckWithCards, Difficulty } from '../../../types';
import {
  Plus,
  MoreVertical,
  Sparkles,
  Trash2,
  Play,
  Edit,
  RotateCcw,
  List,
  Star,
  Flag,
  ThumbsUp,
  Download,
} from 'lucide-react';
import { getDeck } from '../../../api/decks';
import { useToast } from '../../ui/Toast';
import { ReviewModal } from '../../reviews/ReviewModal';
import { FlagModal } from '../../flags/FlagModal';
import { GenerateCardsModal } from './GenerateCardsModal';
import { EditCardsModal } from './EditCardsModal';
import { ExportModal } from './ExportModal';

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
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Generate/Create Modal State
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [generateModalMode, setGenerateModalMode] = useState<'create' | 'edit' | 'generate'>(
    'create'
  );
  const [selectedDeckForGenerate, setSelectedDeckForGenerate] = useState<{
    id: string;
    title: string;
    subject: string;
    difficulty: Difficulty;
  } | null>(null);

  // Edit Cards Modal State
  const [editCardsModalOpen, setEditCardsModalOpen] = useState(false);
  const [editCardsModalDeck, setEditCardsModalDeck] = useState<DeckWithCards | null>(null);

  // Export Modal State
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [selectedDeckForExport, setSelectedDeckForExport] = useState<{
    id: string;
    title: string;
  } | null>(null);

  // Review & Flag Modal State
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedDeckForFlag, setSelectedDeckForFlag] = useState<Deck | null>(null);
  const [selectedDeckForReview, setSelectedDeckForReview] = useState<Deck | null>(null);

  const openCreateModal = () => {
    // Guard: Visitors must register to create decks
    if (isGuest && onLoginPrompt) {
      onLoginPrompt(t('guestPrompt.createDeck.title'), t('guestPrompt.createDeck.message'));
      return;
    }

    setGenerateModalMode('create');
    setSelectedDeckForGenerate(null);
    setIsGenerateModalOpen(true);
  };

  const openEditModal = (deck: Deck) => {
    setGenerateModalMode('edit');
    setSelectedDeckForGenerate({
      id: deck.id,
      title: deck.title,
      subject: deck.subject,
      difficulty: deck.difficulty,
    });
    setIsGenerateModalOpen(true);
    setActiveMenuId(null);
  };

  const openGenerateCardsModal = (deck: Deck) => {
    // Guard: Visitors must register to use AI generation
    if (isGuest && onLoginPrompt) {
      onLoginPrompt(t('guestPrompt.aiGeneration.title'), t('guestPrompt.aiGeneration.message'));
      return;
    }

    setGenerateModalMode('generate');
    setSelectedDeckForGenerate({
      id: deck.id,
      title: deck.title || '',
      subject: deck.subject,
      difficulty: deck.difficulty,
    });
    setIsGenerateModalOpen(true);
    setActiveMenuId(null);
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
          masteredCards: deck.masteredCards || 0,
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

  const openExportModal = (deck: Deck) => {
    setSelectedDeckForExport({
      id: deck.id,
      title: deck.title,
    });
    setExportModalOpen(true);
    setActiveMenuId(null);
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
                      {/* Exportă carduri - Show if deck has at least 1 card */}
                      {deck.totalCards > 0 && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            openExportModal(deck);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-green-600 hover:bg-green-50 rounded-lg flex items-center gap-2 font-medium"
                        >
                          <Download size={16} /> {t('menu.exportDeck')}
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

      {/* Generate/Create/Edit Modal */}
      <GenerateCardsModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        mode={generateModalMode}
        existingDeck={selectedDeckForGenerate}
        onAddDeck={onAddDeck}
        onEditDeck={onEditDeck}
        decks={decks}
      />

      {/* Edit Cards Modal */}
      <EditCardsModal
        isOpen={editCardsModalOpen}
        deck={editCardsModalDeck}
        onClose={() => {
          setEditCardsModalOpen(false);
          setEditCardsModalDeck(null);
        }}
        onDeckUpdate={updatedDeck => {
          onEditDeck(updatedDeck);
          setEditCardsModalDeck(updatedDeck);
        }}
      />

      {/* Export Modal */}
      {selectedDeckForExport && (
        <ExportModal
          isOpen={exportModalOpen}
          deckId={selectedDeckForExport.id}
          deckTitle={selectedDeckForExport.title}
          onClose={() => {
            setExportModalOpen(false);
            setSelectedDeckForExport(null);
          }}
        />
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
