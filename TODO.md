# TODO - Flashcards Development Roadmap

> Prioritized list of features, improvements, and technical debt items.
> Updated: December 2024

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

- [ ] **AI Deck Generation** - Fix and complete AI-powered deck creation
  - **CURRENT ISSUE**: Frontend calls `generateDeckWithAI()` directly, but `process.env.API_KEY` is not available in browser
  - **SOLUTION NEEDED**:
    - Create backend endpoint: `POST /api/decks/generate` that accepts subject, topic, difficulty
    - Move `services/geminiService.ts` logic to backend route handler
    - Use `GEMINI_API_KEY` from server environment variables
    - Create API client function in `src/api/decks.ts`
    - Update `DeckList.tsx` to call backend API instead of direct service
  - Files to modify:
    - `server/routes/decks.ts` - Add generate endpoint
    - `src/api/decks.ts` - Add `generateDeckWithAI()` API client
    - `components/DeckList.tsx` - Update to use API client
    - `services/geminiService.ts` - Move to server-side only or delete
  - Ensure `GEMINI_API_KEY` is set in `.env` and Cloud Run secrets

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
