import React, { useState, useEffect, useMemo } from 'react';
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
} from 'lucide-react';
import { getDecks } from '../src/api/decks';
import type { DeckWithCards as APIDeck } from '../src/types';
import type { Deck } from '../types';
import { useToast } from '../src/components/ui/Toast';
import { getSubjectDisplayName } from '../src/constants/subjects';
import { ReviewModal } from '../src/components/reviews/ReviewModal';
import { FlagModal } from '../src/components/flags/FlagModal';
import { useAuth } from '../src/store/AuthContext';

interface GlobalDecksProps {
  onStartSession: (deck: Deck) => void;
  onImportDeck?: (deck: Deck) => void;
}

const GlobalDecks: React.FC<GlobalDecksProps> = ({ onStartSession, onImportDeck }) => {
  const toast = useToast();
  const { user } = useAuth();
  const [decks, setDecks] = useState<APIDeck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedDeckForFlag, setSelectedDeckForFlag] = useState<Deck | null>(null);
  const [selectedDeckForReview, setSelectedDeckForReview] = useState<Deck | null>(null);

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
          toast.error('Nu s-au putut încărca deck-urile publice');
        }
      } catch (error) {
        console.error('Error fetching public decks:', error);
        toast.error('Eroare la încărcarea deck-urilor');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPublicDecks();
  }, [toast]);

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

      return matchesSearch && matchesSubject && matchesDifficulty;
    });
  }, [decks, searchQuery, selectedSubject, selectedDifficulty]);

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

  // Convert API deck to local Deck type for handlers
  const convertToDeck = (apiDeck: APIDeck): Deck => {
    return {
      id: apiDeck.id,
      title: apiDeck.title,
      subject: apiDeck.subjectName || apiDeck.subject,
      topic: apiDeck.topic,
      difficulty: apiDeck.difficulty,
      cards: (apiDeck.cards || []).map(card => ({
        id: card.id,
        front: card.front,
        back: card.back,
        context: card.context,
        type: card.type as 'standard' | 'type-answer' | 'quiz',
        options: card.options,
        correctOptionIndex: card.correctOptionIndex,
        status: 'new' as const, // All cards are new when copying from global library
      })),
      totalCards: apiDeck.totalCards || 0,
      masteredCards: 0, // New deck for user, no progress yet
      lastStudied: undefined,
    };
  };

  const handleCopyDeck = async (deck: APIDeck) => {
    if (onImportDeck) {
      onImportDeck(convertToDeck(deck));
      toast.success(`Deck-ul "${deck.title}" a fost copiat în colecția ta!`);
    } else {
      toast.info('Funcția de copiere nu este disponibilă momentan');
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
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Se încarcă deck-urile globale...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 h-full overflow-y-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Deck-uri Globale</h1>
        <p className="text-gray-500 mt-2">
          Explorează și studiază din biblioteca de deck-uri create de comunitate
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#F8F6F1] p-4 rounded-xl">
          <div className="flex items-center gap-3">
            <BookOpen className="text-indigo-600" size={24} />
            <div>
              <p className="text-2xl font-bold text-gray-900">{decks.length}</p>
              <p className="text-xs text-gray-500">Deck-uri disponibile</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F8F6F1] p-4 rounded-xl">
          <div className="flex items-center gap-3">
            <Users className="text-blue-600" size={24} />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(decks.map(d => d.ownerId)).size}
              </p>
              <p className="text-xs text-gray-500">Creatori</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F8F6F1] p-4 rounded-xl">
          <div className="flex items-center gap-3">
            <Filter className="text-green-600" size={24} />
            <div>
              <p className="text-2xl font-bold text-gray-900">{subjects.length}</p>
              <p className="text-xs text-gray-500">Discipline</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Caută după titlu, topic sau creator..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Subject Filter */}
          <select
            value={selectedSubject}
            onChange={e => setSelectedSubject(e.target.value)}
            className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
          >
            <option value="all">Toate Disciplinele</option>
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
            className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
          >
            <option value="all">Toate Nivelurile</option>
            {difficulties.map(difficulty => (
              <option key={difficulty} value={difficulty}>
                Nivel {difficulty}
              </option>
            ))}
          </select>
        </div>

        {/* Active Filters Summary */}
        {(searchQuery || selectedSubject !== 'all' || selectedDifficulty !== 'all') && (
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
            <Filter size={16} />
            <span>
              Afișare {filteredDecks.length} din {decks.length} deck-uri
            </span>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedSubject('all');
                setSelectedDifficulty('all');
              }}
              className="ml-auto text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Resetează filtrele
            </button>
          </div>
        )}
      </div>

      {/* Decks Grouped by Subject */}
      {Object.keys(decksBySubject).length === 0 ? (
        <div className="bg-[#F8F6F1] rounded-2xl p-12 text-center">
          <BookOpen className="mx-auto mb-4 text-gray-300" size={48} />
          <h3 className="text-lg font-bold text-gray-600 mb-2">Niciun deck găsit</h3>
          <p className="text-gray-500 text-sm">
            Încearcă să modifici filtrele sau caută după alte cuvinte cheie
          </p>
        </div>
      ) : (
        Object.entries(decksBySubject)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([subject, subjectDecks]) => (
            <div key={subject} className="space-y-4">
              {/* Subject Header */}
              <div className="flex items-center gap-3">
                <div className={`w-1 h-8 ${getSubjectColor(subject)} rounded-full`}></div>
                <h2 className="text-2xl font-bold text-gray-900">{subject}</h2>
                <span className="text-sm text-gray-500 font-medium">
                  ({subjectDecks.length} {subjectDecks.length === 1 ? 'deck' : 'deck-uri'})
                </span>
              </div>

              {/* Deck Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjectDecks.map(deck => {
                  const isOwner = user && deck.ownerId === user.id;

                  return (
                    <div
                      key={deck.id}
                      className="bg-white border-2 border-gray-100 rounded-2xl p-6 hover:border-indigo-300 hover:shadow-lg transition-all group relative"
                    >
                      {/* Rating Display (top-right, before menu) */}
                      {deck.averageRating && deck.averageRating > 0 && (
                        <div className="absolute top-4 right-12 flex items-center gap-1 bg-white px-2 py-1 rounded-full shadow-sm border border-gray-100">
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
                              {/* Lasă o recenzie - Only for non-owners */}
                              {!isOwner && (
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    setSelectedDeckForReview(convertToDeck(deck));
                                    setReviewModalOpen(true);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg flex items-center gap-2 font-medium"
                                >
                                  <ThumbsUp size={16} /> Lasă o recenzie
                                </button>
                              )}
                              {/* Raportează deck */}
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setSelectedDeckForFlag(convertToDeck(deck));
                                  setFlagModalOpen(true);
                                  setActiveMenuId(null);
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 rounded-lg flex items-center gap-2 font-medium"
                              >
                                <Flag size={16} /> Raportează deck
                              </button>
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
                        <h3 className="text-lg font-bold text-gray-900 mb-1 pr-8">{deck.title}</h3>
                        <p className="text-sm text-gray-500 mb-2">{deck.topic}</p>
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Users size={12} />
                          Creat de:{' '}
                          <span className="font-medium">{deck.ownerName || 'Anonim'}</span>
                        </p>
                      </div>

                      {/* Deck Info */}
                      <div className="mb-4 bg-gray-50 rounded-xl p-3">
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>{deck.totalCards} carduri</span>
                          <span>Nivel {deck.difficulty}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => onStartSession(convertToDeck(deck))}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95"
                        >
                          <Play size={16} fill="currentColor" />
                          <span>Studiază</span>
                        </button>
                        <button
                          onClick={() => handleCopyDeck(deck)}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
                          title="Copiază în colecția mea"
                        >
                          <Copy size={16} />
                        </button>
                      </div>

                      {/* Last Updated */}
                      {deck.updatedAt && (
                        <p className="text-xs text-gray-400 text-center mt-3">
                          Actualizat: {new Date(deck.updatedAt).toLocaleDateString('ro-RO')}
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
          onSuccess={async () => {
            // Refresh decks to show updated rating
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

export default GlobalDecks;
