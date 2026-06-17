/**
 * MT — Контроллер заказов
 * FR-01: Жизненный цикл заявки
 * FR-02: Создание заявки
 * FR-03: Фильтрация по маршруту, типу кузова, весу, объёму, ставке
 * FR-13: Автоматическое уведомление о счёте при смене статуса
 * FR-25: Подтверждение доставки (Proof of Delivery)
 */

const db = require('../db/connection');
const { dispatchEvent } = require('./webhooksController');

// Геокодинг по названию города (для автоподбора водителей по расстоянию).
const CITY_COORDS = {
  'минск': [53.9045, 27.5615], 'брест': [52.0975, 23.7341], 'гомель': [52.4345, 30.9754],
  'витебск': [55.1904, 30.2049], 'гродно': [53.6884, 23.8258], 'могилёв': [53.9168, 30.3449],
  'могилев': [53.9168, 30.3449], 'бобруйск': [53.1384, 29.2214], 'барановичи': [53.1327, 26.0139],
  'пинск': [52.1229, 26.0951], 'борисов': [54.2278, 28.5050], 'орша': [54.5081, 30.4172],
  'мозырь': [52.0495, 29.2456], 'солигорск': [52.7876, 27.5419], 'лида': [53.8884, 25.2961],
  'варшава': [52.2297, 21.0122], 'берлин': [52.5200, 13.4050], 'вильнюс': [54.6872, 25.2797],
  'рига': [56.9460, 24.1059], 'москва': [55.7558, 37.6173], 'киев': [50.4501, 30.5234],
};
function geocodeCity(city) {
  const key = String(city || '').trim().toLowerCase();
  return CITY_COORDS[key] || [null, null];
}

const ALLOWED_STATUSES = [
  'Новый','Назначен','Забран','Доставлен',
  'В ожидании','Оплачен','Запрошен','Клейм','Архив','Удалён',
];

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/loads — список с расширенными фильтрами (FR-03)
// ─────────────────────────────────────────────────────────────────────────────
async function getLoads(req, res) {
  try {
    const {
      status, driver_id, dispatcher_id,
      origin_city, dest_city,
      vehicle_type,
      weight_min, weight_max,
      volume_min, volume_max,
      rate_min, rate_max,
      page = 1, limit = 20,
    } = req.query;

    const safeLimit  = Number(limit)  | 0 || 20;
    const offset     = ((Number(page) - 1) * safeLimit) | 0;
    const where  = [];
    const params = [];

    if (status)        { where.push('l.status = ?');                      params.push(status); }
    if (driver_id)     { where.push('l.driver_id = ?');                   params.push(driver_id); }
    if (dispatcher_id) { where.push('l.dispatcher_id = ?');               params.push(dispatcher_id); }
    if (origin_city)   { where.push('l.origin_city LIKE ?');              params.push(`%${origin_city}%`); }
    if (dest_city)     { where.push('l.destination_city LIKE ?');         params.push(`%${dest_city}%`); }
    if (vehicle_type)  { where.push('l.vehicle_type = ?');                params.push(vehicle_type); }
    if (weight_min)    { where.push('l.weight_kg >= ?');                  params.push(weight_min); }
    if (weight_max)    { where.push('l.weight_kg <= ?');                  params.push(weight_max); }
    if (volume_min)    { where.push('l.volume_m3 >= ?');                  params.push(volume_min); }
    if (volume_max)    { where.push('l.volume_m3 <= ?');                  params.push(volume_max); }
    if (rate_min)      { where.push('l.cod_amount >= ?');                 params.push(rate_min); }
    if (rate_max)      { where.push('l.cod_amount <= ?');                 params.push(rate_max); }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const [loads] = await db.execute(
      `SELECT l.*,
              d.name    AS driver_name,
              d.balance AS driver_balance,
              dp.name   AS dispatcher_name
       FROM loads l
       LEFT JOIN users d  ON l.driver_id     = d.id
       LEFT JOIN users dp ON l.dispatcher_id = dp.id
       ${whereClause}
       ORDER BY l.created_at DESC
       LIMIT ${safeLimit} OFFSET ${offset}`,
      params
    );

    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) AS total FROM loads l ${whereClause}`,
      params
    );

    res.json({ loads, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error('[loads] getLoads:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/loads/aging — заявки без водителя более 24 ч (NFR удобство)
// ─────────────────────────────────────────────────────────────────────────────
async function getAgingLoads(req, res) {
  try {
    const [loads] = await db.execute(
      `SELECT l.*, dp.name AS dispatcher_name
       FROM loads l
       LEFT JOIN users dp ON l.dispatcher_id = dp.id
       WHERE l.driver_id IS NULL
         AND l.status NOT IN ('Архив', 'Удалён')
         AND l.created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)
       ORDER BY l.created_at ASC`
    );
    res.json({ loads, count: loads.length });
  } catch (err) {
    console.error('[loads] getAgingLoads:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/loads/:id
// ─────────────────────────────────────────────────────────────────────────────
async function getLoadById(req, res) {
  try {
    const [[load]] = await db.execute(
      `SELECT l.*,
              d.name    AS driver_name,
              d.balance AS driver_balance,
              dp.name   AS dispatcher_name
       FROM loads l
       LEFT JOIN users d  ON l.driver_id     = d.id
       LEFT JOIN users dp ON l.dispatcher_id = dp.id
       WHERE l.id = ?`,
      [req.params.id]
    );
    if (!load) return res.status(404).json({ error: 'Заказ не найден' });

    const [vehicles] = await db.execute(
      'SELECT * FROM load_vehicles WHERE load_id = ?',
      [req.params.id]
    );

    res.json({ ...load, vehicles });
  } catch (err) {
    console.error('[loads] getLoadById:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/loads — создать заявку (FR-02)
// ─────────────────────────────────────────────────────────────────────────────
async function createLoad(req, res) {
  try {
    const {
      origin_addr, origin_city, origin_date, origin_contact, origin_phone,
      destination_addr, destination_city, destination_date, destination_contact, destination_phone,
      shipper_name, shipper_phone,
      cod_amount = 0, driver_pay = 0,
      vehicle_type, weight_kg, volume_m3,
      vehicles = [],
    } = req.body;

    // Геокодинг городов → координаты (нужно для автоподбора водителей по расстоянию).
    const [origin_lat, origin_lng] = geocodeCity(origin_city);
    const [dest_lat, dest_lng]     = geocodeCity(destination_city);

    const [result] = await db.execute(
      `INSERT INTO loads
        (origin_addr, origin_city, origin_date, origin_contact, origin_phone,
         destination_addr, destination_city, destination_date, destination_contact, destination_phone,
         shipper_name, shipper_phone, cod_amount, driver_pay, vehicle_type, weight_kg, volume_m3,
         origin_lat, origin_lng, dest_lat, dest_lng,
         status, dispatcher_id, created_at)
       VALUES (?,?,?,?,?, ?,?,?,?,?, ?,?,?,?, ?,?,?, ?,?,?,?, 'Новый', ?, NOW())`,
      [
        origin_addr, origin_city, origin_date, origin_contact, origin_phone,
        destination_addr, destination_city, destination_date, destination_contact, destination_phone,
        shipper_name, shipper_phone, cod_amount, driver_pay,
        vehicle_type || null, weight_kg || null, volume_m3 || null,
        origin_lat, origin_lng, dest_lat, dest_lng,
        req.user.id,
      ]
    );

    const loadId = result.insertId;

    for (const v of vehicles) {
      await db.execute(
        'INSERT INTO load_vehicles (load_id, year, make, type, vin, price) VALUES (?,?,?,?,?,?)',
        [loadId, v.year || null, v.make || null, v.type || null, v.vin || null, v.price || 0]
      );
    }

    dispatchEvent('load.created', { loadId, origin_city, destination_city, status: 'Новый' });

    res.status(201).json({ id: loadId, message: 'Заказ создан' });
  } catch (err) {
    console.error('[loads] createLoad:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/v1/loads/:id — обновить статус/водителя (FR-01, FR-13)
// ─────────────────────────────────────────────────────────────────────────────
async function updateLoad(req, res) {
  try {
    const { status, driver_id, ...rest } = req.body;

    if (status && !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Некорректный статус: "${status}"` });
    }

    // Получаем предыдущий статус для аудита
    const [[prev]] = await db.execute('SELECT status, driver_id, dispatcher_id FROM loads WHERE id = ?', [req.params.id]);
    if (!prev) return res.status(404).json({ error: 'Заказ не найден' });

    const fields = [];
    const params = [];

    if (status    !== undefined) { fields.push('status = ?');    params.push(status); }
    if (driver_id !== undefined) { fields.push('driver_id = ?'); params.push(driver_id || null); }

    // Обновляемые поля груза
    const updatable = ['vehicle_type','weight_kg','volume_m3','origin_city','destination_city',
      'origin_addr','destination_addr','shipper_name','shipper_phone','cod_amount','driver_pay'];
    for (const key of updatable) {
      if (rest[key] !== undefined) { fields.push(`${key} = ?`); params.push(rest[key]); }
    }

    if (!fields.length) return res.status(400).json({ error: 'Нет полей для обновления' });

    params.push(req.params.id);
    await db.execute(`UPDATE loads SET ${fields.join(', ')} WHERE id = ?`, params);

    // FR-13: уведомление при смене статуса на "Оплачен"
    if (status && status !== prev.status) {
      await _onStatusChange(req.params.id, prev, status, req.user);
    }

    res.json({ message: 'Заказ обновлён' });
  } catch (err) {
    console.error('[loads] updateLoad:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/loads/:id/pod — Proof of Delivery (FR-25)
// ─────────────────────────────────────────────────────────────────────────────
async function confirmDelivery(req, res) {
  try {
    const { photo_url, lat, lng, notes } = req.body;
    const { id } = req.params;
    const userId  = req.user.id;

    const [[load]] = await db.execute(
      'SELECT status, driver_id, dispatcher_id FROM loads WHERE id = ?', [id]
    );
    if (!load) return res.status(404).json({ error: 'Заказ не найден' });

    const canConfirm = ['driver','admin','dispatcher'].includes(req.user.role) ||
                       load.driver_id === userId;
    if (!canConfirm) return res.status(403).json({ error: 'Нет прав на подтверждение доставки' });

    await db.execute(
      `UPDATE loads SET
         pod_confirmed_at = NOW(), pod_confirmed_by = ?,
         pod_photo_url = ?, pod_geo_lat = ?, pod_geo_lng = ?, pod_notes = ?,
         status = 'Доставлен'
       WHERE id = ?`,
      [userId, photo_url || null, lat || null, lng || null, notes || null, id]
    );

    // Уведомляем диспетчера и клиента
    if (load.dispatcher_id) {
      await _notify(load.dispatcher_id, 'pod_confirmed', `Доставка подтверждена — заказ #${id}`,
        `Водитель подтвердил доставку заказа #${id}`, 'load', id);
    }

    dispatchEvent('load.delivered', { loadId: Number(id), confirmedBy: userId });

    res.json({ success: true, message: 'Доставка подтверждена' });
  } catch (err) {
    console.error('[loads] confirmDelivery:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Вспомогательные
// ─────────────────────────────────────────────────────────────────────────────
async function _onStatusChange(loadId, prev, newStatus, actor) {
  try {
    const [[load]] = await db.execute(
      'SELECT driver_id, dispatcher_id, shipper_name, origin_city, destination_city FROM loads WHERE id = ?',
      [loadId]
    );

    const toNotify = new Set();
    if (load.driver_id)     toNotify.add(load.driver_id);
    if (load.dispatcher_id) toNotify.add(load.dispatcher_id);

    const msg = `Статус заказа #${loadId} изменён: ${prev.status} → ${newStatus}`;
    for (const uid of toNotify) {
      await _notify(uid, 'status_change', `Заказ #${loadId}: ${newStatus}`, msg, 'load', Number(loadId));
    }

    // FR-13: при смене на "Оплачен" — уведомление о счёте
    if (newStatus === 'Оплачен') {
      for (const uid of toNotify) {
        await _notify(uid, 'invoice', `Счёт выставлен — заказ #${loadId}`,
          `Заказ #${loadId} (${load.origin_city} → ${load.destination_city}) оплачен. Счёт доступен в разделе Документы.`,
          'load', Number(loadId));
      }
    }

    dispatchEvent('load.status_changed', {
      loadId: Number(loadId),
      prevStatus: prev.status,
      newStatus,
      changedBy: actor.id,
    });

    if (newStatus === 'Оплачен') {
      dispatchEvent('load.paid', { loadId: Number(loadId) });
    }
  } catch (err) {
    console.warn('[loads] _onStatusChange:', err.message);
  }
}

async function _notify(userId, type, title, message, entityType = null, entityId = null) {
  if (!userId) return;
  try {
    await db.execute(
      `INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, type, title, message, entityType, entityId]
    );
  } catch {}
}

module.exports = { getLoads, getAgingLoads, getLoadById, createLoad, updateLoad, confirmDelivery };
