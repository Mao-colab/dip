const db = require('../db/connection');

// GET /api/v1/notifications
async function listNotifications(req, res) {
  try {
    const [rows] = await db.execute(
      `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    const [[{ unread }]] = await db.execute(
      'SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );
    res.json({ notifications: rows, unread });
  } catch (err) {
    console.error('[Notifications] list:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

// PATCH /api/v1/notifications/:id/read
async function markRead(req, res) {
  try {
    await db.execute(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[Notifications] markRead:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

// PATCH /api/v1/notifications/read-all
async function markAllRead(req, res) {
  try {
    await db.execute(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
      [req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[Notifications] markAllRead:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

// DELETE /api/v1/notifications/:id
async function deleteNotification(req, res) {
  try {
    await db.execute(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[Notifications] delete:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

// Утилита: создать уведомление (используется из других контроллеров)
async function createNotification(userId, type, title, message, entityType = null, entityId = null) {
  try {
    await db.execute(
      `INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, type, title, message, entityType, entityId]
    );
  } catch (err) {
    console.error('[Notifications] createNotification:', err.message);
  }
}

module.exports = { listNotifications, markRead, markAllRead, deleteNotification, createNotification };
