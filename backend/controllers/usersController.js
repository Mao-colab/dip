/**
 * MT — Users Controller
 * FR-15: Управление пользователями и ролями (RBAC)
 * FR-17: Профиль перевозчика
 * FR-18: Профиль водителя
 * FR-19: Профиль транспортного средства
 * NFR-06: GDPR — удаление персональных данных
 */

const db = require('../db/connection');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/users?role=driver — список с опциональным фильтром по роли
// ─────────────────────────────────────────────────────────────────────────────
exports.getUsers = async (req, res) => {
  try {
    const { role, limit = 100, offset = 0 } = req.query;
    const params = [];
    let where = 'WHERE 1=1';

    if (role) { where += ' AND u.role = ?'; params.push(role); }

    const [rows] = await db.execute(
      `SELECT
         u.id, u.name, u.email, u.phone, u.role, u.verified,
         u.specialization, u.location, u.availability,
         u.status, u.last_lat, u.last_lng, u.load_id, u.last_ping_at,
         u.avatar_color, u.created_at,
         ROUND(AVG(r.rating), 2) AS avg_rating,
         COUNT(r.id)             AS review_count
       FROM Users u
       LEFT JOIN reviews r ON r.target_user_id = u.id
       ${where}
       GROUP BY u.id
       ORDER BY u.name
       LIMIT ${parseInt(limit)|0} OFFSET ${parseInt(offset)|0}`,
      params
    );

    return res.status(200).json(rows);
  } catch (err) {
    console.error('[Users] getUsers:', err);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// GET /api/v1/users/:id
exports.getUserById = async (req, res) => {
  try {
    const [[user]] = await db.execute(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.verified,
              u.specialization, u.location, u.availability, u.dispatch_fee,
              u.status, u.last_lat, u.last_lng, u.load_id, u.last_ping_at,
              u.avatar_color, u.created_at,
              ROUND(AVG(r.rating), 2) AS avg_rating,
              COUNT(r.id)             AS review_count
       FROM Users u
       LEFT JOIN reviews r ON r.target_user_id = u.id
       WHERE u.id = ?
       GROUP BY u.id`,
      [req.params.id]
    );
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

    // Транспортные средства
    const [vehicles] = await db.execute(
      'SELECT * FROM user_vehicles WHERE driver_id = ?',
      [req.params.id]
    );

    return res.status(200).json({ ...user, vehicles });
  } catch (err) {
    console.error('[Users] getUserById:', err);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// PATCH /api/v1/users/:id — обновить профиль (свой или admin любого)
exports.updateUser = async (req, res) => {
  try {
    const targetId = Number(req.params.id);
    const isSelf   = req.user.id === targetId;
    const isAdmin  = ['admin'].includes(req.user.role);

    if (!isSelf && !isAdmin) return res.status(403).json({ error: 'Нет прав' });

    const ALLOWED_SELF   = ['name','phone','specialization','location','availability','avatar_color'];
    const ALLOWED_ADMIN  = [...ALLOWED_SELF, 'role','verified','dispatch_fee','status'];
    const allowed        = isAdmin ? ALLOWED_ADMIN : ALLOWED_SELF;

    const sets = [];
    const vals = [];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        sets.push(`${key} = ?`);
        vals.push(req.body[key]);
      }
    }
    if (!sets.length) return res.status(400).json({ error: 'Нет полей для обновления' });

    vals.push(targetId);
    await db.execute(`UPDATE Users SET ${sets.join(', ')} WHERE id = ?`, vals);

    const [[updated]] = await db.execute(
      'SELECT id, name, email, phone, role, verified, specialization, location, availability, dispatch_fee, status, avatar_color FROM Users WHERE id = ?',
      [targetId]
    );
    return res.json(updated);
  } catch (err) {
    console.error('[Users] updateUser:', err);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// DELETE /api/v1/users/:id — только admin
exports.deleteUser = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Нет прав' });

    await db.execute('DELETE FROM Users WHERE id = ?', [req.params.id]);
    return res.json({ success: true });
  } catch (err) {
    console.error('[Users] deleteUser:', err);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// ─── Vehicles (FR-19) ─────────────────────────────────────────────────────────

exports.getVehicles = async (req, res) => {
  try {
    const driverId = req.params.userId || req.user.id;
    const [vehicles] = await db.execute('SELECT * FROM user_vehicles WHERE driver_id = ?', [driverId]);
    return res.json(vehicles);
  } catch (err) {
    console.error('[Users] getVehicles:', err);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
};

exports.addVehicle = async (req, res) => {
  try {
    const driverId = req.user.id;
    const { type, make, model, year, vin, plate, capacity, volume, length } = req.body;

    if (!type || !make || !year)
      return res.status(400).json({ error: 'Тип, марка и год обязательны' });

    const [result] = await db.execute(
      `INSERT INTO user_vehicles (driver_id, type, make, model, year, vin, plate, capacity, volume, length)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [driverId, type, make, model || null, year, vin || null, plate || null,
       capacity || null, volume || null, length || null]
    );

    const [[vehicle]] = await db.execute('SELECT * FROM user_vehicles WHERE id = ?', [result.insertId]);
    return res.status(201).json(vehicle);
  } catch (err) {
    console.error('[Users] addVehicle:', err);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
};

exports.updateVehicle = async (req, res) => {
  try {
    const allowed = ['type','make','model','year','vin','plate','capacity','volume','length','status'];
    const sets = [];
    const vals = [];
    for (const key of allowed) {
      if (req.body[key] !== undefined) { sets.push(`${key} = ?`); vals.push(req.body[key]); }
    }
    if (!sets.length) return res.status(400).json({ error: 'Нет полей' });

    vals.push(req.params.vehicleId, req.user.id);
    await db.execute(`UPDATE user_vehicles SET ${sets.join(', ')} WHERE id = ? AND driver_id = ?`, vals);

    const [[vehicle]] = await db.execute('SELECT * FROM user_vehicles WHERE id = ?', [req.params.vehicleId]);
    return res.json(vehicle || { error: 'Не найдено' });
  } catch (err) {
    console.error('[Users] updateVehicle:', err);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
};

exports.deleteVehicle = async (req, res) => {
  try {
    await db.execute('DELETE FROM user_vehicles WHERE id = ? AND driver_id = ?', [req.params.vehicleId, req.user.id]);
    return res.json({ success: true });
  } catch (err) {
    console.error('[Users] deleteVehicle:', err);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// ─── NFR-06: GDPR — анонимизация персональных данных ─────────────────────────
// DELETE /api/v1/users/:id/personal-data
exports.deletePersonalData = async (req, res) => {
  try {
    const targetId = Number(req.params.id);
    const isSelf   = req.user.id === targetId;
    const isAdmin  = req.user.role === 'admin';

    if (!isSelf && !isAdmin) return res.status(403).json({ error: 'Нет прав' });

    const anon = `deleted_${targetId}_${Date.now()}`;

    await db.execute(
      `UPDATE Users SET
         name         = ?,
         email        = ?,
         phone        = NULL,
         password_hash = '$2b$10$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
         specialization = NULL,
         location     = NULL,
         last_lat     = NULL,
         last_lng     = NULL
       WHERE id = ?`,
      [`[Удалён]`, `${anon}@deleted.local`, targetId]
    );

    // Удаляем личные сообщения (кроме системных по заявкам)
    await db.execute(
      `DELETE FROM Messages WHERE (sender_id = ? OR receiver_id = ?) AND order_id IS NULL`,
      [targetId, targetId]
    );

    // Аннулируем документы
    await db.execute(
      `UPDATE carrier_documents SET doc_number = NULL, issued_by = NULL WHERE user_id = ?`,
      [targetId]
    );

    return res.json({ success: true, message: 'Персональные данные удалены в соответствии с требованиями GDPR' });
  } catch (err) {
    console.error('[Users] deletePersonalData:', err);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
};
