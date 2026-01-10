import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { StarRating } from '../ui/StarRating';
import { useToast } from '../ui/Toast';
import { createReview, updateReview, type Review } from '../../api/reviews';

interface ReviewModalProps {
  deckId: string;
  deckTitle: string;
  existingReview?: Review;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  deckId,
  deckTitle,
  existingReview,
  onClose,
  onSuccess,
}) => {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    // Prevent background scrolling
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error('Rating obligatoriu', 'Te rog selectează un rating de la 1 la 5 stele');
      return;
    }

    if (comment.length > 1000) {
      toast.error('Comentariu prea lung', 'Comentariul nu poate depăși 1000 de caractere');
      return;
    }

    setIsSubmitting(true);

    try {
      if (existingReview) {
        // Update existing review
        const response = await updateReview(existingReview.id, { rating, comment });
        if (response.success) {
          toast.success('Recenzie actualizată!', 'Recenzia ta a fost actualizată cu succes');
          onSuccess?.();
          onClose();
        } else {
          toast.error('Eroare', response.error?.message || 'Nu s-a putut actualiza recenzia');
        }
      } else {
        // Create new review
        const response = await createReview({ deckId, rating, comment });
        if (response.success) {
          toast.success('Recenzie trimisă!', 'Mulțumim pentru feedback-ul tău!');
          onSuccess?.();
          onClose();
        } else {
          toast.error('Eroare', response.error?.message || 'Nu s-a putut crea recenzia');
        }
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Eroare', 'A apărut o eroare la trimiterea recenziei');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {existingReview ? 'Editează recenzia' : 'Lasă o recenzie'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">{deckTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Rating <span className="text-red-500">*</span>
            </label>
            <div className="flex justify-center">
              <StarRating rating={rating} onRatingChange={setRating} size={32} />
            </div>
            {rating > 0 && (
              <p className="text-center text-sm text-gray-500 mt-2">
                {rating === 1 && 'Foarte slab'}
                {rating === 2 && 'Slab'}
                {rating === 3 && 'Acceptabil'}
                {rating === 4 && 'Bun'}
                {rating === 5 && 'Excelent'}
              </p>
            )}
          </div>

          {/* Comment */}
          <div>
            <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
              Comentariu (opțional)
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="Împărtășește-ne părerea ta despre acest deck..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-gray-500">Maxim 1000 de caractere</p>
              <p className="text-xs text-gray-500">{comment.length}/1000</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Anulează
            </button>
            <button
              type="submit"
              disabled={isSubmitting || rating === 0}
              className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? 'Se trimite...'
                : existingReview
                  ? 'Actualizează'
                  : 'Trimite recenzia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
