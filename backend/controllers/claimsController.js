const db = require('../db/connection');

// GET /api/v1/claims
async function listClaims(req, res) {
  try {
    const { status, type, load_id, limit = 50, offset = 0 } = req.query;
    const userId = req.user.id;
    const role   = req.user.role;

    let where = 'WHERE 1=1';
    const params = [];

    if (!['admin', 'dispatcher'].includes(role)) {
      where += ' AND (c.claimant_id = ? OR c.respondent_id = ?)';
      params.push(userId, userId);
    }
    if (status)  { where += ' AND c.status = ?';  params.push(status); }
    if (type)    { where += ' AND c.type = ?';    params.push(type); }
    if (load_id) { where += ' AND c.load_id = ?'; params.push(load_id); }

    const [rows] = await db.execute(
      `SELECT c.*,
              u1.name AS claimant_name,  u1.email AS claimant_email,
              u2.name AS respondent_name, u2.email AS respondent_email,
              l.origin_city, l.destination_city,
              u3.name AS resolver_name
       FROM claims c
       LEFT JOIN Users u1 ON u1.id = c.claimant_id
       LEFT JOIN Users u2 ON u2.id = c.respondent_id
       LEFT JOIN loads l  ON l.id  = c.load_id
       LEFT JOIN Users u3 ON u3.id = c.resolved_by
       ${where}
       ORDER BY c.created_at DESC
       LIMIT ${parseInt(limit)|0} OFFSET ${parseInt(offset)|0}`,
      params
    );

    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) AS total FROM claims c ${where}`,
      params
    );

    res.json({ claims: rows, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (err) {
    console.error('[Claims] listClaims:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

// GET /api/v1/claims/:id
async function getClaim(req, res) {
  try {
    const [[claim]] = await db.execute(
      `SELECT c.*,
              u1.name AS claimant_name,  u1.email AS claimant_email, u1.phone AS claimant_phone,
              u2.name AS respondent_name, u2.email AS respondent_email,
              l.origin_city, l.destination_city, l.origin_addr, l.destination_addr,
              u3.name AS resolver_name
       FROM claims c
       LEFT JOIN Users u1 ON u1.id = c.claimant_id
       LEFT JOIN Users u2 ON u2.id = c.respondent_id
       LEFT JOIN loads l  ON l.id  = c.load_id
       LEFT JOIN Users u3 ON u3.id = c.resolved_by
       WHERE c.id = ?`,
      [req.params.id]
    );
    if (!claim) return res.status(404).json({ error: 'Претензия не найдена' });
    res.json(claim);
  } catch (err) {
    console.error('[Claims] getClaim:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

// POST /api/v1/claims
async function createClaim(req, res) {
  try {
    const { load_id, respondent_id, type, amount, currency = 'BYN', description } = req.body;
    const claimant_id = req.user.id;

    if (!description || !type) {
      return res.status(400).json({ error: 'Тип и описание претензии обязательны' });
    }

    const [result] = await db.execute(
      `INSERT INTO claims (load_id, claimant_id, respondent_id, type, amount, currency, description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [load_id || null, claimant_id, respondent_id || null, type, amount || 0, currency, description]
    );

    const [[created]] = await db.execute('SELECT * FROM claims WHERE id = ?', [result.insertId]);

    await _notify(respondent_id, 'claim_new', 'Новая претензия',
      `Против вас подана претензия #${result.insertId}`, 'claim', result.insertId);

    res.status(201).json(created);
  } catch (err) {
    console.error('[Claims] createClaim:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

// PATCH /api/v1/claims/:id
async function updateClaim(req, res) {
  try {
    const { status, type, amount, currency, description } = req.body;
    const allowed = ['type', 'amount', 'currency', 'description', 'status'];
    const sets = [];
    const vals = [];

    if (type)        { sets.push('type = ?');        vals.push(type); }
    if (amount)      { sets.push('amount = ?');      vals.push(amount); }
    if (currency)    { sets.push('currency = ?');    vals.push(currency); }
    if (description) { sets.push('description = ?'); vals.push(description); }
    if (status)      { sets.push('status = ?');      vals.push(status); }

    if (sets.length === 0) return res.status(400).json({ error: 'Нет полей для обновления' });

    vals.push(req.params.id);
    await db.execute(`UPDATE claims SET ${sets.join(', ')} WHERE id = ?`, vals);

    const [[updated]] = await db.execute('SELECT * FROM claims WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) {
    console.error('[Claims] updateClaim:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

// POST /api/v1/claims/:id/resolve
async function resolveClaim(req, res) {
  try {
    const { resolution, status = 'Урегулирована' } = req.body;
    const resolved_by = req.user.id;

    if (!resolution) return res.status(400).json({ error: 'Укажите резолюцию' });

    await db.execute(
      `UPDATE claims SET status = ?, resolution = ?, resolved_by = ?, resolved_at = NOW()
       WHERE id = ?`,
      [status, resolution, resolved_by, req.params.id]
    );

    const [[claim]] = await db.execute('SELECT * FROM claims WHERE id = ?', [req.params.id]);

    await _notify(claim.claimant_id, 'claim_resolved', 'Претензия урегулирована',
      `Претензия #${req.params.id} получила статус: ${status}`, 'claim', req.params.id);

    res.json(claim);
  } catch (err) {
    console.error('[Claims] resolveClaim:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

// DELETE /api/v1/claims/:id
async function deleteClaim(req, res) {
  try {
    const [[claim]] = await db.execute('SELECT claimant_id, status FROM claims WHERE id = ?', [req.params.id]);
    if (!claim) return res.status(404).json({ error: 'Претензия не найдена' });

    const isOwner = claim.claimant_id === req.user.id;
    const isAdmin = ['admin', 'dispatcher'].includes(req.user.role);
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Нет прав' });

    await db.execute('DELETE FROM claims WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[Claims] deleteClaim:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

async function _notify(userId, type, title, message, entityType, entityId) {
  if (!userId) return;
  try {
    await db.execute(
      'INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id) VALUES (?,?,?,?,?,?)',
      [userId, type, title, message, entityType, entityId]
    );
  } catch {}
}

module.exports = { listClaims, getClaim, createClaim, updateClaim, resolveClaim, deleteClaim };
