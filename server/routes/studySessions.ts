import { Router, Request, Response } from 'express';
import { query, withTransaction } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { selectCardsForSession, calculateSM2Update } from '../services/cardSelectionService.js';

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
    correctOptionIndex: card.correct_option_index,
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
    const progressResult = await query(
      `SELECT * FROM user_card_progress
       WHERE user_id = $1 AND card_id = ANY($2::uuid[])`,
      [req.user!.id, cardsResult.rows.map((c: any) => c.id)]
    );

    // Select cards using service
    const { selectedCards, availableCount, masteredCount } = selectCardsForSession(
      cardsResult.rows,
      progressResult.rows,
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

    const sessionResult = await query(
      `INSERT INTO study_sessions
         (user_id, deck_id, title, selection_method, total_cards, selected_card_ids)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        req.user!.id,
        deckId,
        sessionTitle,
        selectionMethod,
        selectedCards.length,
        selectedCards.map((c: any) => c.id),
      ]
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
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Eroare la crearea sesiunii',
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
    const { currentCardIndex, answers, streak, sessionXP } = req.body;

    // Verify ownership
    const checkResult = await query('SELECT user_id FROM study_sessions WHERE id = $1', [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Sesiunea nu a fost găsită',
        },
      });
    }

    if (checkResult.rows[0].user_id !== req.user!.id) {
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

      if (cardProgressUpdates && Array.isArray(cardProgressUpdates)) {
        for (const update of cardProgressUpdates) {
          const { cardId, wasCorrect } = update;

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
            };
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
              cardsLearned++;
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
              cardsLearned++;
            }
          }
        }
      }

      // Update user stats
      const sessionXP = session.session_xp || 0;
      const durationMinutes = Math.floor((durationSeconds || 0) / 60);

      // Get current user stats for level-up calculation
      const userResult = await client.query(
        'SELECT level, current_xp, next_level_xp FROM users WHERE id = $1',
        [req.user!.id]
      );
      const currentUser = userResult.rows[0];

      // Calculate new XP and check for level up
      let newCurrentXP = (currentUser.current_xp || 0) + sessionXP;
      let newLevel = currentUser.level || 1;
      let newNextLevelXP = currentUser.next_level_xp || 100;
      let leveledUp = false;

      // Level up logic - keep leveling up until current_xp < next_level_xp
      while (newCurrentXP >= newNextLevelXP) {
        newCurrentXP -= newNextLevelXP;
        newLevel += 1;
        leveledUp = true;
        // Each level requires 20% more XP than previous (exponential growth)
        newNextLevelXP = Math.floor(newNextLevelXP * 1.2);
      }

      // Update user stats
      await client.query(
        `UPDATE users
         SET total_cards_learned = total_cards_learned + $1,
             total_decks_completed = total_decks_completed + 1,
             total_xp = total_xp + $2,
             current_xp = $3,
             level = $4,
             next_level_xp = $5,
             total_time_spent = total_time_spent + $6,
             updated_at = NOW()
         WHERE id = $7`,
        [
          cardsLearned,
          sessionXP,
          newCurrentXP,
          newLevel,
          newNextLevelXP,
          durationMinutes,
          req.user!.id,
        ]
      );

      return {
        session: updatedSession.rows[0],
        cardsLearned,
        sessionXP,
        leveledUp,
        oldLevel: currentUser.level,
        newLevel,
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
        newAchievements: [],
        streakUpdated: false,
        newStreak: 0,
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

export default router;
