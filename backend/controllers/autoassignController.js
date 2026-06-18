/**
 * MT — Контроллер автоматического подбора водителей (Auto-Assignment)
 */

const db = require('../db/connection');

// Координаты основных городов (fallback, если у заказа не заданы origin_lat/lng).
const CITY_COORDS = {
  'минск': [53.9045, 27.5615], 'брест': [52.0975, 23.7341], 'гомель': [52.4345, 30.9754],
  'витебск': [55.1904, 30.2049], 'гродно': [53.6884, 23.8258], 'могилёв': [53.9168, 30.3449],
  'могилев': [53.9168, 30.3449], 'бобруйск': [53.1384, 29.2214], 'барановичи': [53.1327, 26.0139],
  'пинск': [52.1229, 26.0951], 'борисов': [54.2278, 28.5050], 'орша': [54.5081, 30.4172],
  'мозырь': [52.0495, 29.2456], 'солигорск': [52.7876, 27.5419], 'лида': [53.8884, 25.2961],
  'варшава': [52.2297, 21.0122], 'берлин': [52.5200, 13.4050], 'вильнюс': [54.6872, 25.2797],
  'рига': [56.9460, 24.1059], 'москва': [55.7558, 37.6173], 'киев': [50.4501, 30.5234],
};
const DEFAULT_ORIGIN = [53.9045, 27.5615]; // Минск — центр по умолчанию

function resolveOrigin(load) {
  if (load.origin_lat != null && load.origin_lng != null) {
    return [Number(load.origin_lat), Number(load.origin_lng)];
  }
  const city = String(load.origin_city || '').trim().toLowerCase();
  return CITY_COORDS[city] || DEFAULT_ORIGIN;
}

/**
 * Выбирает диспетчера для авто-назначения: наименее загруженного активными заказами.
 * Возвращает { id, name } или null, если диспетчеров нет.
 */
async function pickDispatcher() {
  const [rows] = await db.execute(
    `SELECT u.id, u.name,
            (SELECT COUNT(*) FROM loads l
              WHERE l.dispatcher_id = u.id
                AND l.status IN ('Новый','Запрошен','Назначен','Забран')) AS active_loads
     FROM users u
     WHERE u.role = 'dispatcher'
     ORDER BY active_loads ASC, u.id ASC
     LIMIT 1`
  );
  return rows[0] || null;
}

/**
 * Создаёт запись-уведомление (колокольчик). Переживает оффлайн водителя.
 */
async function createNotification(userId, type, title, message, entityId = null) {
  if (!userId) return;
  try {
    await db.execute(
      `INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id)
       VALUES (?, ?, ?, ?, 'load', ?)`,
      [userId, type, title, message, entityId]
    );
  } catch (e) {
    console.warn('[AutoAssign] createNotification:', e.message);
  }
}

/**
 * Отправляет водителю сообщение в чат (сохраняется в БД) и пушит его по WebSocket.
 */
async function sendDriverMessage(senderId, driverId, loadId, text) {
  try {
    await db.execute(
      `INSERT INTO messages (sender_id, receiver_id, order_id, text, type, is_read, created_at)
       VALUES (?, ?, ?, ?, 'system', 0, NOW(3))`,
      [senderId, driverId, loadId, text]
    );
    const { broadcastChatMessage } = require('../sockets/chatSocket');
    broadcastChatMessage(driverId, { senderId, receiverId: driverId, orderId: loadId, text, type: 'system' });
  } catch (e) {
    console.warn('[AutoAssign] sendDriverMessage:', e.message);
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/autoassign/suggest/:loadId
// ─────────────────────────────────────────────────────────────────────────────
async function getSuggestedDrivers(req, res) {
  try {
    const { loadId } = req.params;
    const { limit = 10, radius = 500 } = req.query;

    // Данные заказа — origin_lat/lng берём из самой таблицы loads
    const [[load]] = await db.execute(
      `SELECT l.id, l.status, l.driver_id,
              l.origin_lat, l.origin_lng, l.origin_city,
              l.dest_lat, l.dest_lng, l.destination_city,
              l.vehicle_type, l.weight_kg,
              lv.type as lv_vehicle_type, lv.year as vehicle_year
       FROM loads l
       LEFT JOIN load_vehicles lv ON lv.load_id = l.id
       WHERE l.id = ?
       LIMIT 1`,
      [loadId]
    );

    if (!load) return res.status(404).json({ error: 'Заказ не найден' });

    const vehicleType = load.vehicle_type || load.lv_vehicle_type || null;
    // Если у заказа нет координат — берём по городу (или Минск по умолчанию),
    // чтобы автоподбор всегда работал, даже для заказов без геокодинга.
    const [originLat, originLng] = resolveOrigin(load);

    const [drivers] = await db.execute(
      `SELECT
         u.id, u.name, u.email, u.phone, u.verified, u.avatar_color,
         u.specialization, u.location, u.availability, u.status as driver_status,
         u.load_id as current_load,
         ROUND(AVG(r.rating), 2) as rating,
         COUNT(DISTINCT r.id) as reviews_count,
         ROUND(
           6371 * 2 * ASIN(SQRT(
             POWER(SIN((RADIANS(?) - RADIANS(u.last_lat)) / 2), 2) +
             COS(RADIANS(u.last_lat)) * COS(RADIANS(?)) *
             POWER(SIN((RADIANS(?) - RADIANS(u.last_lng)) / 2), 2)
           )), 2
         ) as distance_km,
         CASE
           WHEN ? IS NULL THEN 1
           WHEN EXISTS (
             SELECT 1 FROM user_vehicles uv
             WHERE uv.driver_id = u.id AND (uv.type = ? OR ? IS NULL)
           ) THEN 1
           ELSE 0
         END as vehicle_match
       FROM users u
       LEFT JOIN reviews r ON r.target_user_id = u.id
       WHERE u.role IN ('driver','carrier')
         AND u.status IN ('active','idle')
         AND u.last_lat IS NOT NULL AND u.last_lng IS NOT NULL
         AND u.id != ?
       GROUP BY u.id
       HAVING distance_km <= ?
       ORDER BY vehicle_match DESC, u.status DESC, distance_km ASC, rating DESC
       LIMIT ${parseInt(limit) | 0}`,
      [
        originLat, originLat, originLng,
        vehicleType, vehicleType, vehicleType,
        load.driver_id || 0,
        Number(radius),
      ]
    );

    const suggestions = drivers.map(d => ({
      id:             d.id,
      name:           d.name,
      rating:         d.rating || 0,
      reviewsCount:   d.reviews_count || 0,
      distance:       d.distance_km,
      status:         d.driver_status,
      verified:       Boolean(d.verified),
      location:       d.location,
      specialization: d.specialization,
      matchScore:     calcMatchScore(d),
    }));

    res.json({ loadId, suggestions, totalFound: suggestions.length, searchRadius: radius,
      criteria: { vehicleType, origin: { lat: originLat, lng: originLng, city: load.origin_city } } });

  } catch (err) {
    console.error('[AutoAssign] getSuggestedDrivers error:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/autoassign/offer/:loadId — предложить заказ водителю
// ─────────────────────────────────────────────────────────────────────────────
async function offerToDriver(req, res) {
  try {
    const { loadId } = req.params;
    const { driverId, message } = req.body;
    const senderId = req.user.id;

    const [[load]] = await db.execute(
      'SELECT id, status FROM loads WHERE id = ?', [loadId]
    );
    if (!load) return res.status(404).json({ error: 'Заказ не найден' });

    const [[driver]] = await db.execute(
      'SELECT id, name FROM users WHERE id = ? AND role IN ("driver","carrier")', [driverId]
    );
    if (!driver) return res.status(404).json({ error: 'Водитель не найден' });

    const text = message
      ? `Предложение по заказу #${loadId}: ${message}`
      : `Вам предложен заказ #${loadId}. Ожидаем подтверждения.`;

    // Сообщение в чат (сохраняется + WebSocket-пуш)
    await sendDriverMessage(senderId, driverId, loadId, text);

    // Уведомление в колокольчик (переживает оффлайн)
    await createNotification(driverId, 'load_offer', `Предложение по заказу #${loadId}`, text, loadId);

    // Статус заказа → Запрошен
    await db.execute(
      'UPDATE loads SET status = "Запрошен" WHERE id = ? AND status = "Новый"', [loadId]
    );

    res.json({ success: true, message: 'Предложение отправлено', driver: { id: driver.id, name: driver.name } });

  } catch (err) {
    console.error('[AutoAssign] offerToDriver error:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/autoassign/assign/:loadId — автоназначить лучшего водителя
// ─────────────────────────────────────────────────────────────────────────────
async function autoAssignDriver(req, res) {
  try {
    const { loadId } = req.params;
    const { criteria = {} } = req.body;
    const dispatcherId = req.user.id;

    const [[load]] = await db.execute(
      'SELECT id, origin_lat, origin_lng, origin_city, vehicle_type FROM loads WHERE id = ? AND status IN ("Новый","Запрошен") AND driver_id IS NULL',
      [loadId]
    );
    if (!load) return res.status(400).json({ error: 'Заказ не найден или уже назначен' });

    // Координаты погрузки: из заказа, по городу или Минск по умолчанию.
    const [originLat, originLng] = resolveOrigin(load);
    const radius = criteria.radius || 1000;

    const [drivers] = await db.execute(
      `SELECT u.id, u.name,
              (u.load_id IS NULL) as is_free,
              ROUND(AVG(r.rating), 2) as rating,
              ROUND(
                6371 * 2 * ASIN(SQRT(
                  POWER(SIN((RADIANS(?) - RADIANS(u.last_lat)) / 2), 2) +
                  COS(RADIANS(u.last_lat)) * COS(RADIANS(?)) *
                  POWER(SIN((RADIANS(?) - RADIANS(u.last_lng)) / 2), 2)
                )), 2
              ) as distance_km
       FROM users u
       LEFT JOIN reviews r ON r.target_user_id = u.id
       WHERE u.role IN ('driver','carrier')
         AND u.status IN ('active','idle')
         AND u.last_lat IS NOT NULL AND u.last_lng IS NOT NULL
       GROUP BY u.id
       HAVING distance_km <= ?
       ORDER BY is_free DESC, u.status DESC, distance_km ASC, rating DESC
       LIMIT 1`,
      [originLat, originLat, originLng, radius]
    );

    if (!drivers.length) {
      return res.status(404).json({ error: 'Подходящие водители не найдены в радиусе ' + radius + ' км' });
    }

    const best = drivers[0];

    // Авто-выбор диспетчера: наименее загруженный; если диспетчеров нет — текущий пользователь.
    const dispatcher = await pickDispatcher();
    const assignedDispatcherId = dispatcher?.id || dispatcherId;

    await db.execute(
      'UPDATE loads SET driver_id = ?, status = "Назначен", dispatcher_id = ? WHERE id = ?',
      [best.id, assignedDispatcherId, loadId]
    );
    await db.execute(
      'UPDATE users SET status = "active", load_id = ? WHERE id = ?',
      [loadId, best.id]
    );

    const text = `Вам назначен заказ #${loadId}. Откройте раздел «Заказы» для деталей.`;

    // Сообщение в чат (сохраняется + WebSocket-пуш)
    await sendDriverMessage(assignedDispatcherId, best.id, loadId, text);

    // Уведомление в колокольчик (переживает оффлайн)
    await createNotification(best.id, 'load_assigned', `Назначен заказ #${loadId}`, text, loadId);

    // Живой WebSocket-сигнал водителю (если онлайн)
    try {
      const { notifyDriver } = require('../sockets/trackingSocket');
      notifyDriver(best.id, 'load:assigned', { loadId, message: text });
    } catch {}

    res.json({
      success: true,
      message: 'Водитель и диспетчер назначены автоматически',
      assignment: {
        loadId,
        driver:     { id: best.id, name: best.name, distance: best.distance_km, rating: best.rating },
        dispatcher: dispatcher ? { id: dispatcher.id, name: dispatcher.name } : null,
      },
    });

  } catch (err) {
    console.error('[AutoAssign] autoAssignDriver error:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

function calcMatchScore(driver) {
  let score = 100;
  score += Math.max(0, 40 - (driver.distance_km / 10));
  score += (driver.rating || 0) * 6;
  if (driver.driver_status === 'active') score += 20;
  else if (driver.driver_status === 'idle') score += 10;
  if (driver.verified) score += 10;
  return Math.round(score);
}

module.exports = { getSuggestedDrivers, offerToDriver, autoAssignDriver };
