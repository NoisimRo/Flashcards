-- ============================================
-- MIGRATION 003: FIX GUEST SESSION SUPPORT
-- Makes user_id nullable to allow guest sessions
-- Adds CHECK constraint for data integrity
-- ============================================
-- NOTE: guest_token and is_guest columns already exist in production
-- This migration only fixes the user_id constraint issue

BEGIN;

-- ============================================
-- STEP 1: Make user_id nullable
-- ============================================
-- This is the critical fix - allows guest sessions without user accounts
ALTER TABLE study_sessions
  ALTER COLUMN user_id DROP NOT NULL;

-- ============================================
-- STEP 2: Add CHECK constraint for data integrity
-- ============================================
-- Ensures every session has either user_id OR guest_token (not both NULL)
-- Allows both to be set (for migrated guest->user sessions)
ALTER TABLE study_sessions
  ADD CONSTRAINT check_session_identity
  CHECK (user_id IS NOT NULL OR guest_token IS NOT NULL);

-- ============================================
-- STEP 3: Add documentation
-- ============================================
COMMENT ON COLUMN study_sessions.user_id IS
  'User ID (nullable). NULL for guest-only sessions, set for authenticated users or migrated guests.';

COMMENT ON CONSTRAINT check_session_identity ON study_sessions IS
  'Ensures every session has either a user_id (authenticated) or guest_token (guest). Both can be set for migrated sessions.';

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these after migration to verify:
--
-- 1. Verify user_id is now nullable:
-- SELECT column_name, is_nullable FROM information_schema.columns
-- WHERE table_name = 'study_sessions' AND column_name = 'user_id';
-- Expected: is_nullable = 'YES'
--
-- 2. Verify CHECK constraint exists:
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'study_sessions'::regclass AND conname = 'check_session_identity';
--
-- 3. Test guest session creation (should succeed):
-- INSERT INTO study_sessions
--   (deck_id, title, selection_method, total_cards, selected_card_ids,
--    guest_token, is_guest, status)
-- VALUES
--   (NULL, 'Test Guest', 'all', 5, ARRAY[]::uuid[],
--    'test-token-' || gen_random_uuid()::text, true, 'active')
-- RETURNING id, user_id, guest_token, is_guest;
-- Expected: Success with user_id = NULL
--
-- 4. Test constraint enforcement (should FAIL):
-- INSERT INTO study_sessions
--   (deck_id, title, selection_method, total_cards, selected_card_ids, status)
-- VALUES (NULL, 'Invalid', 'all', 5, ARRAY[]::uuid[], 'active');
-- Expected: ERROR violating check constraint "check_session_identity"
--
-- 5. Clean up test data:
-- DELETE FROM study_sessions WHERE title = 'Test Guest';
