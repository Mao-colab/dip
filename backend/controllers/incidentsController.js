/**
 * MT — Incidents Controller
 * FR-28: Фиксация инцидентов (поломка, ДТП, форс-мажор) с уведомлением ответственных
 */

const db = require('../db/connection');

const TYPE_LABELS = {
  breakdown:    'Поломка ТС',
  accident:     'ДТП',
  delay:        'Задержка',
  customs:      'Таможня',
  cargo_damage: 'Повреждение груза',
  other:        'Прочее',
};

// GET /api/v1/incidents
async function listIncidents(req, res) {
  try {
    const { load_id, status, type, limit = 50, offset = 0 } = req.query;
    const userId = req.user.id;
    const role   = req.user.role;

    let where = 'WHERE 1=1';
    const params = [];

    if (!['admin', 'dispatcher'].includes(role)) {
      where += ' AND i.reporter_id = ?';
      params.push(userId);
    }
    if (load_id) { where += ' AND i.load_id = ?'; params.push(load_id); }
    if (status)  { where += ' AND i.status = ?';  params.push(status); }
    if (type)    { where += ' AND i.type = ?';    params.push(type); }

    const [rows] = await db.execute(
      `SELECT i.*,
              u.name  AS reporter_name, u.role AS reporter_role,
              u2.name AS resolver_name,
              l.origin_city, l.destination_city
       FROM incidents i
       JOIN  users u  ON u.id  = i.reporter_id
       LEFT JOIN users u2 ON u2.id = i.resolved_by
       LEFT JOIN loads l  ON l.id  = i.load_id
       ${where}
       ORDER BY i.created_at DESC
       LIMIT ${parseInt(limit)|0} OFFSET ${parseInt(offset)|0}`,
      params
    );

    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) AS total FROM incidents i ${where}`,
      params
    );

    res.json({ incidents: rows, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (err) {
    console.error('[Incidents] list:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

// GET /api/v1/incidents/:id
async function getIncident(req, res) {
  try {
    const [[incident]] = await db.execute(
      `SELECT i.*,
              u.name  AS reporter_name, u.phone AS reporter_phone,
              u2.name AS resolver_name,
              l.origin_city, l.destination_city, l.dispatcher_id
       FROM incidents i
       JOIN  users u  ON u.id  = i.reporter_id
       LEFT JOIN users u2 ON u2.id = i.resolved_by
       LEFT JOIN loads l  ON l.id  = i.load_id
       WHERE i.id = ?`,
      [req.params.id]
    );
    if (!incident) return res.status(404).json({ error: 'Инцидент не найден' });
    res.json(incident);
  } catch (err) {
    console.error('[Incidents] get:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

// POST /api/v1/incidents
async function createIncident(req, res) {
  try {
    const reporterId = req.user.id;
    const { load_id, type = 'other', description, lat, lng, photo_url } = req.body;

    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'Описание инцидента обязательно' });
    }

    const [result] = await db.execute(
      `INSERT INTO incidents (load_id, reporter_id, type, description, lat, lng, photo_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [load_id || null, reporterId, type, description.trim(),
       lat || null, lng || null, photo_url || null]
    );

    const incidentId = result.insertId;

    // Уведомляем диспетчера и брокера
    if (load_id) {
      try {
        const [[load]] = await db.execute(
          'SELECT dispatcher_id, driver_id FROM loads WHERE id = ?',
          [load_id]
        );
        const toNotify = new Set();
        if (load?.dispatcher_id) toNotify.add(load.dispatcher_id);

        // Также уведомляем всех диспетчеров и администраторов
        const [dispatchers] = await db.execute(
          "SELECT id FROM users WHERE role IN ('admin','dispatcher') LIMIT 10"
        );
        dispatchers.forEach(d => toNotify.add(d.id));

        const label = TYPE_LABELS[type] || type;
        for (const uid of toNotify) {
          await db.execute(
            `INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id)
             VALUES (?, 'incident', ?, ?, 'incident', ?)`,
            [uid,
             `Инцидент по заказу #${load_id}`,
             `${label}: ${description.substring(0, 100)}`,
             incidentId]
          );
        }
      } catch {}
    }

    const [[created]] = await db.execute(
      `SELECT i.*, u.name AS reporter_name FROM incidents i
       JOIN users u ON u.id = i.reporter_id WHERE i.id = ?`,
      [incidentId]
    );

    res.status(201).json(created);
  } catch (err) {
    console.error('[Incidents] create:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

// PATCH /api/v1/incidents/:id
async function updateIncident(req, res) {
  try {
    const { description, photo_url, status } = req.body;
    const sets = [];
    const vals = [];

    if (description !== undefined) { sets.push('description = ?'); vals.push(description); }
    if (photo_url   !== undefined) { sets.push('photo_url = ?');   vals.push(photo_url); }
    if (status      !== undefined) { sets.push('status = ?');      vals.push(status); }

    if (!sets.length) return res.status(400).json({ error: 'Нет полей для обновления' });

    vals.push(req.params.id);
    await db.execute(`UPDATE incidents SET ${sets.join(', ')} WHERE id = ?`, vals);

    const [[updated]] = await db.execute(
      `SELECT i.*, u.name AS reporter_name FROM incidents i
       JOIN users u ON u.id = i.reporter_id WHERE i.id = ?`,
      [req.params.id]
    );
    res.json(updated);
  } catch (err) {
    console.error('[Incidents] update:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

// POST /api/v1/incidents/:id/resolve
async function resolveIncident(req, res) {
  try {
    const role = req.user.role;
    if (!['admin', 'dispatcher'].includes(role)) {
      return res.status(403).json({ error: 'Только диспетчер или администратор может закрыть инцидент' });
    }

    await db.execute(
      `UPDATE incidents SET status = 'resolved', resolved_by = ?, resolved_at = NOW() WHERE id = ?`,
      [req.user.id, req.params.id]
    );

    const [[incident]] = await db.execute('SELECT * FROM incidents WHERE id = ?', [req.params.id]);

    // Уведомляем репортёра
    try {
      await db.execute(
        `INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id)
         VALUES (?, 'incident_resolved', 'Инцидент закрыт',
           'Инцидент #? был закрыт диспетчером.', 'incident', ?)`,
        [incident.reporter_id, req.params.id, req.params.id]
      );
    } catch {}

    res.json(incident);
  } catch (err) {
    console.error('[Incidents] resolve:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

module.exports = { listIncidents, getIncident, createIncident, updateIncident, resolveIncident };
