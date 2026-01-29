-- ============================================
-- FLASHCARDS DATABASE SCHEMA
-- PostgreSQL
-- ============================================
-- This file represents the ACTUAL production database structure.
-- Last verified against production: 2029-01-29 (server/db/2029_01_29_DB.md)
--
-- Applied migrations:
--   - 001_refactor_sessions.sql (session refactor + user_card_progress)
--   - 002_daily_challenges.sql (daily challenges system)
--   - 01-make-decks-public.sql (decks public by default)
--   - 02-deck-reviews.sql (deck review/rating system)
--   - 03-card-flags.sql (card flagging system)
--   - 04-deck-flags.sql (deck flagging system)
--   - Manual: guest session support (guest_token, is_guest on study_sessions)
--   - Manual: answer tracking (total_correct_answers, total_answers on users)
--
-- IMPORTANT: Keep this file in sync with the actual database.
-- When adding migrations, update this file to reflect the final state.
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'student');
CREATE TYPE difficulty_level AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');
CREATE TYPE card_type AS ENUM ('standard', 'quiz', 'type-answer');
CREATE TYPE card_status AS ENUM ('new', 'learning', 'reviewing', 'mastered');
CREATE TYPE sync_status AS ENUM ('synced', 'pending', 'conflict', 'error');
CREATE TYPE flag_status AS ENUM ('pending', 'under_review', 'resolved', 'dismissed');

-- ============================================
-- USERS TABLE
-- ============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    avatar VARCHAR(500),
    role user_role DEFAULT 'student',

    -- Gamification
    level INTEGER DEFAULT 1,
    current_xp INTEGER DEFAULT 0,
    next_level_xp INTEGER DEFAULT 100,
    total_xp INTEGER DEFAULT 0,

    -- Stats
    streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_active_date DATE,
    total_time_spent INTEGER DEFAULT 0,  -- Minutes
    total_cards_learned INTEGER DEFAULT 0,
    total_decks_completed INTEGER DEFAULT 0,

    -- Answer tracking
    total_correct_answers INTEGER DEFAULT 0,
    total_answers INTEGER DEFAULT 0,

    -- Preferences (JSON)
    preferences JSONB DEFAULT '{
        "dailyGoal": 20,
        "soundEnabled": true,
        "animationsEnabled": true,
        "theme": "light",
        "language": "ro"
    }'::jsonb,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,

    -- Soft delete
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT check_answers_positive CHECK (total_correct_answers >= 0 AND total_answers >= 0),
    CONSTRAINT check_correct_not_exceed_total CHECK (total_correct_answers <= total_answers)
);

CREATE INDEX idx_users_email ON users(email);

-- ============================================
-- REFRESH TOKENS TABLE
-- ============================================

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT unique_token UNIQUE(token_hash)
);

-- ============================================
-- SUBJECTS TABLE
-- ============================================

CREATE TABLE subjects (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(20) NOT NULL,
    icon VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default subjects
INSERT INTO subjects (id, name, color, icon) VALUES
    ('romana', 'Limba Română', '#1f2937', 'book-open'),
    ('matematica', 'Matematică', '#3b82f6', 'calculator'),
    ('istorie', 'Istorie', '#f97316', 'landmark'),
    ('geografie', 'Geografie', '#22c55e', 'globe'),
    ('engleza', 'Engleză', '#8b5cf6', 'languages'),
    ('biologie', 'Biologie', '#10b981', 'leaf'),
    ('fizica', 'Fizică', '#6366f1', 'atom'),
    ('chimie', 'Chimie', '#ec4899', 'flask-conical');

-- ============================================
-- DECKS TABLE
-- ============================================

CREATE TABLE decks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    subject_id VARCHAR(50) REFERENCES subjects(id),
    topic VARCHAR(200),
    difficulty difficulty_level DEFAULT 'A2',
    cover_image VARCHAR(500),
    is_public BOOLEAN DEFAULT true,
    tags TEXT[] DEFAULT '{}',

    -- Stats (denormalized for performance)
    total_cards INTEGER DEFAULT 0,

    -- Ownership
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_studied TIMESTAMP WITH TIME ZONE,

    -- Sync
    sync_status sync_status DEFAULT 'synced',
    version INTEGER DEFAULT 1,

    -- Soft delete
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Review/Rating stats (managed by triggers on deck_reviews)
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    review_count INTEGER DEFAULT 0,

    -- Flag count (managed by trigger on deck_flags)
    flag_count INTEGER DEFAULT 0
);

CREATE INDEX idx_decks_owner ON decks(owner_id);

-- ============================================
-- DECK REVIEWS TABLE
-- ============================================

CREATE TABLE deck_reviews (
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

CREATE INDEX idx_deck_reviews_deck ON deck_reviews(deck_id);
CREATE INDEX idx_deck_reviews_user ON deck_reviews(user_id);
CREATE INDEX idx_deck_reviews_rating ON deck_reviews(rating);
CREATE INDEX idx_deck_reviews_created ON deck_reviews(created_at DESC);

-- ============================================
-- CARDS TABLE
-- ============================================
-- Note: SM-2 fields (status, ease_factor, interval, repetitions, next_review_date)
-- were moved to user_card_progress table in migration 001.

CREATE TABLE cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,

    -- Content
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    context TEXT,
    hint TEXT,

    -- Type
    type card_type DEFAULT 'standard',
    options TEXT[],  -- For quiz and multiple-answer types
    correct_option_indices INTEGER[],  -- Correct answer indices

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),

    -- Order within deck
    position INTEGER DEFAULT 0,

    -- Soft delete
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Flag count (managed by trigger on card_flags)
    flag_count INTEGER DEFAULT 0
);

CREATE INDEX idx_cards_deck ON cards(deck_id);

-- ============================================
-- CARD FLAGS TABLE
-- ============================================

CREATE TABLE card_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    flagged_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Flag details
    comment TEXT,
    status flag_status DEFAULT 'pending',

    -- Review tracking (for teachers)
    reviewed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_card_flags_card ON card_flags(card_id);
CREATE INDEX idx_card_flags_deck ON card_flags(deck_id);
CREATE INDEX idx_card_flags_user ON card_flags(flagged_by_user_id);
CREATE INDEX idx_card_flags_status ON card_flags(status);
CREATE INDEX idx_card_flags_reviewer ON card_flags(reviewed_by_user_id) WHERE reviewed_by_user_id IS NOT NULL;
CREATE INDEX idx_card_flags_pending ON card_flags(created_at DESC) WHERE status = 'pending';

-- ============================================
-- DECK FLAGS TABLE
-- ============================================

CREATE TABLE deck_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    flagged_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Flag details
    reason VARCHAR(100),  -- e.g., 'inappropriate', 'incorrect_information', 'duplicate', 'other'
    comment TEXT,
    status flag_status DEFAULT 'pending',

    -- Review tracking (for teachers/admins)
    reviewed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_deck_flags_deck ON deck_flags(deck_id);
CREATE INDEX idx_deck_flags_user ON deck_flags(flagged_by_user_id);
CREATE INDEX idx_deck_flags_status ON deck_flags(status);
CREATE INDEX idx_deck_flags_reason ON deck_flags(reason);
CREATE INDEX idx_deck_flags_reviewer ON deck_flags(reviewed_by_user_id) WHERE reviewed_by_user_id IS NOT NULL;
CREATE INDEX idx_deck_flags_pending ON deck_flags(created_at DESC) WHERE status = 'pending';

-- ============================================
-- USER CARD PROGRESS TABLE
-- ============================================
-- Per-user spaced repetition progress for each card.
-- SM-2 algorithm data moved here from cards table.

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
-- STUDY SESSIONS TABLE
-- ============================================
-- Refactored in migration 001. Sessions track individual study attempts
-- with card selection, progress tracking, and final results.
-- Guest session support added manually (guest_token, is_guest).

CREATE TABLE study_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,  -- Nullable for guest sessions
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Guest session support
    guest_token VARCHAR(255),                -- Token for unauthenticated sessions
    is_guest BOOLEAN DEFAULT false,          -- Whether this is a guest session

    -- Either user_id or guest_token must be present
    CONSTRAINT check_session_identity CHECK (user_id IS NOT NULL OR guest_token IS NOT NULL)
);

CREATE INDEX idx_study_sessions_user_status ON study_sessions(user_id, status);
CREATE INDEX idx_study_sessions_deck ON study_sessions(deck_id);
CREATE INDEX idx_study_sessions_active ON study_sessions(user_id, status) WHERE status = 'active';
CREATE INDEX idx_study_sessions_last_activity ON study_sessions(user_id, last_activity_at DESC);
CREATE INDEX idx_study_sessions_guest_token ON study_sessions(guest_token);

-- ============================================
-- DAILY PROGRESS TABLE
-- ============================================

CREATE TABLE daily_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,

    cards_studied INTEGER DEFAULT 0,
    cards_learned INTEGER DEFAULT 0,
    time_spent_minutes INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    sessions_completed INTEGER DEFAULT 0,

    CONSTRAINT unique_daily_progress UNIQUE(user_id, date)
);

-- ============================================
-- DAILY CHALLENGES TABLE
-- ============================================

CREATE TABLE daily_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,

    -- Challenge progress (tracked throughout the day)
    cards_learned_today INTEGER DEFAULT 0,
    time_studied_today INTEGER DEFAULT 0,  -- Minutes
    streak_maintained BOOLEAN DEFAULT false,

    -- Challenge targets (can vary per user based on level)
    cards_target INTEGER DEFAULT 30,
    time_target INTEGER DEFAULT 20,  -- Minutes

    -- Rewards
    cards_challenge_completed BOOLEAN DEFAULT false,
    time_challenge_completed BOOLEAN DEFAULT false,
    streak_challenge_completed BOOLEAN DEFAULT false,

    cards_reward_claimed BOOLEAN DEFAULT false,
    time_reward_claimed BOOLEAN DEFAULT false,
    streak_reward_claimed BOOLEAN DEFAULT false,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_user_daily_challenge UNIQUE(user_id, date)
);

CREATE INDEX idx_daily_challenges_user_date ON daily_challenges(user_id, date DESC);

-- ============================================
-- ACHIEVEMENTS TABLE
-- ============================================

CREATE TABLE achievements (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(50) NOT NULL,
    color VARCHAR(100) NOT NULL,
    xp_reward INTEGER DEFAULT 0,
    condition_type VARCHAR(50) NOT NULL,
    condition_value INTEGER NOT NULL,
    tier VARCHAR(20) DEFAULT 'bronze',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default achievements
INSERT INTO achievements (id, title, description, icon, color, xp_reward, condition_type, condition_value, tier) VALUES
    ('a1', 'Primul Pas', 'Completat primul deck', 'target', 'bg-yellow-100 text-yellow-600', 50, 'decks_completed', 1, 'bronze'),
    ('a2', 'Stea Strălucitoare', '5 zile consecutive', 'star', 'bg-blue-100 text-blue-600', 100, 'streak_days', 5, 'bronze'),
    ('a3', 'Rapid ca Fulgerul', '10 carduri în 1 minut', 'zap', 'bg-purple-100 text-purple-600', 75, 'cards_per_minute', 10, 'silver'),
    ('a4', 'Bibliotecar', 'Creat 3 deck-uri', 'library', 'bg-green-100 text-green-600', 60, 'decks_created', 3, 'bronze'),
    ('a5', 'Flacără Vie', 'Streak de 7 zile', 'flame', 'bg-orange-100 text-orange-600', 150, 'streak_days', 7, 'silver'),
    ('a6', 'Diamant', '100 carduri memorate', 'diamond', 'bg-indigo-100 text-indigo-600', 200, 'cards_mastered', 100, 'gold'),
    ('a7', 'Maestru', 'Nivel 10 atins', 'crown', 'bg-amber-100 text-amber-600', 500, 'level_reached', 10, 'gold'),
    ('a8', 'Dedicat', '30 zile consecutive', 'calendar', 'bg-red-100 text-red-600', 1000, 'streak_days', 30, 'platinum');

-- ============================================
-- USER ACHIEVEMENTS TABLE
-- ============================================

CREATE TABLE user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id VARCHAR(50) NOT NULL REFERENCES achievements(id),
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    xp_awarded INTEGER DEFAULT 0,

    CONSTRAINT unique_user_achievement UNIQUE(user_id, achievement_id)
);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update updated_at timestamp (shared by multiple tables)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_decks_updated_at
    BEFORE UPDATE ON decks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cards_updated_at
    BEFORE UPDATE ON cards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_card_progress_updated_at
    BEFORE UPDATE ON user_card_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_study_sessions_updated_at
    BEFORE UPDATE ON study_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update deck total_cards count
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

-- Update deck rating stats (triggered by deck_reviews changes)
CREATE OR REPLACE FUNCTION update_deck_rating_stats()
RETURNS TRIGGER AS $$
BEGIN
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

CREATE TRIGGER update_deck_stats_on_review_change
    AFTER INSERT OR UPDATE OR DELETE ON deck_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_deck_rating_stats();

-- Update deck_reviews updated_at
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

-- Update card flag count (triggered by card_flags changes)
CREATE OR REPLACE FUNCTION update_card_flag_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE cards
    SET flag_count = (
        SELECT COUNT(*)
        FROM card_flags
        WHERE card_id = COALESCE(NEW.card_id, OLD.card_id)
          AND status = 'pending'
    )
    WHERE id = COALESCE(NEW.card_id, OLD.card_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_card_flag_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON card_flags
    FOR EACH ROW
    EXECUTE FUNCTION update_card_flag_count();

-- Update card_flags updated_at
CREATE OR REPLACE FUNCTION update_card_flags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER card_flags_updated_at
    BEFORE UPDATE ON card_flags
    FOR EACH ROW
    EXECUTE FUNCTION update_card_flags_updated_at();

-- Update deck flag count (triggered by deck_flags changes)
CREATE OR REPLACE FUNCTION update_deck_flag_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE decks
    SET flag_count = (
        SELECT COUNT(*)
        FROM deck_flags
        WHERE deck_id = COALESCE(NEW.deck_id, OLD.deck_id)
          AND status = 'pending'
    )
    WHERE id = COALESCE(NEW.deck_id, OLD.deck_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_deck_flag_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON deck_flags
    FOR EACH ROW
    EXECUTE FUNCTION update_deck_flag_count();

-- Update deck_flags updated_at
CREATE OR REPLACE FUNCTION update_deck_flags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deck_flags_updated_at
    BEFORE UPDATE ON deck_flags
    FOR EACH ROW
    EXECUTE FUNCTION update_deck_flags_updated_at();
