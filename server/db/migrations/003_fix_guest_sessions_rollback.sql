-- ============================================
-- ROLLBACK 003: REVERT GUEST SESSION FIX
-- Reverts changes from 003_fix_guest_sessions.sql
-- WARNING: This will fail if guest sessions exist (safety check)
-- ============================================

BEGIN;

-- ============================================
-- STEP 1: Safety check - prevent data loss
-- ============================================
-- Check if there are any guest-only sessions (user_id IS NULL)
-- This will abort rollback if guest sessions exist
DO $$
DECLARE
  guest_session_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO guest_session_count
  FROM study_sessions
  WHERE user_id IS NULL;

  IF guest_session_count > 0 THEN
    RAISE EXCEPTION
      'Cannot rollback: % guest sessions exist without user_id. Migrate or delete them first.',
      guest_session_count;
  END IF;
END $$;

-- ============================================
-- STEP 2: Drop CHECK constraint
-- ============================================
ALTER TABLE study_sessions
  DROP CONSTRAINT IF EXISTS check_session_identity;

-- ============================================
-- STEP 3: Restore user_id NOT NULL constraint
-- ============================================
-- This will fail if any rows have user_id = NULL
-- (Should be safe due to Step 1 check)
ALTER TABLE study_sessions
  ALTER COLUMN user_id SET NOT NULL;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these after rollback to verify:
--
-- 1. Verify user_id is NOT NULL again:
-- SELECT column_name, is_nullable FROM information_schema.columns
-- WHERE table_name = 'study_sessions' AND column_name = 'user_id';
-- Expected: is_nullable = 'NO'
--
-- 2. Verify CHECK constraint removed:
-- SELECT conname FROM pg_constraint
-- WHERE conrelid = 'study_sessions'::regclass AND conname = 'check_session_identity';
-- Expected: No rows
--
-- 3. Verify all sessions have user_id:
-- SELECT COUNT(*) FROM study_sessions WHERE user_id IS NULL;
-- Expected: 0
