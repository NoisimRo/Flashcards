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

- [ ] **Consolidate component locations**
  - Move `/components/` into `/src/components/`
  - Update all imports
  - Single source of truth

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

- [ ] **Internationalization (i18n)**
  - Extract Romanian strings
  - Add English support
  - Language switcher

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
