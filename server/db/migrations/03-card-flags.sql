-- ============================================
-- MIGRATION 3: Card Flagging System
-- ============================================
-- Purpose: Allow users to flag individual cards for review with optional comments
-- Date: 2026-01-09

-- Create flag_status enum
DO $$ BEGIN
    CREATE TYPE flag_status AS ENUM ('pending', 'under_review', 'resolved', 'dismissed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create card_flags table
CREATE TABLE IF NOT EXISTS card_flags (
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

-- Create indexes for performance
CREATE INDEX idx_card_flags_card ON card_flags(card_id);
CREATE INDEX idx_card_flags_deck ON card_flags(deck_id);
CREATE INDEX idx_card_flags_user ON card_flags(flagged_by_user_id);
CREATE INDEX idx_card_flags_status ON card_flags(status);
CREATE INDEX idx_card_flags_reviewer ON card_flags(reviewed_by_user_id) WHERE reviewed_by_user_id IS NOT NULL;
CREATE INDEX idx_card_flags_pending ON card_flags(created_at DESC) WHERE status = 'pending';

-- Create trigger to update updated_at
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

-- Add flag count to cards table
ALTER TABLE cards
ADD COLUMN IF NOT EXISTS flag_count INTEGER DEFAULT 0;

-- Create function to update card flag count
CREATE OR REPLACE FUNCTION update_card_flag_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the card's flag count (only pending flags)
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

-- Create trigger to auto-update card flag count
CREATE TRIGGER update_card_flag_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON card_flags
    FOR EACH ROW
    EXECUTE FUNCTION update_card_flag_count();

-- Verification query
SELECT 'Card flags table created successfully' as status;
