-- ============================================
-- MIGRATION 4: Deck Flagging System
-- ============================================
-- Purpose: Allow users to flag entire decks for review with optional comments
-- Date: 2026-01-09

-- Note: flag_status enum already created in 03-card-flags.sql

-- Create deck_flags table
CREATE TABLE IF NOT EXISTS deck_flags (
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

-- Create indexes for performance
CREATE INDEX idx_deck_flags_deck ON deck_flags(deck_id);
CREATE INDEX idx_deck_flags_user ON deck_flags(flagged_by_user_id);
CREATE INDEX idx_deck_flags_status ON deck_flags(status);
CREATE INDEX idx_deck_flags_reason ON deck_flags(reason);
CREATE INDEX idx_deck_flags_reviewer ON deck_flags(reviewed_by_user_id) WHERE reviewed_by_user_id IS NOT NULL;
CREATE INDEX idx_deck_flags_pending ON deck_flags(created_at DESC) WHERE status = 'pending';

-- Create trigger to update updated_at
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

-- Add flag count to decks table
ALTER TABLE decks
ADD COLUMN IF NOT EXISTS flag_count INTEGER DEFAULT 0;

-- Create function to update deck flag count
CREATE OR REPLACE FUNCTION update_deck_flag_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the deck's flag count (only pending flags)
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

-- Create trigger to auto-update deck flag count
CREATE TRIGGER update_deck_flag_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON deck_flags
    FOR EACH ROW
    EXECUTE FUNCTION update_deck_flag_count();

-- Verification query
SELECT 'Deck flags table created successfully' as status;
