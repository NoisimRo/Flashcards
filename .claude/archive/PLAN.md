# Fix Plan: Daily Challenges Not Counting Active Sessions

## Problem Statement

After commit 6757e03 (which fixed time tracking for session completion), daily challenges show correct progress including active sessions, but the claim-reward endpoint fails to recognize completion because it only counts completed sessions.

## Root Causes

### 1. Cards Challenge Claim Issue

**File**: `server/routes/dailyChallenges.ts` (lines 194-205)
**Problem**: Only queries `correct_count` which is NULL for active sessions

```javascript
// CURRENT (BROKEN)
const sessionsResult = await query(
  'SELECT correct_count FROM study_sessions WHERE user_id = $1 AND DATE(started_at) = $2',
  [userId, today]
);
let totalCorrectAnswers = 0;
for (const session of sessionsResult.rows) {
  totalCorrectAnswers += session.correct_count || 0; // Active sessions have NULL correct_count!
}
```

**Solution**: Match the logic from `/today` endpoint - include `answers` column and count from JSON for active sessions

### 2. Time Challenge Claim Issue

**File**: `server/routes/dailyChallenges.ts` (lines 206-217)
**Problem**: Should work since `duration_seconds` is updated during auto-save, but needs verification
**Solution**: Ensure it works correctly, potentially no change needed

### 3. Dashboard Statistics Accuracy

**File**: `src/components/pages/Dashboard/Dashboard.tsx`
**Problem**: Dashboard shows stats from `user` object (only updated on session completion) which may be stale if there are active sessions
**Solution**: The daily challenges section already includes active sessions correctly. The time tile and other stats come from the user object which is the source of truth for lifetime stats. Active sessions contribute to daily challenges but not to lifetime stats until completed - this is correct behavior.

## Changes Required

### Change 1: Fix Cards Challenge Claim Logic

**File**: `server/routes/dailyChallenges.ts`
**Lines**: 194-205

**Before**:

```javascript
if (challengeId === 'cards') {
  const sessionsResult = await query(
    'SELECT correct_count FROM study_sessions WHERE user_id = $1 AND DATE(started_at) = $2',
    [userId, today]
  );
  let totalCorrectAnswers = 0;
  for (const session of sessionsResult.rows) {
    totalCorrectAnswers += session.correct_count || 0;
  }
  isCompleted = totalCorrectAnswers >= challenge.cards_target;
  rewardXP = 50;
}
```

**After**:

```javascript
if (challengeId === 'cards') {
  // CRITICAL FIX: Include both completed AND active sessions (match /today logic)
  const sessionsResult = await query(
    'SELECT status, correct_count, answers FROM study_sessions WHERE user_id = $1 AND DATE(started_at) = $2',
    [userId, today]
  );
  let totalCorrectAnswers = 0;
  for (const session of sessionsResult.rows) {
    if (session.status === 'completed') {
      // Completed sessions have correct_count populated
      totalCorrectAnswers += session.correct_count || 0;
    } else {
      // Active sessions: count correct answers from answers JSON
      const answers = session.answers || {};
      const correctInSession = Object.values(answers).filter(
        (answer: any) => answer === 'correct'
      ).length;
      totalCorrectAnswers += correctInSession;
    }
  }
  isCompleted = totalCorrectAnswers >= challenge.cards_target;
  rewardXP = 50;
}
```

### Change 2: Verify Time Challenge Works

**File**: `server/routes/dailyChallenges.ts`
**Lines**: 206-217

Current code should work since `duration_seconds` is updated during auto-save. Verify this is correct.

### Change 3: Verify Streak Challenge Works

**File**: `server/routes/dailyChallenges.ts`
**Lines**: 218-223

Verify that the streak challenge claim logic correctly checks today's activity. The `/today` endpoint correctly includes active sessions in the streak check (lines 122-126), but the claim endpoint only checks the user's current streak value, which might not be updated until session completion.

**Current**:

```javascript
} else if (challengeId === 'streak') {
  const userResult = await query('SELECT streak FROM users WHERE id = $1', [userId]);
  const currentStreak = userResult.rows[0]?.streak || 0;
  isCompleted = currentStreak >= 1;
  rewardXP = 100;
}
```

**Issue**: The user's streak is only updated when a session is completed (studySessions.ts lines 792-802). But the daily challenge might show as complete (based on today's activity) before the user completes any sessions.

**Solution**: Match the `/today` logic - check if TODAY's activity meets the streak requirement:

```javascript
} else if (challengeId === 'streak') {
  // CRITICAL FIX: Check if TODAY's activity meets streak conditions (match /today logic)
  // Streak is maintained if: time >= 10 minutes OR correct answers >= 20
  const sessionsResult = await query(
    'SELECT status, correct_count, duration_seconds, answers FROM study_sessions WHERE user_id = $1 AND DATE(started_at) = $2',
    [userId, today]
  );

  let totalCorrectAnswers = 0;
  let totalTimeMinutes = 0;

  for (const session of sessionsResult.rows) {
    if (session.status === 'completed') {
      totalCorrectAnswers += session.correct_count || 0;
    } else {
      const answers = session.answers || {};
      totalCorrectAnswers += Object.values(answers).filter(
        (answer: any) => answer === 'correct'
      ).length;
    }
    totalTimeMinutes += Math.floor((session.duration_seconds || 0) / 60);
  }

  isCompleted = totalTimeMinutes >= 10 || totalCorrectAnswers >= 20;
  rewardXP = 100;
}
```

## Testing Plan

1. **Test Cards Challenge**:
   - Start a session, answer 30+ cards correctly (don't complete)
   - Check daily challenges - should show 30/30 complete
   - Try to claim reward - should succeed (CURRENTLY FAILS)

2. **Test Time Challenge**:
   - Start a session, study for 20+ minutes with auto-save
   - Check daily challenges - should show 20/20 complete
   - Try to claim reward - should succeed

3. **Test Streak Challenge**:
   - Have an active session with 20+ correct answers OR 10+ minutes
   - Check daily challenges - should show complete
   - Try to claim reward - should succeed (CURRENTLY FAILS if user hasn't completed a session today)

4. **Test Dashboard**:
   - Have an active session with progress
   - Navigate to dashboard
   - Verify daily challenges show correct stats including active session
   - Verify lifetime stats (time tile, etc.) show stats from completed sessions only

5. **Test No Double Counting**:
   - Complete all cards in a session
   - Click "Salvează & Ieși" - session should remain active
   - Go back to session and click "Finalizează & Ieși" - session should complete
   - Verify stats are only counted once

## Impact

- **Positive**: Users can claim daily challenge rewards immediately when they meet the criteria, even with active sessions
- **Risk**: Low - we're making the claim logic consistent with the display logic
- **Backwards Compatibility**: No breaking changes, only fixing bugs

## Commit Message

```
fix(daily-challenges): include active sessions when claiming rewards

PROBLEM:
- Daily challenges show correct progress (including active sessions)
- But claim-reward fails because it only counts completed sessions
- Users see "30/30 cards complete" but can't claim the reward

ROOT CAUSE:
1. /today endpoint includes active sessions (correct_count + answers JSON)
2. /claim-reward only looks at correct_count (NULL for active sessions)
3. Inconsistency between display and claim validation

SOLUTION:
- Cards challenge: Include active session answers when validating
- Streak challenge: Check today's activity instead of user.streak
- Match the same logic used in /today endpoint

RESULT:
✅ Users can claim rewards immediately when criteria met
✅ No need to complete session before claiming
✅ Consistent behavior between display and claim
```
