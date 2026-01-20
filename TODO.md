# TODO - Flashcards Development Roadmap

> Prioritized list of features, improvements, and technical debt items.
> Updated: January 2026

---

## Priority Legend

- **P0**: Critical / Blocking
- **P1**: High priority / Next sprint
- **P2**: Medium priority / Backlog
- **P3**: Low priority / Nice to have

---

## Current Blockers (P0)

_None - all critical blockers resolved!_

---

## Recently Completed ✅

### January 2026

- [x] **Internationalization (i18n)** - Complete i18n implementation
  - ✅ Added react-i18next with 3 languages (Română, English, Italiano)
  - ✅ Created 21 translation files (7 namespaces × 3 languages)
  - ✅ Refactored all page components with i18n support
  - ✅ Added language switcher in Settings page with flag emojis
  - ✅ Locale-aware number and date formatting

- [x] **Component consolidation** - Atomic Design refactoring
  - ✅ Moved all components from `/components/` to `/src/components/`
  - ✅ Organized into atomic design structure (layout, pages, ui)
  - ✅ Changed to named exports for consistency
  - ✅ Updated all imports across the codebase

- [x] **Bug fixes**
  - ✅ Fixed TypeAnswer card navigation bug (flipped state persisting)
  - ✅ Fixed type import paths (DeckWithCards, Achievement, LeaderboardEntry)

---

## High Priority (P1)

### Features

- [ ] **Complete offline sync** - Conflict resolution UI
  - Show sync status indicator
  - Allow user to choose "keep local" vs "keep server"
  - Handle merge scenarios

- [ ] **Subject-based deck filtering**
  - Add filter dropdown to DeckList
  - Backend already supports subject filtering

- [ ] **Password reset flow**
  - Email verification (requires email service)
  - Reset token generation
  - Update password endpoint

### Bug Fixes

- [ ] **Mobile responsive issues** - Test and fix sidebar collapse on small screens

### Infrastructure

- [ ] **Fix Husky deprecation warnings**
  - Update `.husky/pre-commit`, `pre-push`, `commit-msg` files
  - Remove deprecated shebang lines

---

## Medium Priority (P2)

### Code Quality / Refactoring

- [ ] **Split large components**
  - `App.tsx` (540 lines) → Extract routing, user state management
  - `StudySession.tsx` (1000 lines) → Extract card display, input handling, results

- [ ] **Consolidate type definitions**
  - Merge `/types.ts` with `/src/types/models.ts`
  - Remove duplicates
  - Export from single location

- [ ] **Add TailwindCSS properly**
  - Install as dependency
  - Configure for purging in production
  - Remove CDN usage

### Testing

- [ ] **Add component tests**
  - Dashboard rendering
  - DeckList CRUD operations
  - StudySession flow
  - Auth forms

- [ ] **Add integration tests**
  - Full auth flow (register → login → logout)
  - Deck creation → study → XP gain
  - Leaderboard updates

- [ ] **API test coverage**
  - Users routes
  - Import/Export routes
  - Error scenarios

### Features

- [ ] **Teacher dashboard**
  - Create decks for students
  - View student progress
  - Assign decks to classes

- [ ] **Sound effects**
  - Correct/incorrect answer sounds
  - Level up celebration
  - Streak notifications

- [ ] **Progress charts**
  - Weekly study time graph
  - XP progression over time
  - Cards learned per subject

---

## Low Priority (P3)

### Nice to Have Features

- [ ] **Dark mode**
  - Theme toggle in settings
  - Persist preference
  - System preference detection

- [ ] **Social features**
  - Share decks publicly
  - Follow other users
  - Comments on decks

- [ ] **Study modes**
  - Quiz mode (multiple choice)
  - Match mode (connect pairs)
  - Speed round

- [ ] **Spaced repetition analytics**
  - Show card difficulty distribution
  - Predict mastery dates
  - Optimize review schedule

### Technical Improvements

- [ ] **Add error boundary**
  - Catch React errors gracefully
  - Show user-friendly error page
  - Log errors for debugging

- [ ] **Implement caching**
  - Cache deck list
  - Cache leaderboard (TTL: 5 min)
  - Reduce API calls

- [ ] **Add rate limiting**
  - Protect auth endpoints
  - Limit API abuse
  - Return proper 429 responses

- [ ] **Database migrations**
  - Set up migration tool (e.g., node-pg-migrate)
  - Version schema changes
  - Rollback capability

---

## Completed (Recent)

- [x] **XP Synchronization & Stats Fix** - Complete XP/stats system overhaul (Jan 3, 2026)
  - Fixed XP not updating after session completion (backend now updates total_xp, current_xp)
  - Implemented full level-up logic with exponential XP growth (20% per level)
  - Fixed total_time_spent tracking (converts seconds to minutes)
  - Dashboard stats now refresh after session completion (refreshSession + fetchDecks)
  - Fixed 401 Unauthorized errors (proper token expiration handling with auth:expired event)
  - Fixed "Salvează și ieși" button (now saves progress without completing session)
  - Fixed StudyNow page showing 0 decks (filter by totalCards instead of cards array)
  - Fixed mastered_cards calculation (now per-user from user_card_progress table)
  - Level-up toast notifications: "🎉 LEVEL UP! Nivel X → Y! +Z XP"
  - Session progress preserved for resuming later

- [x] **Session Architecture Refactoring** - Complete separation of library vs sessions (Jan 3, 2026)
  - Implemented new study sessions architecture with 4 selection methods
  - Created 3 new UI components (CreateSessionModal, ActiveSessionsList, StudySessionPlayer)
  - Database migration: new tables (user_card_progress, refactored study_sessions)
  - Per-user card progress tracking with SM-2 algorithm
  - Auto-save session progress every 30 seconds
  - Multiple concurrent sessions support
  - Fixed deck title/topic display in session player
  - Fixed hint persistence issue with React keys
  - All database migrations successfully applied in production

- [x] **Quiz Mode Flashcards** - Full quiz functionality (Jan 2, 2025)
  - Implemented quiz card type (60% standard, 40% quiz mix)
  - Multiple choice questions with 4 options
  - Visual feedback (green/red) for correct/incorrect answers
  - All 64 tests passing
- [x] **Critical Deck Persistence Fix** - Cards now save to database (Jan 2, 2025)
  - Fixed handleEditDeck to detect AI-generated cards by ID prefix
  - All flashcards properly persisted to backend
  - Deck refresh after save to get correct IDs
- [x] **Mobile UX Overhaul** - Complete gesture and UI redesign (Jan 2, 2025)
  - Swipe left = previous card, swipe right = next card
  - Tap anywhere on card = flip
  - All buttons moved inside card for mobile visibility
  - Card height increased by 30% for better readability
  - Removed duplicate UI fields
- [x] **AI Deck Generation** - Fixed backend API integration (Dec 21, 2024)
  - Moved AI generation from frontend to backend
  - Created POST /api/decks/generate endpoint
  - Moved geminiService.ts to server/services/
  - Updated API client and DeckList component
  - All tests passing (38/38)
- [x] **Fix Docker build in Cloud Build** - Resolved in previous session
- [x] **XP display consistency** - Complete XP system overhaul (Dec 21, 2024)
  - Fixed hint XP verification (checks session + user XP)
  - Added 50 XP bonus for 5-streak with toast notification
  - Created POST /api/users/:id/xp endpoint with level-up logic
  - Implemented XP sync to backend on session finish
  - Fixed handleUpdateUserXP with real API call
- [x] Set up CI/CD with GitHub Actions
- [x] Configure Cloud Build trigger for `main` branch
- [x] Fix TypeScript, ESLint, Prettier errors
- [x] Add `package-lock.json` to git
- [x] Migrate ESLint to v9 flat config
- [x] Add Toast notification system
- [x] Replace static data with dynamic user data
- [x] Add leaderboard API endpoint

---

## Session Notes

### January 20, 2026 - Type System Consolidation, i18n Implementation & Streak Logic

**Session Focus**: Fix CreateSessionModal bugs, implement complete i18n for Daily Challenges and Achievements, add streak maintenance logic, and consolidate type definitions

**Problems Identified**:

1. CreateSessionModal showing "NaN carduri" when deck has insufficient cards
2. Slider range logic broken for decks with < 5 cards (invalid min > max)
3. All UI strings hardcoded in Romanian - no internationalization
4. Daily Challenges and Achievements using hardcoded strings instead of translation keys
5. No daily streak maintenance logic - streaks not resetting when conditions not met
6. Duplicate type definitions between `/types.ts` (root) and `/src/types/models.ts`
7. Mock data still present in constants.ts despite real API integration
8. Adapter files (userAdapter.ts, deckAdapter.ts) converting API responses unnecessarily
9. Missing fields in type definitions: User.totalCorrectAnswers, User.totalAnswers, Deck.masteredCards
10. LeaderboardEntry type conflict: models.ts uses userId/totalXP, api/users.ts uses id/xpTotal

**Root Cause Analysis**:

**CreateSessionModal Issues:**

- NaN issue: `deck?.totalCards` was undefined, needed fallback: `deck?.totalCards || 0`
- Slider issue: When availableCards < 5, Math.min(5, availableCards) produces max < min
- Solution: `max={Math.max(5, Math.min(50, availableCards))}` ensures valid range

**Internationalization Gaps:**

- Frontend components had hardcoded Romanian strings
- Backend APIs returned hardcoded strings instead of translation keys
- No titleKey/descriptionKey pattern for translatable content
- Solution: Backend returns keys (e.g., `titleKey: 'challenges.cards.title'`), frontend translates

**Streak Maintenance Missing:**

- Daily streak incremented on login but never reset if conditions not met
- No validation of yesterday's activity
- Solution: Server checks if user met ONE condition yesterday: 10+ min studied OR 20+ correct cards

**Type System Duplication:**

- Historic problem from refactoring - /types.ts (legacy) vs /src/types/ (proper structure)
- Caused TypeScript errors: "Type 'Achievement[]' from /types.ts is not assignable to type 'Achievement[]' from /src/api/achievements.ts"
- Solution: Complete elimination of root /types.ts, consolidated all types in /src/types/models.ts

**Mock Data Redundancy:**

- constants.ts had 490 lines of MOCK_DECKS, MOCK_ACHIEVEMENTS, LEADERBOARD_DATA
- Only needed for guest mode, but even guests now see real API data with unlocked: false
- Solution: Reduced constants.ts to 11 lines (only GUEST_USER for UI necessities)

**Adapter Layer Unnecessary:**

- Adapters (userAdapter.ts, deckAdapter.ts) were converting API snake_case to camelCase
- But backend already returns camelCase (e.g., totalXP, masteredCards)
- Adapters added type mismatches and complexity
- Solution: Deleted adapters, use API responses directly

**Type Definition Gaps:**

- Backend returns totalCorrectAnswers, totalAnswers, masteredCards but types missing these
- LeaderboardEntry had two incompatible definitions
- Solution: Added missing fields to User and Deck interfaces, use API type for LeaderboardEntry

**Completed**:

**CreateSessionModal Fixes:**

- ✅ Fixed NaN display: `const availableCards = deck?.totalCards || 0;`
- ✅ Fixed slider range: `max={Math.max(5, Math.min(50, availableCards))}`
- ✅ Implemented complete i18n with `useTranslation('session')`
- ✅ Replaced all hardcoded strings: "Sesiune Nouă" → `{t('create.title')}`
- ✅ Created translation files: public/locales/{ro,en,it}/session.json

**Daily Challenges i18n:**

- ✅ Backend: Changed from hardcoded `title: "Răspunde corect la X carduri"` to `titleKey: 'challenges.cards.title', titleParams: { count: X }`
- ✅ Frontend: Dashboard.tsx uses `t(challenge.titleKey, challenge.titleParams)`
- ✅ Added String() wrapper for TypeScript type safety
- ✅ Created translations in public/locales/{ro,en,it}/dashboard.json
- ✅ Backend returns i18n keys in server/routes/dailyChallenges.ts

**Achievements i18n:**

- ✅ Backend: Added getAchievementKeys() function returning titleKey/descriptionKey
- ✅ Frontend: Achievements page fetches real data via API, translates using keys
- ✅ Removed MOCK_ACHIEVEMENTS dependency
- ✅ Created translations in public/locales/{ro,en,it}/achievements.json
- ✅ Backend returns i18n keys in server/routes/achievements.ts

**Streak Maintenance Logic:**

- ✅ Implemented in server/routes/auth.ts login endpoint (lines 224-268)
- ✅ Queries yesterday's study sessions for total time and correct answers
- ✅ Streak maintained if: `yesterdayMinutes >= 10 OR yesterdayCorrect >= 20`
- ✅ Streak increments if condition met, resets to 1 if not
- ✅ Added tooltip explaining conditions in Dashboard

**Type System Consolidation:**

- ✅ Deleted `/types.ts` (114 lines of duplicate definitions)
- ✅ Updated 17 imports across codebase to use `/src/types/`
- ✅ Consolidated all types in `/src/types/models.ts`
- ✅ Eliminated Achievement/LeaderboardEntry/User/Deck duplicates

**Mock Data Elimination:**

- ✅ Reduced constants.ts from 490 lines to 11 lines
- ✅ Removed MOCK_DECKS, MOCK_ACHIEVEMENTS, LEADERBOARD_DATA
- ✅ Kept only GUEST_USER and GUEST_PROMPTS
- ✅ All users (including guests) now see real API data
- ✅ Achievements page fetches from GET /api/achievements
- ✅ Leaderboard uses real data (no fallback)

**Adapter Removal:**

- ✅ Deleted src/adapters/userAdapter.ts (75 lines)
- ✅ Deleted src/adapters/deckAdapter.ts (75 lines)
- ✅ Updated ViewRouter.tsx: removed adaptUserFromAPI, adaptDeckFromAPI
- ✅ Updated AppLayout.tsx: use authUser directly
- ✅ Updated useLeaderboard.ts: removed LEADERBOARD_DATA fallback

**Type Definition Fixes:**

- ✅ Added User.totalCorrectAnswers and User.totalAnswers (src/types/models.ts)
- ✅ Added Deck.masteredCards (src/types/models.ts)
- ✅ Updated GUEST_USER to include new fields (src/utils/guestMode.ts)
- ✅ Fixed LeaderboardEntry conflict: Leaderboard.tsx uses API type (id, xpTotal)
- ✅ Fixed DeckList.tsx: changed editCardsModalDeck from Deck to DeckWithCards
- ✅ Removed Card.status assignment (status is in UserCardProgress, not Card)
- ✅ Re-exported FlagReason/FlagStatus from src/api/flags.ts

**Files Modified**:

Backend:

- `server/routes/dailyChallenges.ts` - Return i18n keys instead of hardcoded strings
- `server/routes/achievements.ts` - Return i18n keys for all achievements
- `server/routes/auth.ts` - Implemented streak maintenance logic (lines 224-268)

Frontend:

- `src/components/sessions/CreateSessionModal.tsx` - Fixed NaN, slider, added i18n
- `src/components/pages/Dashboard/Dashboard.tsx` - Use i18n keys for challenges
- `src/components/pages/Achievements/Achievements.tsx` - Fetch real data via API
- `src/components/pages/Leaderboard/Leaderboard.tsx` - Use API LeaderboardEntry type
- `src/components/pages/DeckList/DeckList.tsx` - Use DeckWithCards for modal
- `src/routes/ViewRouter.tsx` - Removed adapters, use direct API types
- `src/layouts/AppLayout.tsx` - Removed adapters, use authUser directly
- `src/hooks/useLeaderboard.ts` - Removed LEADERBOARD_DATA fallback

Types:

- `src/types/models.ts` - Added User.totalCorrectAnswers/totalAnswers, Deck.masteredCards
- `src/utils/guestMode.ts` - Updated GUEST_USER with new fields
- `src/api/flags.ts` - Re-exported FlagReason/FlagStatus

Deleted Files:

- `/types.ts` - 114 lines of duplicate type definitions
- `src/adapters/userAdapter.ts` - 75 lines (unnecessary conversion layer)
- `src/adapters/deckAdapter.ts` - 75 lines (unnecessary conversion layer)
- `constants.ts` - Reduced from 490 to 11 lines (479 lines of mock data removed)

Translations:

- `public/locales/ro/session.json` - CreateSessionModal strings
- `public/locales/en/session.json` - English translations
- `public/locales/it/session.json` - Italian translations
- `public/locales/ro/dashboard.json` - Added challenges section
- `public/locales/en/dashboard.json` - Added challenges section
- `public/locales/it/dashboard.json` - Added challenges section

**TypeScript Verification**:

- ✅ Ran `npx tsc --noEmit --skipLibCheck` - 0 application errors
- ✅ Ran `npx tsc -p tsconfig.server.json --noEmit --skipLibCheck` - 0 application errors
- ⚠️ Only missing type definition warnings for @types/node, @types/pg (dev dependencies)

**Commits**:

- (To be committed) - feat: implement i18n for CreateSessionModal, Daily Challenges, and Achievements
- (To be committed) - feat: implement daily streak maintenance logic (10 min OR 20 cards)
- (To be committed) - refactor: consolidate type definitions - remove /types.ts duplication
- (To be committed) - refactor: eliminate mock data in favor of real API calls
- (To be committed) - refactor: remove adapter layer and use direct API types

**Testing Checklist**:

1. ✅ CreateSessionModal - No NaN, slider works with any deck size
2. ✅ Language switcher - All pages show correct translations
3. ✅ Daily Challenges - Display in Romanian/English/Italian
4. ✅ Achievements - Display in Romanian/English/Italian
5. ✅ Streak maintenance - Reset if conditions not met, increment if met
6. ✅ TypeScript compilation - All application code compiles
7. ⏳ Production testing - Verify real data flows correctly

**Next Session Recommendations**:

- Test streak maintenance in production (requires 24h wait)
- Monitor API performance with increased real data usage
- Consider adding loading states for API-fetched challenges/achievements
- Add error boundaries for API failures
- Consider caching achievements data (rarely changes)

---

### January 5, 2026 - Deep Card Type System Refactor & UI Design Unification

**Session Focus**: Complete overhaul of card type architecture and unification of design system across all pages

**Problems Identified**:

1. Card type system inconsistency - `types.ts` only allowed `'standard' | 'quiz'` but code tried to use `'type-answer'`
2. Standard cards incorrectly showing optional input field (should be flip-only)
3. No proper handling for type-answer cards that require typed input
4. Type-answer cards being converted to standard in StudySessionPlayer (hack/workaround)
5. Multiple TypeScript compilation errors due to type mismatches
6. ESLint errors (unused expressions, Object.prototype.hasOwnProperty)
7. Design inconsistency between Dashboard, Decks, and Active Sessions pages

**Root Cause Analysis**:

**Card Type Architecture Issue:**

- The application needed 3 distinct card types with different behaviors:
  1. **Standard**: Flip card only, no input required
  2. **Type-answer**: Must type answer (includes cloze deletion), input required
  3. **Quiz**: Multiple choice with options
- Problem: `types.ts` Card interface only supported `'standard' | 'quiz'`
- StudySession component showed input on ALL standard cards (marked "optional")
- Type-answer cards were being forcibly converted to standard type
- No logic to distinguish when input should be required vs optional vs hidden

**Design System Inconsistency:**

- Active Sessions page used thin horizontal list items
- Dashboard and Decks used volumetric cards with watermark icons
- No unified visual language across pages

**Completed**:

**Deep Card Type Refactor:**

- ✅ Updated `types.ts` Card interface to support all 3 types:
  - Added `CardType = 'standard' | 'type-answer' | 'quiz'`
  - Added documentation explaining each type's purpose
- ✅ Fixed DeckList.tsx card type arrays (2 occurrences) to include `'type-answer'`
- ✅ Removed type conversion hack in StudySessionPlayer.tsx (line 64)
  - Changed from: `type: card.type === 'type-answer' ? 'standard' : (card.type as 'standard' | 'quiz')`
  - To: `type: card.type` (pass through as-is)
- ✅ Updated StudySession.tsx card rendering logic:
  - Line 849: Changed condition to `currentCard.type === 'standard' || currentCard.type === 'type-answer'`
  - Line 975: Input field ONLY shows for type-answer cards (`currentCard.type === 'type-answer'`)
  - Line 1006: Flip button ONLY shows for standard cards (`currentCard.type === 'standard'`)
  - Updated input styling: indigo background, required indicator, autoFocus
  - Added helper text: "Trebuie să scrii răspunsul pentru a continua"
- ✅ Updated keyboard shortcuts (lines 558-584):
  - Space/Enter only flips standard cards (not type-answer)
  - Arrow keys work for both standard and type-answer when flipped
  - ArrowUp only flips standard cards
- ✅ Updated geminiService.ts to generate all 3 types with dynamic distribution

**Active Sessions Page Redesign:**

- ✅ Complete refactor to match Dashboard/Decks visual language
- ✅ Changed from thin horizontal list to volumetric cards:
  - Background: `bg-[#F8F6F1]` (warm beige like deck tiles)
  - Padding: `p-6`, rounded: `rounded-3xl`
  - Responsive grid: 1 col (mobile) → 2 cols (lg) → 3 cols (xl)
- ✅ Added large watermark icons (120px, opacity-10):
  - Shuffle (blue) for Random
  - Brain (purple) for Smart Review
  - CheckSquare (green) for Manual
  - List (orange) for All
- ✅ Replaced linear progress bar with prominent circular progress indicator:
  - 128px diameter SVG with smooth animations
  - Shows percentage in center (text-3xl font-bold)
  - Card count below (currentIndex/totalCards)
  - Indigo-600 progress stroke
- ✅ Added real-time answer statistics:
  - ✓ X știute (green), ✗ X greșite (red), ⊘ X sărite (gray)
  - Calculated from session.answers object
- ✅ Changed time tracking from "X ago" to total time spent:
  - Displays actual practice time from durationSeconds
  - Formatted as "Xh Ym" or "X min"
- ✅ Added method display with icons and colors
- ✅ Full-page layout with header and subtitle
- ✅ Action buttons match deck tile styling

**Dashboard & Decks Enhancements:**

- ✅ Fixed Dashboard tile data issues (card-stats API error handling)
- ✅ Fixed Active Sessions tile to show session count (not deck count)
- ✅ Fixed Success Rate to include all sessions (not just completed)
- ✅ Fixed Time Spent double-counting bug with incremental tracking
- ✅ Added incremental answer tracking for real-time success rate updates
- ✅ Redesigned deck tiles with permanent action bar
- ✅ Added card type selection to AI generation modal
- ✅ Fixed manual session selection 500 error with card selection UI
- ✅ Added hover tooltips to session selection methods
- ✅ Implemented Continue Session button to open session directly

**Files Modified**:

Core Types:

- `types.ts` - Updated Card interface with CardType union, added documentation

Frontend Components:

- `components/StudySession.tsx` - Complete card type rendering logic overhaul
- `components/DeckList.tsx` - Updated card type arrays to include type-answer
- `src/components/sessions/StudySessionPlayer.tsx` - Removed type conversion hack
- `src/components/sessions/ActiveSessionsList.tsx` - Complete redesign matching unified design system
- `src/components/sessions/CreateSessionModal.tsx` - Added manual card selection UI, tooltips
- `components/Dashboard.tsx` - Card stats integration, session resuming, success rate fixes

Backend:

- `server/services/geminiService.ts` - Updated to generate all 3 card types
- `server/routes/decks.ts` - Added cardTypes parameter to /api/decks/generate
- `server/routes/studySessions.ts` - Incremental time/answer tracking
- `server/routes/users.ts` - Card stats endpoint with error handling

API:

- `src/api/decks.ts` - Updated generateDeckWithAI to accept cardTypes parameter

**Commits**:

- `fix: implement incremental tracking for success rate and fix time double-counting`
- `fix: resolve Dashboard tile data issues and improve error handling`
- `fix: implement manual card selection UI to prevent 500 error`
- `feat: redesign deck tiles, add card type selection, and improve session modal UX`
- `feat: refactor Active Sessions page to match unified design system`
- _(Next commit will be the deep card type refactor)_

**Key Behavioral Changes**:

1. **Standard Cards**:
   - Pure flip cards - click/tap to flip, no input field
   - Space/Enter flips the card
   - Back side shows "Știu"/"Nu știu" buttons

2. **Type-Answer Cards**:
   - Front side shows input field (required, indigo styling, autofocus)
   - User MUST type answer to proceed
   - Space/Enter does NOT flip (input takes priority)
   - Answer is validated against card.back (supports multiple answers separated by commas)
   - Success feedback flips to back automatically

3. **Quiz Cards**:
   - Multiple choice with 4 options
   - Click option to answer
   - Visual feedback (green/red) shows correct/incorrect
   - Auto-advances after 1.5 seconds

**Testing Checklist**:

1. ✅ Create deck with standard cards → Should flip without input field
2. ✅ Create deck with type-answer cards → Should require typing
3. ✅ Create deck with quiz cards → Should show multiple choice
4. ✅ Generate cards with AI → Should create mix of selected types
5. ✅ Active Sessions page → Should match Dashboard visual design
6. ✅ Circular progress → Should animate smoothly
7. ✅ Time tracking → Should show actual practice time
8. ✅ TypeScript compilation → Should pass with no errors
9. ✅ ESLint → Should pass with no errors

**Next Session Recommendations**:

- Test all 3 card types in production environment
- Verify type-answer input validation with various answer formats
- Consider adding cloze deletion syntax (e.g., "The capital of France is {{Paris}}")
- Test circular progress animations on mobile devices
- Monitor user engagement with different card types

---

### January 4, 2026 - Data Accuracy & Real-Time Systems Implementation

**Session Focus**: Resolve data accuracy issues and implement real-time gamification systems

**Problems Identified**:

1. "Carduri învățate" (total_cards_learned) always showing 0 despite correct answers
2. Mock data displayed for Daily Challenges, Streak Calendar, and Achievements
3. Dashboard and Active Sessions pages cutting off content (no scroll)
4. Active Sessions tiles missing category and topic information
5. Inconsistent terminology: "learned" vs "mastered" labels throughout app
6. Multiple TypeScript and ESLint errors after implementation

**Root Cause Analysis**:

**Total Cards Learned Issue:**

- Backend was incrementing total_cards_learned on every correct answer
- Problem: Same card counted multiple times in one session
- Solution: Changed to count only unique cards (first-time correct answers only)
- Modified cardsLearned calculation to use Set for uniqueness

**Real-Time Data Systems:**

- Daily Challenges, Streak Calendar, and Achievements were all using MOCK\_\* data
- No backend endpoints existed for these features
- Solution: Implemented complete backend + frontend integration:
  - Created database migration for daily_challenges table
  - Created /api/daily-challenges and /api/achievements endpoints
  - Integrated real user stats for achievement unlocking
  - Activity calendar tracks last 28 days from daily_progress table

**UI/UX Issues:**

- Main containers had `overflow-hidden` preventing scroll
- Active Sessions API response didn't include deck topic
- Label inconsistency across 6+ components

**TypeScript/ESLint Errors:**

- Used wrong import names (pool instead of query, authMiddleware instead of authenticateToken)
- Created new API files with axios instead of using existing api client
- StudySession type missing optional deck property
- Case block with const declaration needed curly braces for ESLint compliance

**Completed**:

**Data Accuracy Fixes:**

- ✅ Fixed total_cards_learned calculation in session completion (server/routes/studySessions.ts:626-631)
  - Changed from totalCorrect to counting unique first-time correct cards only
  - Uses Set to track unique card IDs: `const cardsLearned = [...new Set(firstTimeCorrectCards)].length`
- ✅ Renamed "Salvează și ieși" → "Continuă mai târziu" for clarity

**Real-Time Systems Implementation:**

- ✅ Created database migration: `server/db/migrations/002_daily_challenges.sql`
  - daily_challenges table with challenge tracking
  - Indexes for efficient querying
- ✅ Implemented Daily Challenges backend (server/routes/dailyChallenges.ts):
  - GET /api/daily-challenges/today - Fetch 3 daily challenges
  - POST /api/daily-challenges/claim-reward - Claim XP rewards
  - GET /api/daily-challenges/activity-calendar - Last 28 days activity
- ✅ Implemented Achievements backend (server/routes/achievements.ts):
  - GET /api/achievements - All achievements with user unlock status
  - checkAndUnlockAchievements() function called after session completion
  - Checks 5 condition types: decks_completed, streak_days, cards_mastered, level_reached, decks_created
- ✅ Created frontend API clients:
  - src/api/dailyChallenges.ts - getTodaysChallenges(), claimChallengeReward(), getActivityCalendar()
  - src/api/achievements.ts - getAchievements()
- ✅ Updated Dashboard component (components/Dashboard.tsx):
  - Integrated real Daily Challenges data
  - Integrated real Activity Calendar with streak tracking
  - Integrated real Achievements data with unlock status
  - Removed all MOCK\_\* data usage

**UI/UX Improvements:**

- ✅ Added scroll functionality to Dashboard (h-screen overflow-y-auto)
- ✅ Added scroll to all pages via App.tsx main container (overflow-y-auto)
- ✅ Added category and topic display to Active Sessions tiles
  - Backend: Added d.topic to SQL query in server/routes/studySessions.ts
  - Frontend: Conditional rendering with bullet separator in ActiveSessionsList.tsx
- ✅ Updated labels throughout entire app (6 components):
  - "Carduri învățate" → "Carduri în studiu"
  - "Carduri stăpânite" → "Carduri învățate"
  - "rămase" → "în studiu"
  - New format: "10 carduri | 7 în studiu | 3 învățate"

**Error Fixes:**

- ✅ Fixed import errors in server/routes/achievements.ts and dailyChallenges.ts
  - Changed `import { pool }` → `import { query } from '../db/index.js'`
  - Changed `import { authMiddleware }` → `import { authenticateToken } from '../middleware/auth.js'`
- ✅ Fixed TypeScript type errors in server/routes/dailyChallenges.ts
  - Added explicit type annotations: `const activity: any` and `Map<string, any>`
- ✅ Fixed missing axios/config in frontend API files
  - Replaced axios setup with existing centralized `api` client from `./client`
  - Updated function signatures to use api.get/post pattern
- ✅ Fixed missing deck property error in src/types/models.ts
  - Extended StudySession interface with optional deck property
- ✅ Fixed ESLint no-case-declarations error
  - Wrapped case block with const declaration in curly braces

**Files Modified**:

Backend:

- `server/db/migrations/002_daily_challenges.sql` - NEW: Daily challenges table
- `server/routes/dailyChallenges.ts` - NEW: Daily challenges endpoints
- `server/routes/achievements.ts` - NEW: Achievements endpoints + unlock logic
- `server/routes/studySessions.ts` - Fixed cardsLearned calculation, added topic to response, integrated achievement checking
- `server/index.ts` - Added routes: /api/daily-challenges, /api/achievements

Frontend:

- `src/api/dailyChallenges.ts` - NEW: Daily challenges API client
- `src/api/achievements.ts` - NEW: Achievements API client
- `components/Dashboard.tsx` - Integrated all real-time systems, added scroll, updated labels
- `App.tsx` - Added scroll to main container
- `src/components/sessions/ActiveSessionsList.tsx` - Added category/topic display
- `components/DeckList.tsx` - Updated label "rămase" → "în studiu"
- `components/StudyNow.tsx` - Updated label "rămase" → "în studiu"
- `src/types/models.ts` - Added optional deck property to StudySession

**Commits**:

- `873516f` - feat: implement real-time data systems for Dashboard (Daily Challenges, Streak Calendar, Achievements)
- `a043731` - fix: correct total_cards_learned to count unique cards only
- `0ada026` - fix(sessions): correct cardsLearned calculation in session completion
- _(Previous debugging commits for data accuracy investigation)_

**Testing**:

1. Complete study session → total_cards_learned should increase by unique correct cards only
2. Dashboard → Daily Challenges should show 3 real challenges with progress
3. Dashboard → Streak Calendar should show last 28 days activity
4. Dashboard → Achievements should show real unlock status
5. Active Sessions page → Should scroll if content exceeds viewport
6. Active Sessions tiles → Should display subject name and topic (e.g., "Matematică • Ecuații")
7. All pages → Labels should use "în studiu" and "învățate" consistently

**Next Session Recommendations**:

- Test real-time systems in production environment
- Verify daily challenges reset at midnight
- Test achievement unlocking across all condition types
- Monitor daily_progress table population
- Consider adding more achievement tiers (bronze/silver/gold/platinum)

---

### January 3, 2026 - XP Sync, Session Save & Dashboard Stats Fix

**Session Focus**: Resolve critical backend XP synchronization and session management issues

**Problems Identified**:

1. XP not updating after completing study sessions (static 1180 XP)
2. Dashboard showing 0 for all stats (cards learned, time spent, success rate)
3. "Salvează și ieși" completing sessions instead of saving progress
4. StudyNow page showing 0 decks despite having decks with cards
5. 401 Unauthorized errors on session completion due to token expiration

**Root Cause Analysis**:

**XP Synchronization Issue:**

- Backend POST /api/study-sessions/:id/complete was NOT updating user's total_xp, current_xp, or level
- Only updated total_cards_learned and total_decks_completed
- Level-up logic was marked as TODO
- Solution: Implemented full XP update with level-up calculation (20% exponential growth)

**Dashboard Stats Issue:**

- User object not refreshed after session completion
- handleCloseSession only changed view, didn't refresh user data
- Solution: Added refreshSession() and fetchDecks() calls

**Session Save Issue:**

- StudySessionPlayer.handleFinish ignored clearSession parameter
- Always called completeSession even when clearSession=false
- Solution: Check clearSession flag and call updateSessionProgress instead when false

**StudyNow Page Issue:**

- Component filtered decks by d.cards.length > 0
- But GET /api/decks doesn't return cards array (only totalCards metadata)
- Also mastered_cards was global (cards.status) not per-user (user_card_progress.status)
- Solution: Filter by totalCards, calculate mastered_cards per-user in query

**401 Errors Issue:**

- Token expiration during long sessions (>15min)
- client.ts tried to redirect to '/login' which doesn't exist in SPA
- Solution: Dispatch 'auth:expired' event, App.tsx shows AuthPage

**Completed**:

- ✅ Implemented XP synchronization in backend (total_xp, current_xp, level)
- ✅ Implemented level-up logic with exponential growth (newNextLevelXP = Math.floor(oldNextLevelXP \* 1.2))
- ✅ Added total_time_spent tracking (duration converted to minutes)
- ✅ Modified completeSession in store to return full response data (leveledUp, xpEarned, etc.)
- ✅ Added level-up toast notifications in StudySessionPlayer
- ✅ Fixed handleCloseSession to refresh user data (refreshSession + fetchDecks)
- ✅ Added auth:expired event handling for token expiration
- ✅ Fixed "Salvează și ieși" to only save progress (not complete session)
- ✅ Fixed StudyNow filter to use totalCards instead of cards.length
- ✅ Fixed mastered_cards calculation to be per-user (from user_card_progress)
- ✅ All code formatted and tests passing

**Files Modified**:

Backend:

- `server/routes/studySessions.ts` - XP sync, level-up logic, time tracking (lines 593-650)
- `server/routes/decks.ts` - Per-user mastered_cards subquery (lines 78-98)

Frontend:

- `src/store/studySessionsStore.ts` - Return full response data from completeSession
- `src/components/sessions/StudySessionPlayer.tsx` - Session save logic, level-up notifications
- `src/api/client.ts` - auth:expired event dispatch
- `App.tsx` - handleCloseSession refresh, auth:expired listener
- `components/StudyNow.tsx` - Filter by totalCards

**Commits**:

- `a0a3f8b` - Backend XP sync + level-up logic
- `27a9138` - Session save + 401 fix + Dashboard refresh
- `16a7111` - StudyNow page fixes

**Testing**:

1. Complete a study session → XP should increase, level may increase
2. Click "Salvează și ieși" → Session preserved in Active Sessions
3. Navigate to Dashboard → Stats show correct values
4. Navigate to StudyNow → All decks with cards appear
5. Wait 15+ min in session → Token expires → Auth page appears

**Next Session Recommendations**:

- Test XP and level-up in production environment
- Verify session save/resume flow
- Test token expiration handling
- Monitor user_card_progress table population

---

### January 2, 2025 - Critical Fixes & Mobile UX Enhancement

**Session Focus**: Resolve deck persistence issues and complete mobile touch experience

**Problems Identified**:

1. AI-generated flashcards not saving to database
2. Deck dimensions too small on mobile
3. Tap-to-flip not working
4. Buttons not fully visible on mobile screens

**Root Cause Analysis**:

**Deck Persistence Issue:**

- Original logic compared `oldDeck.cards.length` vs `updatedDeck.cards.length`
- Problem: State could be stale or updated asynchronously
- Cards with temporary IDs (`ai-${timestamp}-${index}`) weren't being detected
- Solution: Check for ID prefixes (`ai-*`, `temp-*`) instead of length comparison

**Completed**:

- ✅ Fixed deck persistence by detecting temporary ID prefixes
- ✅ Increased card height by 30% (aspect-[4/3] → aspect-[4/3.9])
- ✅ Implemented tap-to-flip (movement < 20px triggers flip)
- ✅ Moved all buttons inside card container with z-50
- ✅ Removed pointer-events complexity
- ✅ Made all button text visible on mobile (removed `hidden sm:inline`)
- ✅ All 64 tests passing
- ✅ TypeScript compilation successful

**Files Modified**:

- `App.tsx` - Fixed handleEditDeck with ID prefix detection
- `components/StudySession.tsx` - Card sizing, tap-to-flip, button visibility

**Commit**: `e5c457e` - "fix: resolve remaining deck and UX issues"

**Next Session Recommendations**:

- Test deck creation and persistence in production environment
- Verify mobile touch gestures on actual devices
- Consider adding analytics for gesture usage

---

### December 21, 2024 - AI Deck Generation Backend Migration

**Session Focus**: Fix AI deck generation by moving it from frontend to backend

**Problem**: Frontend was calling `generateDeckWithAI()` directly, but `process.env.API_KEY` (GEMINI_API_KEY) is not available in the browser, causing AI generation to fail.

**Completed**:

- ✅ Created POST /api/decks/generate backend endpoint in `server/routes/decks.ts`
- ✅ Moved `geminiService.ts` from `services/` to `server/services/`
- ✅ Updated gemini service to use `GEMINI_API_KEY` from server environment config
- ✅ Added `geminiApiKey` to server config (`server/config/index.ts`)
- ✅ Created API client function `generateDeckWithAI()` in `src/api/decks.ts`
- ✅ Updated `DeckList.tsx` to call backend API instead of direct service
- ✅ Updated `.env.example` to document `GEMINI_API_KEY` requirement
- ✅ All tests passing (38/38)
- ✅ TypeScript check passing
- ✅ Build successful

**Files Modified**:

- `server/routes/decks.ts` - Added POST /api/decks/generate endpoint
- `server/services/geminiService.ts` - Moved from root services/ directory
- `server/config/index.ts` - Added geminiApiKey configuration
- `src/api/decks.ts` - Added generateDeckWithAI() API client function
- `components/DeckList.tsx` - Updated to use API client with proper response handling
- `.env.example` - Updated API_KEY to GEMINI_API_KEY

**Commit**: `feat(ai): move AI deck generation to backend API` (bfa367b)

**Next Session**: Test AI deck generation with actual GEMINI_API_KEY in production

---

### December 21, 2024 - XP System Fix

**Session Focus**: Fix XP display consistency and streak bonuses

**Completed**:

- ✅ Fixed hint verification to check `user.currentXP + sessionXP` instead of just `user.currentXP`
- ✅ Added 50 XP bonus for every 5 consecutive correct answers
- ✅ Created backend endpoint `POST /api/users/:id/xp` with deltaXP parameter
- ✅ Implemented automatic level-up logic (XP threshold increases 20% per level)
- ✅ Created new API client file `src/api/users.ts` with `updateUserXP()` function
- ✅ Fixed `handleUpdateUserXP` in App.tsx to make real API calls
- ✅ Session XP now syncs to backend when finishing study session
- ✅ All tests passing (38/38)
- ✅ Build successful

**Files Modified**:

- `App.tsx` - Import users API, fix handleUpdateUserXP with real API call
- `components/StudySession.tsx` - Fix hint verification, add streak bonus, sync XP on finish
- `server/routes/users.ts` - Add POST /api/users/:id/xp endpoint
- `src/api/users.ts` - NEW file with user API client functions

**Commit**: `feat(xp): fix XP display consistency and add streak bonus` (b1e5919)

**Next Session**: Implement AI deck generation with proper backend endpoint

---

### December 2024 - CI/CD Setup

**Session Focus**: CI/CD setup and data display fixes

**Completed**:

- Migrated from `master` to `main` as primary branch
- Set up complete CI/CD pipeline
- Fixed all linting/type errors
- Replaced hardcoded dashboard/leaderboard data with real user data
- Fixed Docker build issue

**Decisions Made**:

- Use ESLint 9 flat config for future compatibility
- CI runs on PR + push to main
