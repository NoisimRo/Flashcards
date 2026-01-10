-- ============================================
-- FLASHCARDS DATABASE SCHEMA
-- PostgreSQL
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
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

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

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);

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
    mastered_cards INTEGER DEFAULT 0,

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
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_decks_owner ON decks(owner_id);
CREATE INDEX idx_decks_subject ON decks(subject_id);
CREATE INDEX idx_decks_public ON decks(is_public) WHERE is_public = true;
CREATE INDEX idx_decks_search ON decks USING gin(to_tsvector('romanian', title || ' ' || COALESCE(description, '')));

-- ============================================
-- DECK SHARES TABLE (for sharing decks)
-- ============================================

CREATE TABLE deck_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    can_edit BOOLEAN DEFAULT false,
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_share UNIQUE(deck_id, user_id)
);

CREATE INDEX idx_deck_shares_deck ON deck_shares(deck_id);
CREATE INDEX idx_deck_shares_user ON deck_shares(user_id);

-- ============================================
-- CARDS TABLE
-- ============================================

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
    options TEXT[],  -- For quiz type
    correct_option_index INTEGER,

    -- Status
    status card_status DEFAULT 'new',

    -- Spaced repetition (SM-2)
    ease_factor DECIMAL(3,2) DEFAULT 2.50,
    interval INTEGER DEFAULT 0,  -- Days
    repetitions INTEGER DEFAULT 0,
    next_review_date DATE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),

    -- Order within deck
    position INTEGER DEFAULT 0,

    -- Soft delete
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_cards_deck ON cards(deck_id);
CREATE INDEX idx_cards_status ON cards(status);
CREATE INDEX idx_cards_next_review ON cards(next_review_date);
CREATE INDEX idx_cards_search ON cards USING gin(to_tsvector('romanian', front || ' ' || back));

-- ============================================
-- STUDY SESSIONS TABLE
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

CREATE INDEX idx_daily_progress_user_date ON daily_progress(user_id, date DESC);

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

CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);

-- ============================================
-- SYNC QUEUE TABLE (for offline sync)
-- ============================================

CREATE TABLE sync_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    operation VARCHAR(20) NOT NULL,  -- create, update, delete
    entity_type VARCHAR(50) NOT NULL,  -- deck, card, session
    entity_id UUID NOT NULL,
    data JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    error TEXT
);

CREATE INDEX idx_sync_queue_user ON sync_queue(user_id);
CREATE INDEX idx_sync_queue_pending ON sync_queue(user_id, processed_at) WHERE processed_at IS NULL;

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update updated_at timestamp
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

-- Update deck card counts
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

-- ============================================
-- VIEWS
-- ============================================

-- Leaderboard view
CREATE VIEW leaderboard AS
SELECT
    u.id as user_id,
    u.name,
    u.avatar,
    u.level,
    u.total_xp,
    u.streak,
    ROW_NUMBER() OVER (ORDER BY u.total_xp DESC) as position
FROM users u
WHERE u.deleted_at IS NULL
ORDER BY u.total_xp DESC;

-- User stats view
CREATE VIEW user_stats AS
SELECT
    u.id as user_id,
    u.name,
    u.level,
    u.total_xp,
    u.streak,
    u.total_cards_learned,
    u.total_decks_completed,
    u.total_time_spent,
    (SELECT COUNT(*) FROM decks d WHERE d.owner_id = u.id AND d.deleted_at IS NULL) as decks_owned,
    (SELECT COUNT(*) FROM user_achievements ua WHERE ua.user_id = u.id) as achievements_unlocked
FROM users u
WHERE u.deleted_at IS NULL;

-- ============================================
-- PERMISSIONS (pentru Cloud SQL user)
-- ============================================
-- Rulează aceste comenzi după ce ai creat userul flashcards_user

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO flashcards_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO flashcards_user;
GRANT USAGE ON SCHEMA public TO flashcards_user;

-- Pentru tabele create în viitor
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO flashcards_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO flashcards_user;
