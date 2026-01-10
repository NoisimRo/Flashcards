-- ============================================
-- MASTER MIGRATION SCRIPT
-- ============================================
-- Purpose: Run all migrations in correct order
-- Date: 2026-01-09
--
-- This script runs all migrations sequentially:
-- 1. Make decks public by default
-- 2. Add deck reviews system
-- 3. Add card flagging system
-- 4. Add deck flagging system

\echo '=========================================='
\echo 'Starting all migrations...'
\echo '=========================================='
\echo ''

\echo '1/4: Making decks public...'
\i 01-make-decks-public.sql
\echo 'Done!'
\echo ''

\echo '2/4: Creating deck reviews table...'
\i 02-deck-reviews.sql
\echo 'Done!'
\echo ''

\echo '3/4: Creating card flags table...'
\i 03-card-flags.sql
\echo 'Done!'
\echo ''

\echo '4/4: Creating deck flags table...'
\i 04-deck-flags.sql
\echo 'Done!'
\echo ''

\echo '=========================================='
\echo 'All migrations completed successfully!'
\echo '=========================================='
\echo ''

-- Final verification
\echo 'Verification of new tables:'
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('deck_reviews', 'card_flags', 'deck_flags')
ORDER BY tablename;

\echo ''
\echo 'Deck stats:'
SELECT
  COUNT(*) as total_decks,
  SUM(CASE WHEN is_public THEN 1 ELSE 0 END) as public_decks,
  AVG(review_count) as avg_reviews_per_deck,
  AVG(average_rating) as overall_avg_rating
FROM decks
WHERE deleted_at IS NULL;
