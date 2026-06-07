/**
 * MT — Reviews Controller
 * FR-09: Рейтинг 1–5 звёзд и текстовый отзыв после завершения рейса
 * FR-10: Автоматическая блокировка при рейтинге < 2.0
 */

const db = require('../db/connection');

const BLOCK_RATING_THRESHOLD = 2.0;
const MIN_REVIEWS_FOR_BLOCK  = 3; // Блокируем только если отзывов достаточно

// GET /api/v1/reviews/:userId
async function getUserReviews(req, res) {
  try {
    const { userId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const [reviews] = await db.execute(
      `SELECT r.*, u.name AS author_name, u.role AS author_role
       FROM reviews r
       JOIN Users u ON u.id = r.author_id
       WHERE r.target_user_id = ?
       ORDER BY r.created_at DESC
       LIMIT ${parseInt(limit)|0} OFFSET ${parseInt(offset)|0}`,
      [userId]
    );

    const [[stats]] = await db.execute(
      `SELECT
         COUNT(*)                   AS total,
         ROUND(AVG(rating), 2)      AS avg_rating,
         SUM(rating = 5)            AS five_star,
         SUM(rating = 4)            AS four_star,
         SUM(rating = 3)            AS three_star,
         SUM(rating = 2)            AS two_star,
         SUM(rating = 1)            AS one_star
       FROM reviews WHERE target_user_id = ?`,
      [userId]
    );

    res.json({ reviews, stats });
  } catch (err) {
    console.error('[Reviews] getUserReviews:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

// POST /api/v1/reviews
async function createReview(req, res) {
  try {
    const authorId = req.user.id;
    const { target_user_id, load_id, rating, text } = req.body;

    if (!target_user_id || !rating) {
      return res.status(400).json({ error: 'Укажите получателя отзыва и оценку' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Оценка должна быть от 1 до 5' });
    }
    if (authorId === Number(target_user_id)) {
      return res.status(400).json({ error: 'Нельзя оценить самого себя' });
    }

    // Проверяем что есть совместный завершённый рейс
    if (load_id) {
      const [[load]] = await db.execute(
        `SELECT id FROM loads
         WHERE id = ? AND status IN ('Доставлен','Оплачен','Архив')
           AND (driver_id = ? OR dispatcher_id = ? OR driver_id = ? OR dispatcher_id = ?)`,
        [load_id, authorId, authorId, target_user_id, target_user_id]
      );
      if (!load) {
        return res.status(403).json({ error: 'Отзыв можно оставить только по завершённому рейсу' });
      }
    }

    // Upsert (один отзыв автора на одного получателя)
    const [result] = await db.execute(
      `INSERT INTO reviews (author_id, target_user_id, rating, text)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE rating = VALUES(rating), text = VALUES(text)`,
      [authorId, target_user_id, rating, text || null]
    );

    // Пересчитываем средний рейтинг и проверяем порог блокировки
    await checkAndApplyBlacklist(target_user_id);

    // Уведомляем получателя
    try {
      await db.execute(
        `INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id)
         VALUES (?, 'review_new', 'Новый отзыв', ?, 'user', ?)`,
        [target_user_id,
         `Вам оставили отзыв: ${rating} ★${text ? ` — "${text.substring(0, 60)}"` : ''}`,
         authorId]
      );
    } catch {}

    const [[created]] = await db.execute(
      'SELECT r.*, u.name AS author_name FROM reviews r JOIN Users u ON u.id = r.author_id WHERE r.author_id = ? AND r.target_user_id = ?',
      [authorId, target_user_id]
    );

    res.status(201).json(created);
  } catch (err) {
    console.error('[Reviews] createReview:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

// DELETE /api/v1/reviews/:id
async function deleteReview(req, res) {
  try {
    const [[review]] = await db.execute('SELECT author_id, target_user_id FROM reviews WHERE id = ?', [req.params.id]);
    if (!review) return res.status(404).json({ error: 'Отзыв не найден' });

    const isOwner = review.author_id === req.user.id;
    const isAdmin = ['admin', 'dispatcher'].includes(req.user.role);
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Нет прав' });

    await db.execute('DELETE FROM reviews WHERE id = ?', [req.params.id]);
    await checkAndApplyBlacklist(review.target_user_id);

    res.json({ success: true });
  } catch (err) {
    console.error('[Reviews] deleteReview:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

// ── Внутренняя: проверка рейтинга и блокировка (FR-10) ───────────────────────
async function checkAndApplyBlacklist(userId) {
  try {
    const [[stats]] = await db.execute(
      'SELECT COUNT(*) AS total, ROUND(AVG(rating), 2) AS avg FROM reviews WHERE target_user_id = ?',
      [userId]
    );

    if (stats.total >= MIN_REVIEWS_FOR_BLOCK && stats.avg < BLOCK_RATING_THRESHOLD) {
      await db.execute(
        `UPDATE Users SET verified = -1 WHERE id = ? AND verified != -1`,
        [userId]
      );
      await db.execute(
        `INSERT INTO notifications (user_id, type, title, message)
         VALUES (?, 'account_blocked', 'Аккаунт заблокирован',
           'Ваш аккаунт заблокирован системой из-за низкого рейтинга (< 2.0). Обратитесь к администратору.')
         ON DUPLICATE KEY UPDATE created_at = NOW()`,
        [userId]
      );
    }
  } catch (err) {
    console.warn('[Reviews] checkAndApplyBlacklist:', err.message);
  }
}

module.exports = { getUserReviews, createReview, deleteReview };
