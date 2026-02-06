import React, { useState, useEffect } from 'react';
import { Shield, Filter, Eye, CheckCircle, XCircle, Clock, Edit, X } from 'lucide-react';
import { useToast } from '../ui/Toast';
import { getFlags, updateFlagStatus, type Flag, type FlagStatus } from '../../api/flags';
import { getCardTags } from '../../api/cards';
import { getDeckCards } from '../../api/studySessions';
import { EditCardModal } from '../study-session/modals/EditCardModal';
import type { Card, CardFlag } from '../../types/models';

type FlagTypeFilter = 'all' | 'card' | 'deck';

// Simple time ago function
function timeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  const intervals = {
    an: 31536000,
    lună: 2592000,
    săptămână: 604800,
    zi: 86400,
    oră: 3600,
    minut: 60,
  };

  for (const [name, secondsInInterval] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInInterval);
    if (interval >= 1) {
      return `acum ${interval} ${name}${interval > 1 && name !== 'lună' ? (name === 'zi' ? 'le' : name === 'oră' ? 'e' : name === 'an' ? 'i' : 'i') : ''}`;
    }
  }
  return 'acum';
}

const STATUS_CONFIG: Record<
  FlagStatus,
  { label: string; color: string; bgColor: string; icon: React.ReactNode }
> = {
  pending: {
    label: 'În așteptare',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    icon: <Clock size={16} />,
  },
  under_review: {
    label: 'În revizuire',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    icon: <Eye size={16} />,
  },
  resolved: {
    label: 'Rezolvat',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    icon: <CheckCircle size={16} />,
  },
  dismissed: {
    label: 'Respins',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    icon: <XCircle size={16} />,
  },
};

export const ModerationDashboard: React.FC = () => {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<FlagTypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<FlagStatus | 'all'>('pending');
  const [selectedFlag, setSelectedFlag] = useState<Flag | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Unified EditCardModal state
  const [editCard, setEditCard] = useState<Card | null>(null);
  const [isLoadingCard, setIsLoadingCard] = useState(false);
  const [existingTags, setExistingTags] = useState<string[]>([]);

  // Mobile details panel
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);

  const toast = useToast();

  useEffect(() => {
    loadFlags();
  }, [typeFilter, statusFilter]);

  const loadFlags = async () => {
    setIsLoading(true);
    try {
      const response = await getFlags({
        type: typeFilter,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        page: 1,
        limit: 50,
      });

      if (response.success && response.data) {
        setFlags(response.data);
      } else {
        toast.error('Eroare', 'Nu s-au putut încărca rapoartele');
      }
    } catch (error) {
      console.error('Error loading flags:', error);
      toast.error('Eroare', 'A apărut o eroare la încărcarea rapoartelor');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFlag = (flag: Flag) => {
    setSelectedFlag(flag);
    setMobileDetailsOpen(true);
  };

  const handleUpdateStatus = async (
    flagId: string,
    newStatus: 'under_review' | 'resolved' | 'dismissed'
  ) => {
    setIsUpdating(true);
    try {
      const response = await updateFlagStatus(flagId, {
        status: newStatus,
        reviewNotes: reviewNotes || undefined,
      });

      if (response.success) {
        toast.success(
          'Status actualizat',
          `Raportul a fost marcat ca ${STATUS_CONFIG[newStatus].label.toLowerCase()}`
        );
        setFlags(flags.map(f => (f.id === flagId ? { ...f, status: newStatus } : f)));
        setSelectedFlag(null);
        setMobileDetailsOpen(false);
        setReviewNotes('');
        loadFlags(); // Refresh list
      } else {
        toast.error('Eroare', response.error?.message || 'Nu s-a putut actualiza statusul');
      }
    } catch (error) {
      console.error('Error updating flag status:', error);
      toast.error('Eroare', 'A apărut o eroare la actualizarea statusului');
    } finally {
      setIsUpdating(false);
    }
  };

  const openEditCardModal = async () => {
    if (!selectedFlag || selectedFlag.type !== 'card' || !('cardId' in selectedFlag)) {
      return;
    }

    const cardFlag = selectedFlag as CardFlag;
    setIsLoadingCard(true);

    try {
      // Fetch all cards for the deck, then find the specific card
      // (no single-card GET endpoint exists on the server)
      const [cardsResponse, tagsResponse] = await Promise.all([
        getDeckCards(cardFlag.deckId),
        getCardTags(cardFlag.deckId),
      ]);

      if (cardsResponse.success && cardsResponse.data?.cards) {
        const fullCard = cardsResponse.data.cards.find((c: Card) => c.id === cardFlag.cardId) as
          | Card
          | undefined;

        if (fullCard) {
          setEditCard(fullCard);
        } else {
          toast.error('Eroare', 'Cardul nu a fost găsit în deck');
          return;
        }
      } else {
        toast.error('Eroare', 'Nu s-au putut încărca datele cardului');
        return;
      }

      if (tagsResponse.success && tagsResponse.data) {
        setExistingTags(tagsResponse.data);
      }
    } catch (error) {
      console.error('Error loading card for edit:', error);
      toast.error('Eroare', 'A apărut o eroare la încărcarea cardului');
    } finally {
      setIsLoadingCard(false);
    }
  };

  const handleCardSaved = async (updatedCard: Card) => {
    toast.success('Card actualizat cu succes');
    setEditCard(null);

    // Auto-resolve the flag after successful edit
    if (selectedFlag) {
      await handleUpdateStatus(selectedFlag.id, 'resolved');
    }
  };

  const getStatusBadge = (status: FlagStatus) => {
    const config = STATUS_CONFIG[status];
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color} ${config.bgColor}`}
      >
        {config.icon}
        {config.label}
      </span>
    );
  };

  // Extracted details panel content — reused for desktop sidebar and mobile overlay
  const renderDetailsContent = () => {
    if (!selectedFlag) return null;

    return (
      <div className="space-y-4">
        {/* Type & Status */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">TIP & STATUS</p>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
              {selectedFlag.type === 'card' ? 'Card' : 'Deck'}
            </span>
            {getStatusBadge(selectedFlag.status)}
          </div>
        </div>

        {/* Content */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">CONȚINUT</p>
          <p className="text-sm font-medium text-gray-900">{selectedFlag.deckTitle}</p>
          {selectedFlag.type === 'card' && 'cardFront' in selectedFlag && (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg space-y-2">
              <div>
                <p className="text-xs font-medium text-gray-600">Față:</p>
                <p className="text-sm text-gray-900">{selectedFlag.cardFront}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600">Spate:</p>
                <p className="text-sm text-gray-900">{selectedFlag.cardBack}</p>
              </div>
            </div>
          )}
        </div>

        {/* Reason */}
        {'reason' in selectedFlag && selectedFlag.reason && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">MOTIV</p>
            <p className="text-sm text-gray-900">{selectedFlag.reason.replace(/_/g, ' ')}</p>
          </div>
        )}

        {/* Comment */}
        {selectedFlag.comment && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">DETALII</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedFlag.comment}</p>
          </div>
        )}

        {/* Reporter */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">RAPORTAT DE</p>
          <p className="text-sm text-gray-900">{selectedFlag.flaggedByName || 'Anonim'}</p>
          <p className="text-xs text-gray-500">{timeAgo(new Date(selectedFlag.createdAt))}</p>
        </div>

        {/* Review Notes */}
        {selectedFlag.status === 'pending' && (
          <div>
            <label htmlFor="reviewNotes" className="block text-xs font-medium text-gray-500 mb-2">
              NOTE DE REVIZUIRE (OPȚIONAL)
            </label>
            <textarea
              id="reviewNotes"
              value={reviewNotes}
              onChange={e => setReviewNotes(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Adaugă note despre decizia ta..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>
        )}

        {/* Edit Card Button (for card flags) */}
        {selectedFlag.type === 'card' && 'cardFront' in selectedFlag && (
          <div className="pt-4 border-t">
            <button
              onClick={openEditCardModal}
              disabled={isLoadingCard}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Edit size={18} /> {isLoadingCard ? 'Se încarcă...' : 'Editează Card'}
            </button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Editarea va rezolva automat raportul
            </p>
          </div>
        )}

        {/* Actions */}
        {selectedFlag.status === 'pending' && (
          <div className="space-y-2 pt-4 border-t">
            <button
              onClick={() => handleUpdateStatus(selectedFlag.id, 'under_review')}
              disabled={isUpdating}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Marchează în revizuire
            </button>
            <button
              onClick={() => handleUpdateStatus(selectedFlag.id, 'resolved')}
              disabled={isUpdating}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              Rezolvă raportul
            </button>
            <button
              onClick={() => handleUpdateStatus(selectedFlag.id, 'dismissed')}
              disabled={isUpdating}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-xl font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Respinge raportul
            </button>
          </div>
        )}

        {/* Review Info (if already reviewed) */}
        {selectedFlag.status !== 'pending' && selectedFlag.reviewedByName && (
          <div className="pt-4 border-t">
            <p className="text-xs font-medium text-gray-500 mb-2">REVIZUIT DE</p>
            <p className="text-sm text-gray-900">{selectedFlag.reviewedByName}</p>
            {selectedFlag.reviewedAt && (
              <p className="text-xs text-gray-500">{timeAgo(new Date(selectedFlag.reviewedAt))}</p>
            )}
            {selectedFlag.reviewNotes && (
              <p className="text-sm text-gray-700 mt-2 p-3 bg-gray-50 rounded-lg">
                {selectedFlag.reviewNotes}
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8F6F1] p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield size={32} className="text-indigo-600" />
          <h1 className="text-4xl font-bold text-gray-900">Panou de Moderare</h1>
        </div>
        <p className="text-gray-600">Gestionează rapoartele de conținut și moderează platforma</p>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Filters & List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Filter size={20} className="text-gray-600" />
                <h2 className="text-lg font-bold text-gray-900">Filtre</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tip conținut
                  </label>
                  <select
                    value={typeFilter}
                    onChange={e => setTypeFilter(e.target.value as FlagTypeFilter)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="all">Toate</option>
                    <option value="card">Carduri</option>
                    <option value="deck">Deck-uri</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as FlagStatus | 'all')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="all">Toate</option>
                    <option value="pending">În așteptare</option>
                    <option value="under_review">În revizuire</option>
                    <option value="resolved">Rezolvate</option>
                    <option value="dismissed">Respinse</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Flags List */}
            <div className="space-y-4">
              {isLoading ? (
                <div className="bg-white rounded-2xl p-8 text-center">
                  <p className="text-gray-500">Se încarcă rapoartele...</p>
                </div>
              ) : flags.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center">
                  <p className="text-gray-500">Nu există rapoarte cu aceste filtre</p>
                </div>
              ) : (
                flags.map(flag => (
                  <div
                    key={flag.id}
                    className={`bg-white rounded-2xl p-6 shadow-sm cursor-pointer transition-all hover:shadow-md ${
                      selectedFlag?.id === flag.id ? 'ring-2 ring-indigo-500' : ''
                    }`}
                    onClick={() => handleSelectFlag(flag)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                          {flag.type === 'card' ? 'Card' : 'Deck'}
                        </span>
                        {getStatusBadge(flag.status)}
                      </div>
                      <p className="text-xs text-gray-500">{timeAgo(new Date(flag.createdAt))}</p>
                    </div>

                    <h3 className="font-bold text-gray-900 mb-2">
                      {flag.deckTitle || 'Fără titlu'}
                    </h3>

                    {flag.type === 'card' &&
                      'cardFront' in flag &&
                      (flag.cardFront || flag.cardBack) && (
                        <div className="mb-3 p-3 bg-gray-50 rounded-lg text-sm">
                          <p className="text-gray-600 truncate">
                            <span className="font-medium">Față:</span> {flag.cardFront}
                          </p>
                        </div>
                      )}

                    {'reason' in flag && flag.reason && (
                      <p className="text-sm text-orange-600 font-medium mb-2">
                        Motiv: {flag.reason.replace(/_/g, ' ')}
                      </p>
                    )}

                    {flag.comment && (
                      <p className="text-sm text-gray-700 line-clamp-2">{flag.comment}</p>
                    )}

                    <p className="text-xs text-gray-500 mt-2">
                      Raportat de: {flag.flaggedByName || 'Anonim'}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Details Panel — Desktop only (hidden on mobile, shown on lg+) */}
          <div className="hidden lg:block lg:col-span-1">
            {selectedFlag ? (
              <div className="bg-white rounded-2xl p-6 shadow-sm sticky top-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Detalii raport</h2>
                {renderDetailsContent()}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
                <Shield size={48} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Selectează un raport pentru a vedea detaliile</p>
              </div>
            )}
          </div>
        </div>

        {/* Details Panel — Mobile overlay (shown on mobile when a flag is selected) */}
        {selectedFlag && mobileDetailsOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-[90] lg:hidden backdrop-blur-sm"
            onClick={() => setMobileDetailsOpen(false)}
          >
            <div
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl max-h-[85vh] overflow-y-auto animate-slide-up"
              onClick={e => e.stopPropagation()}
            >
              {/* Drag handle */}
              <div className="sticky top-0 bg-white rounded-t-2xl pt-3 pb-2 px-6 border-b border-gray-100 z-10">
                <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900">Detalii raport</h2>
                  <button
                    onClick={() => setMobileDetailsOpen(false)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>
              </div>
              <div className="p-6">{renderDetailsContent()}</div>
            </div>
          </div>
        )}

        {/* Unified EditCardModal */}
        {editCard && (
          <EditCardModal
            card={editCard}
            onClose={() => setEditCard(null)}
            onSave={handleCardSaved}
            existingTags={existingTags}
          />
        )}
      </div>
    </div>
  );
};
