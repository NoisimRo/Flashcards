-- ============================================
-- MIGRATION 001: REFACTOR STUDY SESSIONS
-- Separates Deck Library from Study Sessions
-- ============================================

BEGIN;

-- ============================================
-- STEP 1: Drop old study_sessions table
-- ============================================
DROP TABLE IF EXISTS study_sessions CASCADE;

-- ============================================
-- STEP 2: Create user_card_progress table
-- This moves SM-2 progress from cards to per-user tracking
-- ============================================
CREATE TABLE user_card_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,

    -- Status
    status card_status DEFAULT 'new',

    -- Spaced Repetition (SM-2 Algorithm)
    ease_factor DECIMAL(3,2) DEFAULT 2.50,
    interval INTEGER DEFAULT 0,              -- Days until next review
    repetitions INTEGER DEFAULT 0,           -- Number of successful repetitions
    next_review_date DATE,                   -- When card is due for review

    -- Statistics
    times_seen INTEGER DEFAULT 0,            -- Total times card was shown
    times_correct INTEGER DEFAULT 0,         -- Times answered correctly
    times_incorrect INTEGER DEFAULT 0,       -- Times answered incorrectly
    last_reviewed_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_user_card_progress UNIQUE(user_id, card_id)
);

CREATE INDEX idx_user_card_progress_user ON user_card_progress(user_id);
CREATE INDEX idx_user_card_progress_card ON user_card_progress(card_id);
CREATE INDEX idx_user_card_progress_status ON user_card_progress(user_id, status);
CREATE INDEX idx_user_card_progress_next_review ON user_card_progress(user_id, next_review_date) WHERE next_review_date IS NOT NULL;

-- ============================================
-- STEP 3: Create new study_sessions table
-- ============================================
CREATE TABLE study_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    deck_id UUID REFERENCES decks(id) ON DELETE SET NULL,  -- Nullable in case deck is deleted

    -- Session Configuration
    title VARCHAR(200),                      -- Session name (e.g., "Random 20 cards")
    selection_method VARCHAR(20) NOT NULL,   -- 'random', 'smart', 'manual', 'all'
    total_cards INTEGER NOT NULL,            -- Number of cards in session
    selected_card_ids UUID[] NOT NULL,       -- Array of card IDs selected for this session

    -- Progress Tracking
    current_card_index INTEGER DEFAULT 0,    -- Current position in session
    answers JSONB DEFAULT '{}'::jsonb,       -- { "card-id": "correct" | "incorrect" | "skipped" }
    streak INTEGER DEFAULT 0,                -- Current correct answer streak
    session_xp INTEGER DEFAULT 0,            -- XP earned in this session

    -- Session Status
    status VARCHAR(20) DEFAULT 'active',     -- 'active', 'completed', 'abandoned'
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration_seconds INTEGER,                -- Total time spent (calculated on complete)

    -- Final Results (populated when status = 'completed')
    score INTEGER,                           -- Final score percentage (0-100)
    correct_count INTEGER DEFAULT 0,
    incorrect_count INTEGER DEFAULT 0,
    skipped_count INTEGER DEFAULT 0,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_study_sessions_user_status ON study_sessions(user_id, status);
CREATE INDEX idx_study_sessions_deck ON study_sessions(deck_id);
CREATE INDEX idx_study_sessions_active ON study_sessions(user_id, status) WHERE status = 'active';
CREATE INDEX idx_study_sessions_last_activity ON study_sessions(user_id, last_activity_at DESC);

-- ============================================
-- STEP 4: Remove SM-2 fields from cards table
-- These are now in user_card_progress
-- ============================================
ALTER TABLE cards DROP COLUMN IF EXISTS status;
ALTER TABLE cards DROP COLUMN IF EXISTS ease_factor;
ALTER TABLE cards DROP COLUMN IF EXISTS interval;
ALTER TABLE cards DROP COLUMN IF EXISTS repetitions;
ALTER TABLE cards DROP COLUMN IF EXISTS next_review_date;

-- Drop old indexes that referenced these columns
DROP INDEX IF EXISTS idx_cards_status;
DROP INDEX IF EXISTS idx_cards_next_review;

-- ============================================
-- STEP 5: Update deck statistics
-- Remove mastered_cards since it's now per-user
-- ============================================
ALTER TABLE decks DROP COLUMN IF EXISTS mastered_cards;

-- ============================================
-- STEP 6: Update triggers
-- ============================================

-- Drop old trigger that used cards.status
DROP TRIGGER IF EXISTS update_deck_counts_on_card_change ON cards;

-- Create new simpler trigger for total_cards only
CREATE OR REPLACE FUNCTION update_deck_total_cards()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE decks SET
            total_cards = (SELECT COUNT(*) FROM cards WHERE deck_id = NEW.deck_id AND deleted_at IS NULL)
        WHERE id = NEW.deck_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE decks SET
            total_cards = (SELECT COUNT(*) FROM cards WHERE deck_id = OLD.deck_id AND deleted_at IS NULL)
        WHERE id = OLD.deck_id;
        RETURN OLD;
    END IF;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_deck_total_cards_trigger
    AFTER INSERT OR UPDATE OR DELETE ON cards
    FOR EACH ROW
    EXECUTE FUNCTION update_deck_total_cards();

-- Add trigger for user_card_progress updated_at
CREATE TRIGGER update_user_card_progress_updated_at
    BEFORE UPDATE ON user_card_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add trigger for study_sessions updated_at
CREATE TRIGGER update_study_sessions_updated_at
    BEFORE UPDATE ON study_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 7: Clean slate - reset all data
-- ============================================

-- Note: Since we have clean slate approval, we're not migrating old data
-- Just ensure referential integrity is maintained

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these after migration to verify:
--
-- \d user_card_progress
-- \d study_sessions
-- \d cards
-- \d decks
--
-- SELECT COUNT(*) FROM user_card_progress;
-- SELECT COUNT(*) FROM study_sessions;
