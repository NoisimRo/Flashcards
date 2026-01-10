-- ============================================
-- MIGRATION 2: Deck Reviews System
-- ============================================
-- Purpose: Allow users to review and rate decks created by others
-- Date: 2026-01-09

-- Create deck_reviews table
CREATE TABLE IF NOT EXISTS deck_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Review content
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Prevent duplicate reviews from same user
    CONSTRAINT unique_user_deck_review UNIQUE (deck_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_deck_reviews_deck ON deck_reviews(deck_id);
CREATE INDEX idx_deck_reviews_user ON deck_reviews(user_id);
CREATE INDEX idx_deck_reviews_rating ON deck_reviews(rating);
CREATE INDEX idx_deck_reviews_created ON deck_reviews(created_at DESC);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_deck_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deck_reviews_updated_at
    BEFORE UPDATE ON deck_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_deck_reviews_updated_at();

-- Add columns to decks table for aggregated stats
ALTER TABLE decks
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- Create function to update deck rating stats
CREATE OR REPLACE FUNCTION update_deck_rating_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the deck's average rating and review count
    UPDATE decks
    SET
        average_rating = (
            SELECT COALESCE(AVG(rating), 0)
            FROM deck_reviews
            WHERE deck_id = COALESCE(NEW.deck_id, OLD.deck_id)
        ),
        review_count = (
            SELECT COUNT(*)
            FROM deck_reviews
            WHERE deck_id = COALESCE(NEW.deck_id, OLD.deck_id)
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.deck_id, OLD.deck_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update deck stats on review changes
CREATE TRIGGER update_deck_stats_on_review_change
    AFTER INSERT OR UPDATE OR DELETE ON deck_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_deck_rating_stats();

-- Verification query
SELECT 'Deck reviews table created successfully' as status;
