import { Router, Request, Response } from 'express';
import { query, withTransaction } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { selectCardsForSession, calculateSM2Update } from '../services/cardSelectionService.js';
import { checkAndUnlockAchievements } from './achievements.js';
import { calculateStreakFromDailyProgress } from './auth.js';

const router = Router();

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatSession(session: any) {
  return {
    id: session.id,
    userId: session.user_id,
    deckId: session.deck_id,
    title: session.title,
    selectionMethod: session.selection_method,
    totalCards: session.total_cards,
    selectedCardIds: session.selected_card_ids,
    currentCardIndex: session.current_card_index,
    answers: session.answers || {},
    streak: session.streak,
    sessionXP: session.session_xp,
    status: session.status,
    startedAt: session.started_at,
    completedAt: session.completed_at,
    lastActivityAt: session.last_activity_at,
    durationSeconds: session.duration_seconds,
    score: session.score,
    correctCount: session.correct_count,
    incorrectCount: session.incorrect_count,
    skippedCount: session.skipped_count,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
  };
}

function formatCard(card: any) {
  return {
    id: card.id,
    deckId: card.deck_id,
    front: card.front,
    back: card.back,
    context: card.context,
    hint: card.hint,
    type: card.type,
    options: card.options,
    correctOptionIndices: card.correct_option_indices,
    position: card.position,
    createdAt: card.created_at,
    updatedAt: card.updated_at,
    createdBy: card.created_by,
  };
}

function formatCardProgress(progress: any) {
  return {
    id: progress.id,
    userId: progress.user_id,
    cardId: progress.card_id,
    status: progress.status,
    easeFactor: parseFloat(progress.ease_factor),
    interval: progress.interval,
    repetitions: progress.repetitions,
    nextReviewDate: progress.next_review_date,
    timesSeen: progress.times_seen,
    timesCorrect: progress.times_correct,
    timesIncorrect: progress.times_incorrect,
    lastReviewedAt: progress.last_reviewed_at,
    createdAt: progress.created_at,
    updatedAt: progress.updated_at,
  };
}

// ============================================
// POST /api/study-sessions - Create session
// ============================================
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      deckId,
      selectionMethod,
      cardCount,
      selectedCardIds,
      excludeMasteredCards = true,
      title,
    } = req.body;

    if (!deckId || !selectionMethod) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'deckId și selectionMethod sunt obligatorii',
        },
      });
    }

    // Validate selection method
    const validMethods = ['random', 'smart', 'manual', 'all'];
    if (!validMethods.includes(selectionMethod)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `selectionMethod invalid. Opțiuni: ${validMethods.join(', ')}`,
        },
      });
    }

    // Get all cards from deck
    const cardsResult = await query(
      `SELECT * FROM cards
       WHERE deck_id = $1 AND deleted_at IS NULL
       ORDER BY position ASC, created_at ASC`,
      [deckId]
    );

    if (cardsResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_CARDS',
          message: 'Deck-ul nu conține carduri',
        },
      });
    }

    // Get user's card progress
    const cardIds = cardsResult.rows.map((c: any) => c.id);
    const progressResult = await query(
      `SELECT * FROM user_card_progress
       WHERE user_id = $1 AND card_id = ANY($2)`,
      [req.user!.id, cardIds]
    );

    // Transform snake_case to camelCase for cardSelectionService
    const transformedProgress = progressResult.rows.map((p: any) => ({
      cardId: p.card_id,
      status: p.status,
      nextReviewDate: p.next_review_date,
      easeFactor: p.ease_factor,
      interval: p.interval,
      repetitions: p.repetitions,
    }));

    // Select cards using service
    const { selectedCards, availableCount, masteredCount } = selectCardsForSession(
      cardsResult.rows,
      transformedProgress,
      selectionMethod,
      { cardCount, selectedCardIds, excludeMastered: excludeMasteredCards }
    );

    if (selectedCards.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_CARDS_AVAILABLE',
          message: 'Nu există carduri disponibile pentru selecție',
        },
      });
    }

    // Create session
    const sessionTitle =
      title ||
      `${selectionMethod.charAt(0).toUpperCase() + selectionMethod.slice(1)} - ${selectedCards.length} carduri`;

    const selectedCardUuids = selectedCards.map((c: any) => c.id);
    const sessionResult = await query(
      `INSERT INTO study_sessions
         (user_id, deck_id, title, selection_method, total_cards, selected_card_ids)
       VALUES ($1, $2, $3, $4, $5, $6::uuid[])
       RETURNING *`,
      [req.user!.id, deckId, sessionTitle, selectionMethod, selectedCards.length, selectedCardUuids]
    );

    const session = formatSession(sessionResult.rows[0]);

    // Get deck info
    const deckResult = await query(
      `SELECT d.*, s.name as subject_name, s.color as subject_color
       FROM decks d
       LEFT JOIN subjects s ON d.subject_id = s.id
       WHERE d.id = $1`,
      [deckId]
    );

    // Build card progress map
    const cardProgressMap: Record<string, any> = {};
    progressResult.rows.forEach((p: any) => {
      cardProgressMap[p.card_id] = formatCardProgress(p);
    });

    res.json({
      success: true,
      data: {
        session: {
          ...session,
          deck: deckResult.rows[0]
            ? {
                id: deckResult.rows[0].id,
                title: deckResult.rows[0].title,
                subject: deckResult.rows[0].subject_id,
                subjectName: deckResult.rows[0].subject_name,
                difficulty: deckResult.rows[0].difficulty,
              }
            : null,
          cards: selectedCards.map(formatCard),
          cardProgress: cardProgressMap,
        },
        availableCards: availableCount,
        masteredCards: masteredCount,
      },
    });
  } catch (error) {
    console.error('Create session error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      deckId: req.body.deckId,
      selectionMethod: req.body.selectionMethod,
      userId: req.user?.id,
      cardCount: req.body.cardCount,
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Eroare la crearea sesiunii',
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? error.message : 'Unknown error',
        }),
      },
    });
  }
});

// ============================================
// GET /api/study-sessions - List sessions
// ============================================
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { status = 'active', deckId, limit = '50', offset = '0' } = req.query;

    let whereClause = 'user_id = $1';
    const params: any[] = [req.user!.id];
    let paramIndex = 2;

    if (status !== 'all') {
      whereClause += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    if (deckId) {
      whereClause += ` AND deck_id = $${paramIndex++}`;
      params.push(deckId);
    }

    const sessionsResult = await query(
      `SELECT s.*,
              d.title as deck_title,
              d.subject_id,
              d.topic as deck_topic,
              sub.name as subject_name
       FROM study_sessions s
       LEFT JOIN decks d ON s.deck_id = d.id
       LEFT JOIN subjects sub ON d.subject_id = sub.id
       WHERE ${whereClause}
       ORDER BY s.last_activity_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, parseInt(limit as string), parseInt(offset as string)]
    );

    const sessions = sessionsResult.rows.map(row => ({
      ...formatSession(row),
      deck: row.deck_title
        ? {
            id: row.deck_id,
            title: row.deck_title,
            subject: row.subject_id,
            subjectName: row.subject_name,
            topic: row.deck_topic,
          }
        : null,
    }));

    res.json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    console.error('List sessions error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Eroare la obținerea sesiunilor',
      },
    });
  }
});

// ============================================
// GET /api/study-sessions/:id - Get session
// ============================================
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const sessionResult = await query(
      `SELECT s.*,
              d.title as deck_title,
              d.subject_id,
              d.difficulty,
              sub.name as subject_name
       FROM study_sessions s
       LEFT JOIN decks d ON s.deck_id = d.id
       LEFT JOIN subjects sub ON d.subject_id = sub.id
       WHERE s.id = $1 AND s.user_id = $2`,
      [id, req.user!.id]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Sesiunea nu a fost găsită',
        },
      });
    }

    const sessionRow = sessionResult.rows[0];
    const session = formatSession(sessionRow);

    // Get cards
    const cardsResult = await query(
      `SELECT * FROM cards
       WHERE id = ANY($1::uuid[])
       ORDER BY position ASC`,
      [session.selectedCardIds]
    );

    // Get card progress
    const progressResult = await query(
      `SELECT * FROM user_card_progress
       WHERE user_id = $1 AND card_id = ANY($2::uuid[])`,
      [req.user!.id, session.selectedCardIds]
    );

    const cardProgressMap: Record<string, any> = {};
    progressResult.rows.forEach((p: any) => {
      cardProgressMap[p.card_id] = formatCardProgress(p);
    });

    res.json({
      success: true,
      data: {
        ...session,
        deck: sessionRow.deck_title
          ? {
              id: sessionRow.deck_id,
              title: sessionRow.deck_title,
              subject: sessionRow.subject_id,
              subjectName: sessionRow.subject_name,
              difficulty: sessionRow.difficulty,
            }
          : null,
        cards: cardsResult.rows.map(formatCard),
        cardProgress: cardProgressMap,
      },
    });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Eroare la obținerea sesiunii',
      },
    });
  }
});

// ============================================
// PUT /api/study-sessions/:id - Update progress
// ============================================
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { currentCardIndex, answers, streak, sessionXP, durationSeconds } = req.body;

    // Get current session to calculate incremental changes
    const sessionResult = await query(
      'SELECT user_id, duration_seconds, answers, session_xp FROM study_sessions WHERE id = $1',
      [id]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Sesiunea nu a fost găsită',
        },
      });
    }

    const session = sessionResult.rows[0];

    if (session.user_id !== req.user!.id) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Nu ai permisiunea să modifici această sesiune',
        },
      });
    }

    // Update session
    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (currentCardIndex !== undefined) {
      updateFields.push(`current_card_index = $${paramIndex++}`);
      params.push(currentCardIndex);
    }

    // Calculate new answers since last save (hoisted for use in daily tracking below)
    let newCorrectAnswers = 0;
    let newTotalAnswers = 0;

    // Handle incremental answer tracking for success rate
    if (answers !== undefined) {
      updateFields.push(`answers = $${paramIndex++}`);
      params.push(JSON.stringify(answers));

      const oldAnswers = session.answers || {};
      const newAnswers = answers;

      // Find answers that are new or changed
      for (const [cardId, answer] of Object.entries(newAnswers)) {
        if (oldAnswers[cardId] !== answer) {
          // This is a new or changed answer
          newTotalAnswers++;
          if (answer === 'correct') {
            newCorrectAnswers++;
          }
        }
      }

      // Update user's success rate stats incrementally
      if (newTotalAnswers > 0) {
        await query(
          `UPDATE users
           SET total_correct_answers = total_correct_answers + $1,
               total_answers = total_answers + $2,
               updated_at = NOW()
           WHERE id = $3`,
          [newCorrectAnswers, newTotalAnswers, req.user!.id]
        );
      }
    }

    if (streak !== undefined) {
      updateFields.push(`streak = $${paramIndex++}`);
      params.push(streak);
    }

    if (sessionXP !== undefined) {
      updateFields.push(`session_xp = $${paramIndex++}`);
      params.push(sessionXP);

      // Get current session XP to calculate incremental XP
      const oldSessionXP = session.session_xp || 0;
      const incrementalXP = Math.max(0, sessionXP - oldSessionXP);

      // Update user's XP incrementally (only new XP earned since last save)
      if (incrementalXP > 0) {
        const userResult = await query(
          'SELECT total_xp, current_xp, level FROM users WHERE id = $1',
          [req.user!.id]
        );

        if (userResult.rows.length > 0) {
          const user = userResult.rows[0];
          const newTotalXP = user.total_xp + incrementalXP;
          const newCurrentXP = user.current_xp + incrementalXP;

          // Calculate XP needed for next level (exponential growth: 20% per level)
          const calculateXPForLevel = (level: number) => {
            return Math.floor(100 * Math.pow(1.2, level - 1));
          };

          let newLevel = user.level;
          let currentXP = newCurrentXP;

          // Check for level up
          while (currentXP >= calculateXPForLevel(newLevel + 1)) {
            currentXP -= calculateXPForLevel(newLevel + 1);
            newLevel++;
          }

          // Update user with new XP and possibly new level
          await query(
            `UPDATE users
             SET total_xp = $1,
                 current_xp = $2,
                 level = $3,
                 updated_at = NOW()
             WHERE id = $4`,
            [newTotalXP, currentXP, newLevel, req.user!.id]
          );
        }
      }
    }

    // Track duration and update daily progress incrementally
    const oldDuration = session.duration_seconds || 0;
    const newDuration = durationSeconds !== undefined ? durationSeconds : oldDuration;

    if (durationSeconds !== undefined) {
      updateFields.push(`duration_seconds = $${paramIndex++}`);
      params.push(durationSeconds);
    }

    updateFields.push(`last_activity_at = NOW()`);

    params.push(id);

    const result = await query(
      `UPDATE study_sessions
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      params
    );

    // --- Incremental daily_progress and daily_challenges updates ---
    // Compute deltas for time and correct answers since last auto-save
    // IMPORTANT: Store time in SECONDS (not minutes) to avoid rounding loss.
    // Auto-saves happen every ~30s, so Math.floor(30/60) = 0 would lose all time.
    // Convert to minutes only when reading in GET endpoints.
    const timeDeltaSeconds = Math.max(0, newDuration - oldDuration);

    // newCorrectAnswers and newTotalAnswers were computed above
    // They represent the delta of answers since last save
    const correctDelta = answers !== undefined ? newCorrectAnswers : 0;

    const today = new Date().toISOString().split('T')[0];

    if (timeDeltaSeconds > 0 || correctDelta > 0) {
      // Update daily_progress incrementally (time_spent_minutes stores SECONDS for granularity)
      await query(
        `INSERT INTO daily_progress
           (user_id, date, cards_studied, time_spent_minutes)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, date)
         DO UPDATE SET
           cards_studied = daily_progress.cards_studied + $3,
           time_spent_minutes = daily_progress.time_spent_minutes + $4`,
        [req.user!.id, today, correctDelta, timeDeltaSeconds]
      );

      // Update daily_challenges incrementally (time_studied_today stores SECONDS)
      await query(
        `UPDATE daily_challenges
         SET cards_learned_today = cards_learned_today + $1,
             time_studied_today = time_studied_today + $2,
             updated_at = NOW()
         WHERE user_id = $3 AND date = $4`,
        [correctDelta, timeDeltaSeconds, req.user!.id, today]
      );
    }

    res.json({
      success: true,
      data: formatSession(result.rows[0]),
    });
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Eroare la actualizarea sesiunii',
      },
    });
  }
});

// ============================================
// POST /api/study-sessions/:id/complete - Complete session
// ============================================
router.post('/:id/complete', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      score,
      correctCount,
      incorrectCount,
      skippedCount,
      durationSeconds,
      cardProgressUpdates,
    } = req.body;

    const result = await withTransaction(async client => {
      // Verify ownership
      const sessionResult = await client.query(
        'SELECT * FROM study_sessions WHERE id = $1 AND user_id = $2',
        [id, req.user!.id]
      );

      if (sessionResult.rows.length === 0) {
        throw new Error('NOT_FOUND');
      }

      const session = sessionResult.rows[0];

      if (session.status === 'completed') {
        throw new Error('ALREADY_COMPLETED');
      }

      // Calculate the DELTA of time and correct answers since last auto-save
      // PUT auto-saves already wrote incremental data to daily_progress/daily_challenges,
      // so we only add what's new since the last auto-save.
      const lastSavedDuration = session.duration_seconds || 0;
      const finalDuration = durationSeconds || 0;
      const timeDeltaSeconds = Math.max(0, finalDuration - lastSavedDuration);

      // Total minutes for user stats (full session duration, not delta)
      const totalMinutes = Math.floor(finalDuration / 60);

      // Calculate correct answers delta: final correct_count minus what PUT already tracked
      const lastSavedAnswers = session.answers || {};
      const lastSavedCorrectCount = Object.values(lastSavedAnswers).filter(
        (a: any) => a === 'correct'
      ).length;
      const correctDelta = Math.max(0, (correctCount || 0) - lastSavedCorrectCount);

      // Update session
      const updatedSession = await client.query(
        `UPDATE study_sessions
         SET status = 'completed',
             completed_at = NOW(),
             duration_seconds = $1,
             score = $2,
             correct_count = $3,
             incorrect_count = $4,
             skipped_count = $5,
             last_activity_at = NOW()
         WHERE id = $6
         RETURNING *`,
        [durationSeconds, score, correctCount, incorrectCount, skippedCount, id]
      );

      // Update card progress for each card
      let cardsLearned = 0;
      let cardsMastered = 0;
      let totalAnswersInSession = 0;
      let correctAnswersInSession = 0;

      if (cardProgressUpdates && Array.isArray(cardProgressUpdates)) {
        for (const update of cardProgressUpdates) {
          const { cardId, wasCorrect } = update;

          // Track total answers and correct answers for success rate calculation
          // Note: We only count these for card progress updates, as the incremental
          // answer tracking in PUT endpoint already handles real-time updates
          totalAnswersInSession++;
          if (wasCorrect) {
            correctAnswersInSession++;
          }

          // Get existing progress or create default
          const existingProgress = await client.query(
            'SELECT * FROM user_card_progress WHERE user_id = $1 AND card_id = $2',
            [req.user!.id, cardId]
          );

          let currentProgress;
          if (existingProgress.rows.length > 0) {
            currentProgress = existingProgress.rows[0];
          } else {
            currentProgress = {
              ease_factor: 2.5,
              interval: 0,
              repetitions: 0,
              times_correct: 0,
            };
          }

          // Count cards learned (FIRST TIME answering correctly)
          // Only increment if:
          // 1. Card is new (no existing progress), OR
          // 2. Card exists but never answered correctly before (times_correct = 0)
          if (wasCorrect) {
            if (existingProgress.rows.length === 0 || currentProgress.times_correct === 0) {
              cardsLearned++;
            }
          }

          // Calculate new values using SM-2
          const quality = wasCorrect ? 4 : 2; // Simple mapping: correct=4, incorrect=2
          const sm2Update = calculateSM2Update(
            {
              easeFactor: parseFloat(currentProgress.ease_factor),
              interval: currentProgress.interval,
              repetitions: currentProgress.repetitions,
            },
            quality
          );

          // Update or insert
          if (existingProgress.rows.length > 0) {
            await client.query(
              `UPDATE user_card_progress
               SET status = $1,
                   ease_factor = $2,
                   interval = $3,
                   repetitions = $4,
                   next_review_date = $5,
                   times_seen = times_seen + 1,
                   times_correct = times_correct + $6,
                   times_incorrect = times_incorrect + $7,
                   last_reviewed_at = NOW(),
                   updated_at = NOW()
               WHERE id = $8`,
              [
                sm2Update.status,
                sm2Update.easeFactor,
                sm2Update.interval,
                sm2Update.repetitions,
                sm2Update.nextReviewDate,
                wasCorrect ? 1 : 0,
                wasCorrect ? 0 : 1,
                existingProgress.rows[0].id,
              ]
            );

            if (sm2Update.status === 'mastered' && currentProgress.status !== 'mastered') {
              cardsMastered++;
            }
          } else {
            await client.query(
              `INSERT INTO user_card_progress
                 (user_id, card_id, status, ease_factor, interval, repetitions, next_review_date,
                  times_seen, times_correct, times_incorrect, last_reviewed_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, 1, $8, $9, NOW())`,
              [
                req.user!.id,
                cardId,
                sm2Update.status,
                sm2Update.easeFactor,
                sm2Update.interval,
                sm2Update.repetitions,
                sm2Update.nextReviewDate,
                wasCorrect ? 1 : 0,
                wasCorrect ? 0 : 1,
              ]
            );

            if (sm2Update.status === 'mastered') {
              cardsMastered++;
            }
          }
        }
      }

      // XP was already incrementally applied to users.total_xp and users.current_xp
      // by the PUT auto-save endpoint. Do NOT add sessionXP again here to avoid double-counting.
      // We still record the full session XP in daily_progress.xp_earned (PUT doesn't write there).
      const fullSessionXP = session.session_xp || 0;

      // Get current user stats (already includes all auto-saved XP)
      const userResult = await client.query(
        'SELECT level, current_xp, next_level_xp FROM users WHERE id = $1',
        [req.user!.id]
      );
      const currentUser = userResult.rows[0];

      // Read current level state (already correct from PUT auto-saves)
      const newLevel = currentUser.level || 1;
      const newCurrentXP = currentUser.current_xp || 0;
      const newNextLevelXP = currentUser.next_level_xp || 100;

      // Update user stats WITHOUT adding XP again (PUT already applied it)
      await client.query(
        `UPDATE users
         SET total_cards_learned = total_cards_learned + $1,
             total_decks_completed = total_decks_completed + 1,
             total_time_spent = total_time_spent + $2,
             updated_at = NOW()
         WHERE id = $3`,
        [cardsLearned, totalMinutes, req.user!.id]
      );

      // Update daily progress with DELTAS (PUT auto-save already tracked time/cards incrementally)
      // Here we add: final time delta, cards_learned (SM-2), xp_earned, sessions_completed
      // Also add correctDelta to cards_studied for the final answers not yet tracked by PUT
      // NOTE: time_spent_minutes stores SECONDS for granularity (converted to minutes on read)
      const today = new Date().toISOString().split('T')[0];
      await client.query(
        `INSERT INTO daily_progress
           (user_id, date, cards_studied, cards_learned, time_spent_minutes, xp_earned, sessions_completed)
         VALUES ($1, $2, $3, $4, $5, $6, 1)
         ON CONFLICT (user_id, date)
         DO UPDATE SET
           cards_studied = daily_progress.cards_studied + $3,
           cards_learned = daily_progress.cards_learned + $4,
           time_spent_minutes = daily_progress.time_spent_minutes + $5,
           xp_earned = daily_progress.xp_earned + $6,
           sessions_completed = daily_progress.sessions_completed + 1`,
        [req.user!.id, today, correctDelta, cardsLearned, timeDeltaSeconds, fullSessionXP]
      );

      // Update daily_challenges with final deltas (time_studied_today stores SECONDS)
      await client.query(
        `UPDATE daily_challenges
         SET cards_learned_today = cards_learned_today + $1,
             time_studied_today = time_studied_today + $2,
             updated_at = NOW()
         WHERE user_id = $3 AND date = $4`,
        [correctDelta, timeDeltaSeconds, req.user!.id, today]
      );

      // Check and unlock achievements (pass session context for session-specific conditions)
      const completedAtHour = new Date().getHours();
      const newAchievements = await checkAndUnlockAchievements(client, req.user!.id, {
        correctCount: correctCount || 0,
        durationSeconds: finalDuration,
        totalCards: session.total_cards,
        completedAtHour,
        score: score || 0,
        sessionXP: fullSessionXP,
      });

      // CRITICAL FIX: Recalculate streak from daily_progress after session completion
      const { currentStreak, longestStreak } = await calculateStreakFromDailyProgress(req.user!.id);

      // Update user's streak
      await client.query(
        `UPDATE users
         SET streak = $1,
             longest_streak = $2
         WHERE id = $3`,
        [currentStreak, longestStreak, req.user!.id]
      );

      return {
        session: updatedSession.rows[0],
        cardsLearned,
        sessionXP: fullSessionXP,
        leveledUp: false, // Level-ups happen in real-time via PUT auto-save
        oldLevel: currentUser.level,
        newLevel,
        newAchievements,
        newStreak: currentStreak,
        streakUpdated: true,
      };
    });

    res.json({
      success: true,
      data: {
        session: formatSession(result.session),
        xpEarned: result.sessionXP,
        leveledUp: result.leveledUp,
        oldLevel: result.oldLevel,
        newLevel: result.newLevel,
        newAchievements: result.newAchievements || [],
        streakUpdated: result.streakUpdated,
        newStreak: result.newStreak,
        cardsLearned: result.cardsLearned,
      },
    });
  } catch (error: any) {
    console.error('Complete session error:', error);

    if (error.message === 'NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Sesiunea nu a fost găsită',
        },
      });
    }

    if (error.message === 'ALREADY_COMPLETED') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_COMPLETED',
          message: 'Sesiunea a fost deja completată',
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Eroare la finalizarea sesiunii',
      },
    });
  }
});

// ============================================
// DELETE /api/study-sessions/:id - Abandon session
// ============================================
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE study_sessions
       SET status = 'abandoned',
           last_activity_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Sesiunea nu a fost găsită',
        },
      });
    }

    res.json({
      success: true,
      data: formatSession(result.rows[0]),
    });
  } catch (error) {
    console.error('Abandon session error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Eroare la abandonarea sesiunii',
      },
    });
  }
});

// ============================================
// GUEST SESSION ENDPOINTS
// ============================================

// ============================================
// POST /api/study-sessions/guest - Create guest session
// ============================================
router.post('/guest', async (req: Request, res: Response) => {
  try {
    const {
      deckId,
      guestToken,
      selectionMethod = 'all',
      cardCount,
      selectedCardIds,
      excludeMasteredCards = false,
      title,
    } = req.body;

    if (!deckId || !guestToken) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'deckId și guestToken sunt obligatorii',
        },
      });
    }

    // Validate guest token format (UUID v4)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(guestToken)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'guestToken invalid (trebuie să fie UUID v4)',
        },
      });
    }

    // Get all cards from deck
    const cardsResult = await query(
      `SELECT * FROM cards
       WHERE deck_id = $1 AND deleted_at IS NULL
       ORDER BY position ASC, created_at ASC`,
      [deckId]
    );

    if (cardsResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_CARDS',
          message: 'Deck-ul nu conține carduri',
        },
      });
    }

    // For guests, we don't filter by mastered cards (no progress tracked)
    // Just use simple selection method
    let selectedCards = cardsResult.rows;

    if (selectionMethod === 'random' && cardCount) {
      // Shuffle and take first N cards
      selectedCards = selectedCards
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(cardCount, selectedCards.length));
    } else if (selectionMethod === 'manual' && selectedCardIds) {
      selectedCards = selectedCards.filter((c: any) => selectedCardIds.includes(c.id));
    } else if (cardCount) {
      // Take first N cards
      selectedCards = selectedCards.slice(0, Math.min(cardCount, selectedCards.length));
    }

    if (selectedCards.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_CARDS_AVAILABLE',
          message: 'Nu există carduri disponibile pentru selecție',
        },
      });
    }

    // Create guest session
    const sessionTitle =
      title ||
      `Guest - ${selectionMethod.charAt(0).toUpperCase() + selectionMethod.slice(1)} - ${selectedCards.length} carduri`;

    const selectedCardUuids = selectedCards.map((c: any) => c.id);
    const sessionResult = await query(
      `INSERT INTO study_sessions
         (deck_id, title, selection_method, total_cards, selected_card_ids,
          guest_token, is_guest, status)
       VALUES ($1, $2, $3, $4, $5::uuid[], $6, true, 'active')
       RETURNING *`,
      [deckId, sessionTitle, selectionMethod, selectedCards.length, selectedCardUuids, guestToken]
    );

    const session = formatSession(sessionResult.rows[0]);

    // Get deck info
    const deckResult = await query(
      `SELECT d.*, s.name as subject_name, s.color as subject_color
       FROM decks d
       LEFT JOIN subjects s ON d.subject_id = s.id
       WHERE d.id = $1`,
      [deckId]
    );

    res.json({
      success: true,
      data: {
        session: {
          ...session,
          guestToken,
          isGuest: true,
          deck: deckResult.rows[0]
            ? {
                id: deckResult.rows[0].id,
                title: deckResult.rows[0].title,
                subject: deckResult.rows[0].subject_id,
                subjectName: deckResult.rows[0].subject_name,
                difficulty: deckResult.rows[0].difficulty,
              }
            : null,
          cards: selectedCards.map(formatCard),
          cardProgress: {}, // No progress for guests
        },
      },
    });
  } catch (error) {
    console.error('Create guest session error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Eroare la crearea sesiunii guest',
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? error.message : 'Unknown error',
        }),
      },
    });
  }
});

// ============================================
// PUT /api/study-sessions/guest/:id - Update guest session progress
// ============================================
router.put('/guest/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { guestToken, currentCardIndex, answers, streak, sessionXP, durationSeconds } = req.body;

    if (!guestToken) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'guestToken este obligatoriu',
        },
      });
    }

    // Verify session exists and belongs to guest token
    const sessionResult = await query(
      `SELECT * FROM study_sessions
       WHERE id = $1 AND guest_token = $2 AND is_guest = true`,
      [id, guestToken]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Sesiunea nu a fost găsită sau guest token-ul este invalid',
        },
      });
    }

    // Update session
    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (currentCardIndex !== undefined) {
      updateFields.push(`current_card_index = $${paramIndex++}`);
      params.push(currentCardIndex);
    }

    if (answers !== undefined) {
      updateFields.push(`answers = $${paramIndex++}`);
      params.push(JSON.stringify(answers));
    }

    if (streak !== undefined) {
      updateFields.push(`streak = $${paramIndex++}`);
      params.push(streak);
    }

    if (sessionXP !== undefined) {
      updateFields.push(`session_xp = $${paramIndex++}`);
      params.push(sessionXP);
    }

    if (durationSeconds !== undefined) {
      updateFields.push(`duration_seconds = $${paramIndex++}`);
      params.push(durationSeconds);
    }

    updateFields.push(`last_activity_at = NOW()`);

    params.push(id);

    const result = await query(
      `UPDATE study_sessions
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      params
    );

    res.json({
      success: true,
      data: formatSession(result.rows[0]),
    });
  } catch (error) {
    console.error('Update guest session error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Eroare la actualizarea sesiunii guest',
      },
    });
  }
});

// ============================================
// GET /api/study-sessions/guest/:id - Get guest session
// ============================================
router.get('/guest/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { guestToken } = req.query;

    if (!guestToken) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'guestToken este obligatoriu',
        },
      });
    }

    const sessionResult = await query(
      `SELECT s.*,
              d.title as deck_title,
              d.subject_id,
              d.difficulty,
              sub.name as subject_name
       FROM study_sessions s
       LEFT JOIN decks d ON s.deck_id = d.id
       LEFT JOIN subjects sub ON d.subject_id = sub.id
       WHERE s.id = $1 AND s.guest_token = $2 AND s.is_guest = true`,
      [id, guestToken]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Sesiunea nu a fost găsită',
        },
      });
    }

    const sessionRow = sessionResult.rows[0];
    const session = formatSession(sessionRow);

    // Get cards
    const cardsResult = await query(
      `SELECT * FROM cards
       WHERE id = ANY($1::uuid[])
       ORDER BY position ASC`,
      [session.selectedCardIds]
    );

    res.json({
      success: true,
      data: {
        ...session,
        guestToken,
        isGuest: true,
        deck: sessionRow.deck_title
          ? {
              id: sessionRow.deck_id,
              title: sessionRow.deck_title,
              subject: sessionRow.subject_id,
              subjectName: sessionRow.subject_name,
              difficulty: sessionRow.difficulty,
            }
          : null,
        cards: cardsResult.rows.map(formatCard),
        cardProgress: {}, // No progress for guests
      },
    });
  } catch (error) {
    console.error('Get guest session error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Eroare la obținerea sesiunii',
      },
    });
  }
});

export default router;
