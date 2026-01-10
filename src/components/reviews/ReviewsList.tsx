import React, { useState, useEffect } from 'react';
import { Trash2, User } from 'lucide-react';
import { StarRating } from '../ui/StarRating';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { getReviews, deleteReview, type Review } from '../../api/reviews';
import { formatDistanceToNow } from 'date-fns';
import { ro } from 'date-fns/locale';

interface ReviewsListProps {
  deckId: string;
  onReviewDeleted?: () => void;
}

export const ReviewsList: React.FC<ReviewsListProps> = ({
  deckId,
  onReviewDeleted,
}) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const toast = useToast();
  const { user, hasPermission } = useAuth();

  useEffect(() => {
    loadReviews();
  }, [deckId, page]);

  const loadReviews = async () => {
    setIsLoading(true);
    try {
      const response = await getReviews(deckId, page, 10);
      if (response.success && response.data) {
        setReviews(response.data);
        setTotalPages(response.meta?.totalPages || 1);
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
      toast.error('Eroare', 'Nu s-au putut încărca recenziile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm('Ești sigur că vrei să ștergi această recenzie?')) {
      return;
    }

    setDeletingId(reviewId);
    try {
      const response = await deleteReview(reviewId);
      if (response.success) {
        toast.success('Recenzie ștearsă', 'Recenzia a fost ștearsă cu succes');
        setReviews(reviews.filter((r) => r.id !== reviewId));
        onReviewDeleted?.();
      } else {
        toast.error('Eroare', response.error?.message || 'Nu s-a putut șterge recenzia');
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error('Eroare', 'A apărut o eroare la ștergerea recenziei');
    } finally {
      setDeletingId(null);
    }
  };

  const canDeleteReview = (review: Review) => {
    return (
      review.userId === user?.id || hasPermission('reviews:delete_any')
    );
  };

  if (isLoading && page === 1) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-gray-100 rounded-xl p-4 animate-pulse"
          >
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">Nu există recenzii încă</p>
        <p className="text-gray-400 text-sm mt-2">Fii primul care lasă o recenzie!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div
          key={review.id}
          className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              {review.userAvatar ? (
                <img
                  src={review.userAvatar}
                  alt={review.userName || 'User'}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <User size={20} className="text-indigo-600" />
                </div>
              )}
              <div>
                <p className="font-medium text-gray-900">
                  {review.userName || 'Utilizator'}
                </p>
                <p className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(review.createdAt), {
                    addSuffix: true,
                    locale: ro,
                  })}
                </p>
              </div>
            </div>

            {/* Delete button */}
            {canDeleteReview(review) && (
              <button
                onClick={() => handleDelete(review.id)}
                disabled={deletingId === review.id}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                title="Șterge recenzia"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>

          {/* Rating */}
          <div className="mb-2">
            <StarRating rating={review.rating} readonly size={16} />
          </div>

          {/* Comment */}
          {review.comment && (
            <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
              {review.comment}
            </p>
          )}
        </div>
      ))}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          <span className="px-4 py-2 text-sm text-gray-600">
            Pagina {page} din {totalPages}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Următoarea
          </button>
        </div>
      )}
    </div>
  );
};
