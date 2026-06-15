/**
 * MT — Chat Controller
 * FR-07: Встроенный мессенджер брокер ↔ перевозчик
 */ // ✅ ИСПРАВЛЕНО: закрыт блочный комментарий (был незакрыт — SyntaxError)

const db = require('../db/connection');
const { broadcastChatMessage } = require('../sockets/chatSocket');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/chat/contacts
// Список контактов + последнее сообщение (левая панель мессенджера)
// ✅ ИСПРАВЛЕНО: подзапрос для корректного получения последнего сообщения
// ─────────────────────────────────────────────────────────────────────────────
exports.getContacts = async (req, res) => {
  const userId = req.user.id;

  try {
    const [rows] = await db.execute(
      `SELECT
         u.id,
         u.name,
         u.role,
         u.status,
         u.avatar_color,
         last_msg.text        AS last_message,
         last_msg.created_at  AS last_time,
         last_msg.sender_id,
         COUNT(unread.id)     AS unread_count
       FROM users u
       JOIN (
         -- ✅ Подзапрос: берём только последнее сообщение на пару (userId, u.id)
         SELECT m.*
         FROM messages m
         WHERE m.id = (
           SELECT MAX(m2.id)
           FROM messages m2
           WHERE (m2.sender_id = ? AND m2.receiver_id = m.receiver_id)
              OR (m2.receiver_id = ? AND m2.sender_id = m.sender_id)
         )
       ) last_msg ON (
         (last_msg.sender_id   = ? AND last_msg.receiver_id = u.id) OR
         (last_msg.receiver_id = ? AND last_msg.sender_id   = u.id)
       )
       LEFT JOIN messages unread ON (
         unread.receiver_id = ? AND
         unread.sender_id   = u.id AND
         unread.is_read     = 0
       )
       WHERE u.id != ?
       GROUP BY u.id, last_msg.id
       ORDER BY last_msg.created_at DESC`,
      [userId, userId, userId, userId, userId, userId]
    );

    return res.status(200).json(rows);
  } catch (err) {
    console.error('[Chat Contacts Error]', err);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/chat/user/:userId
// Прямые сообщения между текущим пользователем и userId
// ─────────────────────────────────────────────────────────────────────────────
exports.getDirectHistory = async (req, res) => {
  const { userId: otherId } = req.params;
  const myId = req.user.id;

  try {
    const [messages] = await db.execute(
      `SELECT m.id, m.text, m.type, m.created_at, m.sender_id, m.receiver_id,
              m.order_id, m.is_read, u.name AS sender_name, u.role AS sender_role
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE (m.sender_id = ? AND m.receiver_id = ?)
          OR (m.sender_id = ? AND m.receiver_id = ?)
       ORDER BY m.created_at ASC`,
      [myId, otherId, otherId, myId]
    );

    await db.execute(
      `UPDATE messages SET is_read = 1
       WHERE sender_id = ? AND receiver_id = ? AND is_read = 0`,
      [otherId, myId]
    );

    return res.status(200).json(messages);
  } catch (err) {
    console.error('[Direct History Error]', err);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/chat/:orderId
// История сообщений по конкретному заказу
// ─────────────────────────────────────────────────────────────────────────────
exports.getChatHistory = async (req, res) => {
  const { orderId } = req.params;
  const userId      = req.user.id;

  if (isNaN(Number(orderId))) {
    return res.status(400).json({ error: 'Некорректный ID заказа' });
  }

  try {
    const [messages] = await db.execute(
      `SELECT
         m.id,
         m.text,
         m.type,
         m.created_at,
         m.sender_id,
         m.is_read,
         u.name AS sender_name,
         u.role AS sender_role
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.order_id = ?
       ORDER BY m.created_at ASC`,
      [orderId]
    );

    // Помечаем входящие сообщения прочитанными
    await db.execute(
      `UPDATE messages
       SET is_read = 1
       WHERE order_id = ? AND receiver_id = ? AND is_read = 0`,
      [orderId, userId]
    );

    return res.status(200).json(messages);
  } catch (err) {
    console.error('[Chat History Error]', err);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/chat/send
// Отправить сообщение + WebSocket push
// Тело: { text, receiverId, orderId? }
// ─────────────────────────────────────────────────────────────────────────────
exports.sendMessage = async (req, res) => {
  const senderId = req.user.id;
  const { text, receiverId, orderId = null } = req.body;

  if (!text?.trim()) return res.status(400).json({ error: 'Текст сообщения обязателен' });
  if (!receiverId)   return res.status(400).json({ error: 'Получатель не указан' });

  const safeOrderId = orderId && !isNaN(Number(orderId)) ? Number(orderId) : null;

  try {
    const [result] = await db.execute(
      `INSERT INTO messages (sender_id, receiver_id, order_id, text, type, is_read, created_at)
       VALUES (?, ?, ?, ?, 'text', 0, NOW(3))`,
      [senderId, receiverId, safeOrderId, text.trim()]
    );

    const newMessage = {
      id:         result.insertId,
      senderId,
      receiverId,
      orderId:    safeOrderId,
      text:       text.trim(),
      type:       'text',
      createdAt:  new Date().toISOString(),
      senderName: req.user.name,
    };

    // ✅ ИСПРАВЛЕНО: сигнатура совпадает с chatSocket.broadcastChatMessage(receiverId, message)
    broadcastChatMessage(receiverId, newMessage);

    return res.status(201).json(newMessage);
  } catch (err) {
    console.error('[Chat Send Error]', err);
    return res.status(500).json({ error: 'Ошибка отправки сообщения' });
  }
};