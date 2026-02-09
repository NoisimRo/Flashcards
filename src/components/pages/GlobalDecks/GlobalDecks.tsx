import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  Play,
  Search,
  Filter,
  Download,
  Copy,
  Users,
  Loader2,
  MoreVertical,
  Star,
  ThumbsUp,
  Flag,
  List,
  Trash2,
  Edit,
  EyeOff,
  Eye,
} from 'lucide-react';
import { getDecks, getDeck, deleteDeck, updateDeck } from '../../../api/decks';
import type { DeckWithCards as APIDeck } from '../../../types';
import type { Deck, DeckWithCards } from '../../../types';
import { useToast } from '../../ui/Toast';
import { getSubjectDisplayName } from '../../../constants/subjects';
import { ReviewModal } from '../../reviews/ReviewModal';
import { FlagModal } from '../../flags/FlagModal';
import { EditCardsModal } from '../DeckList/EditCardsModal';
import { useAuth } from '../../../store/AuthContext';

interface GlobalDecksProps {
  onStartSession: (deck: Deck) => void;
  onImportDeck?: (deck: APIDeck) => void;
}

export const GlobalDecks: React.FC<GlobalDecksProps> = ({ onStartSession, onImportDeck }) => {
  const { t, i18n } = useTranslation('globalDecks');
  const toast = useToast();
  const { user } = useAuth();
  const [decks, setDecks] = useState<APIDeck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedRating, setSelectedRating] = useState<string>('all');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedDeckForFlag, setSelectedDeckForFlag] = useState<Deck | null>(null);
  const [selectedDeckForReview, setSelectedDeckForReview] = useState<Deck | null>(null);
  const [editCardsModalOpen, setEditCardsModalOpen] = useState(false);
  const [editCardsModalDeck, setEditCardsModalDeck] = useState<DeckWithCards | null>(null);

  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin';

  // Fetch public decks on mount
  useEffect(() => {
    const fetchPublicDecks = async () => {
      setIsLoading(true);
      try {
        const response = await getDecks({
          publicOnly: true,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        });

        if (response.success && response.data) {
          setDecks(response.data);
        } else {
          toast.error(t('toast.loadError'));
        }
      } catch (error) {
        console.error('Error fetching public decks:', error);
        toast.error(t('toast.generalError'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchPublicDecks();
  }, [toast, t]);

  // Get unique subjects and difficulties
  const { subjects, difficulties } = useMemo(() => {
    const subjectsSet = new Set<string>();
    const difficultiesSet = new Set<string>();

    decks.forEach(deck => {
      if (deck.subjectName) subjectsSet.add(deck.subjectName);
      if (deck.difficulty) difficultiesSet.add(deck.difficulty);
    });

    return {
      subjects: Array.from(subjectsSet).sort(),
      difficulties: Array.from(difficultiesSet).sort(),
    };
  }, [decks]);

  // Filter decks based on search and filters
  const filteredDecks = useMemo(() => {
    return decks.filter(deck => {
      // Search filter (title, topic, or creator name)
      const matchesSearch =
        searchQuery === '' ||
        deck.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deck.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (deck.ownerName && deck.ownerName.toLowerCase().includes(searchQuery.toLowerCase()));

      // Subject filter
      const matchesSubject = selectedSubject === 'all' || deck.subjectName === selectedSubject;

      // Difficulty filter
      const matchesDifficulty =
        selectedDifficulty === 'all' || deck.difficulty === selectedDifficulty;

      // Rating filter
      let matchesRating = true;
      if (selectedRating !== 'all') {
        const minRating = parseFloat(selectedRating);
        if (minRating === 5) {
          matchesRating = (deck.averageRating ?? 0) >= 4.5;
        } else {
          matchesRating = (deck.averageRating ?? 0) >= minRating;
        }
      }

      return matchesSearch && matchesSubject && matchesDifficulty && matchesRating;
    });
  }, [decks, searchQuery, selectedSubject, selectedDifficulty, selectedRating]);

  // Group decks by subject
  const decksBySubject = useMemo(() => {
    const grouped: Record<string, APIDeck[]> = {};

    filteredDecks.forEach(deck => {
      const subject = deck.subjectName || 'Altele';
      if (!grouped[subject]) {
        grouped[subject] = [];
      }
      grouped[subject].push(deck);
    });

    return grouped;
  }, [filteredDecks]);

  // Convert API deck to local DeckWithCards type for handlers
  const convertToDeck = (apiDeck: APIDeck): APIDeck => {
    return {
      ...apiDeck,
      subject: apiDeck.subjectName || apiDeck.subject,
      cards: apiDeck.cards || [],
      masteredCards: 0, // New deck for user, no progress yet
      lastStudied: undefined,
    };
  };

  const handleCopyDeck = async (deck: APIDeck) => {
    if (onImportDeck) {
      onImportDeck(convertToDeck(deck));
      toast.success(t('toast.deckCopied', { title: deck.title }));
    } else {
      toast.info(t('toast.copyNotAvailable'));
    }
  };

  const refreshDecks = async () => {
    try {
      const response = await getDecks({
        publicOnly: true,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      if (response.success && response.data) {
        setDecks(response.data);
      }
    } catch (error) {
      console.error('Error refreshing decks:', error);
    }
  };

  const handleDeleteDeck = async (deck: APIDeck) => {
    if (!confirm(t('menu.deleteConfirm', { title: deck.title }))) return;
    try {
      await deleteDeck(deck.id);
      setDecks(prev => prev.filter(d => d.id !== deck.id));
      toast.success(t('toast.deckDeleted', { title: deck.title }));
    } catch (error) {
      console.error('Error deleting deck:', error);
      toast.error(t('toast.generalError'));
    }
    setActiveMenuId(null);
  };

  const handleToggleVisibility = async (deck: APIDeck) => {
    try {
      await updateDeck(deck.id, { isPublic: !deck.isPublic });
      if (!deck.isPublic) {
        // Was private, now public — refresh to show it
        await refreshDecks();
      } else {
        // Was public, now private — remove from list
        setDecks(prev => prev.filter(d => d.id !== deck.id));
      }
      toast.success(t('toast.visibilityChanged'));
    } catch (error) {
      console.error('Error toggling visibility:', error);
      toast.error(t('toast.generalError'));
    }
    setActiveMenuId(null);
  };

  const openEditCardsModal = async (deck: APIDeck) => {
    try {
      const response = await getDeck(deck.id);
      if (response.success && response.data) {
        const deckWithCards: DeckWithCards = {
          ...response.data,
          subject: response.data.subjectName || response.data.subject,
          masteredCards: 0,
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
      toast.error(t('toast.generalError'));
    }
  };

  const toggleMenu = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  // Close menus when clicking outside
  useEffect(() => {
    const closeMenu = () => setActiveMenuId(null);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, []);

  const getSubjectColor = (subject: string) => {
    const colorMap: Record<string, string> = {
      Matematică: 'bg-blue-500',
      'Limba Română': 'bg-indigo-600',
      Istorie: 'bg-orange-500',
      Geografie: 'bg-green-500',
      Biologie: 'bg-emerald-600',
      Fizică: 'bg-purple-500',
      Chimie: 'bg-pink-500',
      Informatică: 'bg-cyan-500',
      'Limba Engleză': 'bg-red-500',
    };
    return colorMap[subject] || 'bg-gray-900';
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[var(--color-accent)] mx-auto mb-4" />
          <p className="text-[var(--text-secondary)] font-medium">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 h-full overflow-y-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">{t('header.title')}</h1>
        <p className="text-[var(--text-tertiary)] mt-2">{t('header.subtitle')}</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[var(--bg-secondary)] p-4 rounded-xl">
          <div className="flex items-center gap-3">
            <BookOpen className="text-[var(--color-accent)]" size={24} />
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{decks.length}</p>
              <p className="text-xs text-[var(--text-tertiary)]">{t('stats.decksAvailable')}</p>
            </div>
          </div>
        </div>
        <div className="bg-[var(--bg-secondary)] p-4 rounded-xl">
          <div className="flex items-center gap-3">
            <Users className="text-blue-500" size={24} />
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {new Set(decks.map(d => d.ownerId)).size}
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">{t('stats.creators')}</p>
            </div>
          </div>
        </div>
        <div className="bg-[var(--bg-secondary)] p-4 rounded-xl">
          <div className="flex items-center gap-3">
            <Filter className="text-green-500" size={24} />
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{subjects.length}</p>
              <p className="text-xs text-[var(--text-tertiary)]">{t('stats.subjects')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-[var(--card-bg)] p-6 rounded-2xl shadow-sm border border-[var(--card-border)]">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              size={20}
            />
            <input
              type="text"
              placeholder={t('search.placeholder')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-[var(--input-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-ring)] focus:border-transparent bg-[var(--input-bg)] text-[var(--text-primary)]"
            />
          </div>

          {/* Subject Filter */}
          <select
            value={selectedSubject}
            onChange={e => setSelectedSubject(e.target.value)}
            className="px-4 py-3 border border-[var(--input-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-ring)] focus:border-transparent bg-[var(--input-bg)] text-[var(--text-primary)]"
          >
            <option value="all">{t('search.allSubjects')}</option>
            {subjects.map(subject => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>

          {/* Difficulty Filter */}
          <select
            value={selectedDifficulty}
            onChange={e => setSelectedDifficulty(e.target.value)}
            className="px-4 py-3 border border-[var(--input-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-ring)] focus:border-transparent bg-[var(--input-bg)] text-[var(--text-primary)]"
          >
            <option value="all">{t('search.allLevels')}</option>
            {difficulties.map(difficulty => (
              <option key={difficulty} value={difficulty}>
                {t('search.level', { level: difficulty })}
              </option>
            ))}
          </select>

          {/* Rating Filter */}
          <select
            value={selectedRating}
            onChange={e => setSelectedRating(e.target.value)}
            className="px-4 py-3 border border-[var(--input-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-ring)] focus:border-transparent bg-[var(--input-bg)] text-[var(--text-primary)]"
          >
            <option value="all">{t('search.allRatings')}</option>
            <option value="5">{t('search.stars', { count: 5 })}</option>
            <option value="4">{t('search.starsAndAbove', { count: 4 })}</option>
            <option value="3">{t('search.starsAndAbove', { count: 3 })}</option>
            <option value="2">{t('search.starsAndAbove', { count: 2 })}</option>
          </select>
        </div>

        {/* Active Filters Summary */}
        {(searchQuery ||
          selectedSubject !== 'all' ||
          selectedDifficulty !== 'all' ||
          selectedRating !== 'all') && (
          <div className="mt-4 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <Filter size={16} />
            <span>
              {t('search.showing', { filtered: filteredDecks.length, total: decks.length })}
            </span>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedSubject('all');
                setSelectedDifficulty('all');
                setSelectedRating('all');
              }}
              className="ml-auto text-[var(--color-accent-text)] hover:opacity-80 font-medium"
            >
              {t('search.resetFilters')}
            </button>
          </div>
        )}
      </div>

      {/* Decks Grouped by Subject */}
      {Object.keys(decksBySubject).length === 0 ? (
        <div className="bg-[var(--bg-secondary)] rounded-2xl p-12 text-center">
          <BookOpen className="mx-auto mb-4 text-[var(--text-muted)]" size={48} />
          <h3 className="text-lg font-bold text-[var(--text-secondary)] mb-2">
            {t('empty.title')}
          </h3>
          <p className="text-[var(--text-tertiary)] text-sm">{t('empty.subtitle')}</p>
        </div>
      ) : (
        Object.entries(decksBySubject)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([subject, subjectDecks]) => (
            <div key={subject} className="space-y-4">
              {/* Subject Header */}
              <div className="flex items-center gap-3">
                <div className={`w-1 h-8 ${getSubjectColor(subject)} rounded-full`}></div>
                <h2 className="text-2xl font-bold text-[var(--text-primary)]">{subject}</h2>
                <span className="text-sm text-[var(--text-tertiary)] font-medium">
                  ({subjectDecks.length}{' '}
                  {subjectDecks.length === 1 ? t('deckCard.deck') : t('deckCard.decks')})
                </span>
              </div>

              {/* Deck Grid - adaptive columns based on deck count */}
              <div
                className={`grid gap-4 ${
                  subjectDecks.length === 1
                    ? 'grid-cols-1 max-w-md'
                    : subjectDecks.length === 2
                      ? 'grid-cols-1 md:grid-cols-2 max-w-3xl'
                      : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                }`}
              >
                {subjectDecks.map(deck => {
                  const isOwner = user && deck.ownerId === user.id;

                  return (
                    <div
                      key={deck.id}
                      className="bg-[var(--card-bg)] border-2 border-[var(--card-border)] rounded-2xl p-6 hover:border-[var(--color-accent)] hover:shadow-lg transition-all group relative"
                    >
                      {/* Rating Display (top-right, before menu) */}
                      {deck.averageRating && deck.averageRating > 0 && (
                        <div className="absolute top-4 right-12 flex items-center gap-1 bg-[var(--bg-elevated)] px-2 py-1 rounded-full shadow-sm border border-[var(--border-subtle)]">
                          <Star size={14} className="fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-semibold text-[var(--text-secondary)]">
                            {deck.averageRating.toFixed(1)}
                          </span>
                          <span className="text-xs text-[var(--text-tertiary)]">
                            ({deck.reviewCount})
                          </span>
                        </div>
                      )}

                      {/* Three-Dot Menu (top-right corner) */}
                      <div className="absolute top-4 right-4">
                        <div className="relative">
                          <button
                            onClick={e => toggleMenu(e, deck.id)}
                            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-full hover:bg-[var(--bg-tertiary)] transition-colors"
                          >
                            <MoreVertical size={18} />
                          </button>

                          {activeMenuId === deck.id && (
                            <div className="absolute right-0 top-8 bg-[var(--bg-elevated)] shadow-xl rounded-xl p-2 min-w-[180px] z-10 border border-[var(--border-subtle)] animate-fade-in">
                              {/* Edit cards - Only for teachers and admins */}
                              {isTeacherOrAdmin && deck.totalCards > 0 && (
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    openEditCardsModal(deck);
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm text-blue-500 hover:bg-[var(--bg-surface-hover)] rounded-lg flex items-center gap-2 font-medium"
                                >
                                  <List size={16} /> {t('menu.editCards')}
                                </button>
                              )}
                              {/* Toggle visibility - Admin only */}
                              {user?.role === 'admin' && (
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleToggleVisibility(deck);
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] rounded-lg flex items-center gap-2 font-medium"
                                >
                                  {deck.isPublic ? (
                                    <>
                                      <EyeOff size={16} /> {t('menu.makePrivate')}
                                    </>
                                  ) : (
                                    <>
                                      <Eye size={16} /> {t('menu.makePublic')}
                                    </>
                                  )}
                                </button>
                              )}
                              {/* Lasă o recenzie - Only for non-owners */}
                              {!isOwner && (
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    setSelectedDeckForReview(convertToDeck(deck));
                                    setReviewModalOpen(true);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm text-[var(--color-accent-text)] hover:bg-[var(--color-accent-light)] rounded-lg flex items-center gap-2 font-medium"
                                >
                                  <ThumbsUp size={16} /> {t('menu.leaveReview')}
                                </button>
                              )}
                              {/* Raportează deck - Only for decks not owned by current user */}
                              {!isOwner && (
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    setSelectedDeckForFlag(convertToDeck(deck));
                                    setFlagModalOpen(true);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm text-orange-500 hover:bg-orange-500/10 rounded-lg flex items-center gap-2 font-medium"
                                >
                                  <Flag size={16} /> {t('menu.report')}
                                </button>
                              )}
                              {/* Delete deck - Admin or owner */}
                              {(user?.role === 'admin' || isOwner) && (
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleDeleteDeck(deck);
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-lg flex items-center gap-2 font-medium border-t border-[var(--border-subtle)] mt-1 pt-2"
                                >
                                  <Trash2 size={16} /> {t('menu.deleteDeck')}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Deck Header */}
                      <div className="mb-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-bold text-white mb-3 ${getSubjectColor(subject)}`}
                        >
                          {subject}
                        </span>
                        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1 pr-8">
                          {deck.title}
                        </h3>
                        <p className="text-sm text-[var(--text-tertiary)] mb-2">{deck.topic}</p>
                        <p className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                          <Users size={12} />
                          {t('deckCard.createdBy')}{' '}
                          <span className="font-medium">
                            {deck.ownerName || t('deckCard.anonymous')}
                          </span>
                        </p>
                      </div>

                      {/* Deck Info */}
                      <div className="mb-4 bg-[var(--bg-tertiary)] rounded-xl p-3">
                        <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                          <span>{t('deckCard.cards', { count: deck.totalCards })}</span>
                          <span>{t('deckCard.level', { level: deck.difficulty })}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => onStartSession(convertToDeck(deck))}
                          className="flex-1 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95"
                        >
                          <Play size={16} fill="currentColor" />
                          <span>{t('deckCard.study')}</span>
                        </button>
                        <button
                          onClick={() => handleCopyDeck(deck)}
                          className="bg-[var(--bg-tertiary)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
                          title={t('deckCard.copy')}
                        >
                          <Copy size={16} />
                        </button>
                      </div>

                      {/* Last Updated */}
                      {deck.updatedAt && (
                        <p className="text-xs text-[var(--text-muted)] text-center mt-3">
                          {t('deckCard.updated', {
                            date: new Date(deck.updatedAt).toLocaleDateString(i18n.language),
                          })}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
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
          onSuccess={refreshDecks}
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

      {/* Edit Cards Modal (Teacher/Admin) */}
      <EditCardsModal
        isOpen={editCardsModalOpen}
        deck={editCardsModalDeck}
        onClose={() => {
          setEditCardsModalOpen(false);
          setEditCardsModalDeck(null);
        }}
        onDeckUpdate={updatedDeck => {
          // Update local deck list with the edited cards
          setDecks(prev =>
            prev.map(d =>
              d.id === updatedDeck.id
                ? { ...d, cards: updatedDeck.cards, totalCards: updatedDeck.cards.length }
                : d
            )
          );
          setEditCardsModalDeck(updatedDeck);
        }}
      />
    </div>
  );
};
