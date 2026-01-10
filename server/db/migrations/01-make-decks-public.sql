-- ============================================
-- MIGRATION 1: Make All Decks Public
-- ============================================
-- Purpose: Update existing decks to be public and change default
-- Date: 2026-01-09

-- Step 1: Update all existing decks to public
UPDATE decks
SET is_public = true, updated_at = NOW()
WHERE deleted_at IS NULL AND is_public = false;

-- Step 2: Change default for new decks
ALTER TABLE decks
ALTER COLUMN is_public SET DEFAULT true;

-- Verification query
SELECT
  COUNT(*) as total_decks,
  SUM(CASE WHEN is_public THEN 1 ELSE 0 END) as public_decks,
  SUM(CASE WHEN NOT is_public THEN 1 ELSE 0 END) as private_decks
FROM decks
WHERE deleted_at IS NULL;
