const db = require('../db/connection');

const DOC_LABELS = {
  license:      'Лицензия на перевозки',
  insurance:    'Страховой полис',
  vehicle_cert: 'Техпаспорт ТС',
  medical:      'Медицинская справка',
  adr:          'ADR-свидетельство',
  other:        'Прочий документ',
};

// GET /api/v1/verification/:userId
async function listDocs(req, res) {
  try {
    const { userId } = req.params;
    const role = req.user.role;
    const self = String(req.user.id) === String(userId);

    if (!self && !['admin', 'dispatcher', 'broker'].includes(role)) {
      return res.status(403).json({ error: 'Нет прав' });
    }

    const [docs] = await db.execute(
      `SELECT cd.*, u.name AS verifier_name
       FROM carrier_documents cd
       LEFT JOIN Users u ON u.id = cd.verified_by
       WHERE cd.user_id = ?
       ORDER BY cd.doc_type, cd.created_at DESC`,
      [userId]
    );

    // Сводка: истекающие документы (≤30 дней)
    const expiringSoon = docs.filter(d => {
      if (!d.expires_at) return false;
      const days = (new Date(d.expires_at) - Date.now()) / 86400000;
      return days >= 0 && days <= 30;
    });

    res.json({ docs, expiringSoon });
  } catch (err) {
    console.error('[Verification] listDocs:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

// POST /api/v1/verification/:userId
async function addDoc(req, res) {
  try {
    const { userId } = req.params;
    const { doc_type, doc_number, issued_by, issued_at, expires_at, notes } = req.body;

    if (!doc_type) return res.status(400).json({ error: 'Укажите тип документа' });

    const [result] = await db.execute(
      `INSERT INTO carrier_documents (user_id, doc_type, doc_number, issued_by, issued_at, expires_at, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, doc_type, doc_number || null, issued_by || null,
       issued_at || null, expires_at || null, notes || null]
    );

    const [[doc]] = await db.execute('SELECT * FROM carrier_documents WHERE id = ?', [result.insertId]);
    res.status(201).json(doc);
  } catch (err) {
    console.error('[Verification] addDoc:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

// PATCH /api/v1/verification/doc/:docId
async function updateDoc(req, res) {
  try {
    const { doc_number, issued_by, issued_at, expires_at, notes, status } = req.body;
    const sets = [];
    const vals = [];

    if (doc_number !== undefined) { sets.push('doc_number = ?'); vals.push(doc_number); }
    if (issued_by  !== undefined) { sets.push('issued_by = ?');  vals.push(issued_by); }
    if (issued_at  !== undefined) { sets.push('issued_at = ?');  vals.push(issued_at); }
    if (expires_at !== undefined) { sets.push('expires_at = ?'); vals.push(expires_at); }
    if (notes      !== undefined) { sets.push('notes = ?');      vals.push(notes); }
    if (status     !== undefined) { sets.push('status = ?');     vals.push(status); }

    if (sets.length === 0) return res.status(400).json({ error: 'Нет полей' });

    vals.push(req.params.docId);
    await db.execute(`UPDATE carrier_documents SET ${sets.join(', ')} WHERE id = ?`, vals);

    const [[doc]] = await db.execute('SELECT * FROM carrier_documents WHERE id = ?', [req.params.docId]);
    res.json(doc);
  } catch (err) {
    console.error('[Verification] updateDoc:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

// POST /api/v1/verification/doc/:docId/verify
async function verifyDoc(req, res) {
  try {
    const role = req.user.role;
    if (!['admin', 'dispatcher'].includes(role)) {
      return res.status(403).json({ error: 'Только администратор или диспетчер может верифицировать' });
    }

    await db.execute(
      `UPDATE carrier_documents SET status = 'verified', verified_by = ?, verified_at = NOW() WHERE id = ?`,
      [req.user.id, req.params.docId]
    );

    const [[doc]] = await db.execute(
      `SELECT cd.*, u.user_id FROM carrier_documents cd WHERE cd.id = ?`,
      [req.params.docId]
    );

    // Уведомить перевозчика
    if (doc) {
      try {
        await db.execute(
          'INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id) VALUES (?,?,?,?,?,?)',
          [doc.user_id, 'doc_verified', 'Документ верифицирован',
           `Документ "${DOC_LABELS[doc.doc_type] || doc.doc_type}" прошёл верификацию`,
           'carrier_doc', doc.id]
        );
      } catch {}
    }

    res.json(doc);
  } catch (err) {
    console.error('[Verification] verifyDoc:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

// DELETE /api/v1/verification/doc/:docId
async function deleteDoc(req, res) {
  try {
    await db.execute('DELETE FROM carrier_documents WHERE id = ?', [req.params.docId]);
    res.json({ success: true });
  } catch (err) {
    console.error('[Verification] deleteDoc:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

module.exports = { listDocs, addDoc, updateDoc, verifyDoc, deleteDoc };
