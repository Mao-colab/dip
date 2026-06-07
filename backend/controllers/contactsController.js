/**
 * MT — Контроллер контактов (Contacts)
 * FR-08: Рейтинг перевозчиков
 * FR-09: Чёрный список и верифицированные партнёры
 */

const db = require('../db/connection');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/contacts
// Мои контакты с фильтрами и рейтингом
// ─────────────────────────────────────────────────────────────────────────────
async function getContacts(req, res) {
  try {
    const { filter, search } = req.query;

    const where  = ['c.broker_id = ?'];
    const params = [req.user.id];

    if (filter === 'верифицированы') {
      where.push('u.verified = 1 AND c.blacklisted = 0');
    }
    if (filter === 'чс') {
      where.push('c.blacklisted = 1');
    }
    if (search) {
      where.push('u.name LIKE ?');
      params.push(`%${search}%`);
    }

    const [contacts] = await db.execute(
      `SELECT c.*, u.name, u.phone, u.email, u.role, u.verified, u.avatar_color,
              ROUND(AVG(r.rating), 2)  AS rating,
              COUNT(DISTINCT r.id)     AS reviews_count,
              MAX(l.id)                AS last_order_id,
              MAX(l.updated_at)        AS last_date
       FROM contacts c
       JOIN users u ON c.contact_user_id = u.id
       LEFT JOIN reviews r ON r.target_user_id = u.id
       LEFT JOIN loads l ON (l.driver_id = u.id OR l.dispatcher_id = u.id)
       WHERE ${where.join(' AND ')}
       GROUP BY c.id
       ORDER BY u.name ASC`,
      params
    );

    res.json({ contacts });
  } catch (err) {
    console.error('[Contacts] getContacts error:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/contacts/:id/review
// Оставить отзыв о пользователе (1–5 звёзд)
// ─────────────────────────────────────────────────────────────────────────────
async function leaveReview(req, res) {
  try {
    const { rating, text } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Рейтинг должен быть от 1 до 5' });
    }

    await db.execute(
      `INSERT INTO reviews (author_id, target_user_id, rating, text, created_at)
       VALUES (?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE rating = VALUES(rating), text = VALUES(text), created_at = NOW()`,
      [req.user.id, req.params.id, rating, text || '']
    );

    res.json({ message: 'Отзыв сохранён' });
  } catch (err) {
    console.error('[Contacts] leaveReview error:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/contacts/:id/blacklist
// Добавить пользователя в чёрный список
// ─────────────────────────────────────────────────────────────────────────────
async function addToBlacklist(req, res) {
  try {
    await db.execute(
      'UPDATE contacts SET blacklisted = 1 WHERE broker_id = ? AND contact_user_id = ?',
      [req.user.id, req.params.id]
    );
    res.json({ message: 'Добавлен в чёрный список' });
  } catch (err) {
    console.error('[Contacts] addToBlacklist error:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/v1/contacts/:id/blacklist
// Убрать пользователя из чёрного списка
// ─────────────────────────────────────────────────────────────────────────────
async function removeFromBlacklist(req, res) {
  try {
    await db.execute(
      'UPDATE contacts SET blacklisted = 0 WHERE broker_id = ? AND contact_user_id = ?',
      [req.user.id, req.params.id]
    );
    res.json({ message: 'Удалён из чёрного списка' });
  } catch (err) {
    console.error('[Contacts] removeFromBlacklist error:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/contacts/catalog
// Каталог диспетчеров / перевозчиков с пагинацией
// ✅ ИСПРАВЛЕНО: фильтр по рейтингу вынесен в HAVING (нельзя использовать
//    агрегатную функцию AVG в WHERE — только в HAVING)
// ─────────────────────────────────────────────────────────────────────────────
async function getCatalog(req, res) {
  try {
    const { role = 'Диспетчер', rating_min, specialization, page = 1, limit = 24 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const where  = ['u.role = ?'];
    const params = [role];

    if (specialization) {
      where.push('u.specialization = ?');
      params.push(specialization);
    }

    // ✅ ИСПРАВЛЕНО: HAVING для агрегата — WHERE не поддерживает AVG()
    const having      = rating_min ? 'HAVING AVG(r.rating) >= ?' : '';
    const havingParam = rating_min ? [Number(rating_min)] : [];

    const [items] = await db.execute(
      `SELECT u.id, u.name, u.phone, u.email, u.role, u.verified,
              u.specialization, u.location, u.availability, u.dispatch_fee,
              u.avatar_color,
              ROUND(AVG(r.rating), 2) AS rating,
              COUNT(r.id)             AS reviews
       FROM users u
       LEFT JOIN reviews r ON r.target_user_id = u.id
       WHERE ${where.join(' AND ')}
       GROUP BY u.id
       ${having}
       ORDER BY AVG(r.rating) DESC
       LIMIT ${Number(limit)|0} OFFSET ${Number(offset)|0}`,
      [...params, ...havingParam]
    );

    res.json({ items, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error('[Contacts] getCatalog error:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

module.exports = { getContacts, leaveReview, addToBlacklist, removeFromBlacklist, getCatalog };