const db = require('../db/connection');

// GET /api/v1/audit
async function listAuditLogs(req, res) {
  try {
    const role = req.user.role;
    if (!['admin', 'dispatcher'].includes(role)) {
      return res.status(403).json({ error: 'Нет прав' });
    }

    const {
      user_id, action, entity_type,
      date_from, date_to,
      limit = 100, offset = 0
    } = req.query;

    let where = 'WHERE 1=1';
    const params = [];

    if (user_id)     { where += ' AND al.user_id = ?';        params.push(user_id); }
    if (action)      { where += ' AND al.action = ?';         params.push(action); }
    if (entity_type) { where += ' AND al.entity_type = ?';    params.push(entity_type); }
    if (date_from)   { where += ' AND al.created_at >= ?';    params.push(date_from); }
    if (date_to)     { where += ' AND al.created_at <= ?';    params.push(date_to + ' 23:59:59'); }

    const [rows] = await db.execute(
      `SELECT al.*, u.name AS user_name, u.role AS user_role
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.user_id
       ${where}
       ORDER BY al.created_at DESC
       LIMIT ${parseInt(limit)|0} OFFSET ${parseInt(offset)|0}`,
      params
    );

    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) AS total FROM audit_logs al ${where}`,
      params
    );

    res.json({ logs: rows, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (err) {
    console.error('[Audit] listAuditLogs:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

module.exports = { listAuditLogs };
