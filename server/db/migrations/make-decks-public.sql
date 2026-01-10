-- Migration: Make all decks public by default
-- Date: 2026-01-09
-- Purpose: Update existing decks to be public and change default for new decks

-- Step 1: Update all existing decks to be public
UPDATE decks
SET is_public = true
WHERE deleted_at IS NULL;

-- Step 2: Alter table to change default value for new decks
ALTER TABLE decks
ALTER COLUMN is_public SET DEFAULT true;

-- Verification queries (optional - for checking results)
-- SELECT COUNT(*) as total_decks,
--        SUM(CASE WHEN is_public THEN 1 ELSE 0 END) as public_decks,
--        SUM(CASE WHEN NOT is_public THEN 1 ELSE 0 END) as private_decks
-- FROM decks
-- WHERE deleted_at IS NULL;
