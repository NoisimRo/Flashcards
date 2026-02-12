-- Migration: Add guest deck support
-- Mirrors the guest session pattern (study_sessions has guest_token + is_guest)
-- Guest decks are migrated to the user's account on registration/login

-- Make owner_id nullable for guest decks
ALTER TABLE decks ALTER COLUMN owner_id DROP NOT NULL;

-- Add guest tracking columns
ALTER TABLE decks ADD COLUMN IF NOT EXISTS guest_token VARCHAR(255);
ALTER TABLE decks ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT false;

-- Index for fast guest token lookups
CREATE INDEX IF NOT EXISTS idx_decks_guest_token ON decks(guest_token) WHERE guest_token IS NOT NULL;

-- Constraint: either owner_id or guest_token must be present
ALTER TABLE decks ADD CONSTRAINT check_deck_identity
  CHECK (owner_id IS NOT NULL OR guest_token IS NOT NULL);
