-- ============================================
-- MIGRATION 002: DAILY CHALLENGES SYSTEM
-- Tracks user progress on daily challenges
-- ============================================

BEGIN;

-- ============================================
-- STEP 1: Create daily_challenges table
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
CREATE INDEX idx_daily_challenges_today ON daily_challenges(user_id, date) WHERE date = CURRENT_DATE;

-- ============================================
-- STEP 2: Add trigger for updated_at
-- ============================================
CREATE TRIGGER update_daily_challenges_updated_at
    BEFORE UPDATE ON daily_challenges
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these after migration to verify:
--
-- \d daily_challenges
-- SELECT * FROM daily_challenges WHERE date = CURRENT_DATE LIMIT 5;
