import { api } from './client';

export interface Review {
  id: string;
  deckId: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  rating: number;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewWithDeck extends Review {
  deckTitle?: string;
  deckTopic?: string;
  subjectName?: string;
  subjectColor?: string;
}

export interface CreateReviewRequest {
  deckId: string;
  rating: number;
  comment?: string;
}

export interface UpdateReviewRequest {
  rating: number;
  comment?: string;
}

// POST /api/reviews - Create or update review
export async function createReview(data: CreateReviewRequest) {
  return api.post<Review>('/reviews', data);
}

// GET /api/reviews?deckId=... - Get reviews for a deck
export async function getReviews(deckId: string, page = 1, limit = 20) {
  return api.get<Review[]>(`/reviews?deckId=${deckId}&page=${page}&limit=${limit}`);
}

// GET /api/reviews/my - Get current user's reviews
export async function getMyReviews(page = 1, limit = 20) {
  return api.get<ReviewWithDeck[]>(`/reviews/my?page=${page}&limit=${limit}`);
}

// PUT /api/reviews/:id - Update review
export async function updateReview(id: string, data: UpdateReviewRequest) {
  return api.put<Review>(`/reviews/${id}`, data);
}

// DELETE /api/reviews/:id - Delete review
export async function deleteReview(id: string) {
  return api.delete(`/reviews/${id}`);
}
