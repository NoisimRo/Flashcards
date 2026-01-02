-- ============================================
-- ROLLBACK 001: REFACTOR STUDY SESSIONS
-- Reverts changes from 001_refactor_sessions.sql
-- ============================================

BEGIN;

-- ============================================
-- STEP 1: Drop new tables
-- ============================================
DROP TABLE IF EXISTS user_card_progress CASCADE;
DROP TABLE IF EXISTS study_sessions CASCADE;

-- ============================================
-- STEP 2: Restore SM-2 fields to cards table
-- ============================================
ALTER TABLE cards ADD COLUMN status card_status DEFAULT 'new';
ALTER TABLE cards ADD COLUMN ease_factor DECIMAL(3,2) DEFAULT 2.50;
ALTER TABLE cards ADD COLUMN interval INTEGER DEFAULT 0;
ALTER TABLE cards ADD COLUMN repetitions INTEGER DEFAULT 0;
ALTER TABLE cards ADD COLUMN next_review_date DATE;

-- Restore indexes
CREATE INDEX idx_cards_status ON cards(status);
CREATE INDEX idx_cards_next_review ON cards(next_review_date);

-- ============================================
-- STEP 3: Restore mastered_cards to decks
-- ============================================
ALTER TABLE decks ADD COLUMN mastered_cards INTEGER DEFAULT 0;

-- ============================================
-- STEP 4: Restore old study_sessions table
-- ============================================
CREATE TABLE study_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Progress
    current_index INTEGER DEFAULT 0,
    shuffled_order UUID[] DEFAULT '{}',
    answers JSONB DEFAULT '{}'::jsonb,

    -- Stats
    correct_count INTEGER DEFAULT 0,
    incorrect_count INTEGER DEFAULT 0,
    skipped_count INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0,
    max_streak INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,

    -- Time
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    finished_at TIMESTAMP WITH TIME ZONE,
    total_time_seconds INTEGER DEFAULT 0,

    -- State
    is_completed BOOLEAN DEFAULT false,
    is_paused BOOLEAN DEFAULT false
);

CREATE INDEX idx_sessions_user ON study_sessions(user_id);
CREATE INDEX idx_sessions_deck ON study_sessions(deck_id);
CREATE INDEX idx_sessions_active ON study_sessions(user_id, is_completed) WHERE is_completed = false;

-- ============================================
-- STEP 5: Restore old triggers
-- ============================================

-- Drop new trigger
DROP TRIGGER IF EXISTS update_deck_total_cards_trigger ON cards;
DROP FUNCTION IF EXISTS update_deck_total_cards();

-- Restore old trigger
CREATE OR REPLACE FUNCTION update_deck_card_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE decks SET
            total_cards = (SELECT COUNT(*) FROM cards WHERE deck_id = NEW.deck_id AND deleted_at IS NULL),
            mastered_cards = (SELECT COUNT(*) FROM cards WHERE deck_id = NEW.deck_id AND status = 'mastered' AND deleted_at IS NULL)
        WHERE id = NEW.deck_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE decks SET
            total_cards = (SELECT COUNT(*) FROM cards WHERE deck_id = OLD.deck_id AND deleted_at IS NULL),
            mastered_cards = (SELECT COUNT(*) FROM cards WHERE deck_id = OLD.deck_id AND status = 'mastered' AND deleted_at IS NULL)
        WHERE id = OLD.deck_id;
        RETURN OLD;
    END IF;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_deck_counts_on_card_change
    AFTER INSERT OR UPDATE OR DELETE ON cards
    FOR EACH ROW
    EXECUTE FUNCTION update_deck_card_counts();

COMMIT;
