/**
 * MT — Контроллер автоматического подбора водителей (Auto-Assignment)
 */

const db = require('../db/connection');

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
    const originLat   = load.origin_lat;
    const originLng   = load.origin_lng;

    if (!originLat || !originLng) {
      return res.json({
        loadId, suggestions: [], totalFound: 0, searchRadius: radius,
        criteria: { vehicleType, origin: { city: load.origin_city } },
      });
    }

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
       HAVING distance_km <= ? AND (vehicle_match = 1 OR ? IS NULL)
       ORDER BY u.status DESC, distance_km ASC, rating DESC
       LIMIT ${parseInt(limit) | 0}`,
      [
        originLat, originLat, originLng,
        vehicleType, vehicleType, vehicleType,
        load.driver_id || 0,
        Number(radius), vehicleType,
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

    await db.execute(
      `INSERT INTO messages (sender_id, receiver_id, order_id, text, type, is_read, created_at)
       VALUES (?, ?, ?, ?, 'system', 0, NOW(3))`,
      [senderId, driverId, loadId, text]
    );

    // Уведомление через WebSocket
    try {
      const { broadcastChatMessage } = require('../sockets/chatSocket');
      broadcastChatMessage(driverId, { senderId, receiverId: driverId, orderId: loadId, text, type: 'system' });
    } catch {}

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
      'SELECT id, origin_lat, origin_lng, vehicle_type FROM loads WHERE id = ? AND status IN ("Новый","Запрошен") AND driver_id IS NULL',
      [loadId]
    );
    if (!load) return res.status(400).json({ error: 'Заказ не найден или уже назначен' });

    if (!load.origin_lat || !load.origin_lng) {
      return res.status(400).json({ error: 'У заказа не указаны координаты погрузки' });
    }

    const radius = criteria.radius || 1000;

    const [drivers] = await db.execute(
      `SELECT u.id,
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
         AND u.load_id IS NULL
       GROUP BY u.id
       HAVING distance_km <= ?
       ORDER BY u.status DESC, distance_km ASC, rating DESC
       LIMIT 1`,
      [load.origin_lat, load.origin_lat, load.origin_lng, radius]
    );

    if (!drivers.length) {
      return res.status(404).json({ error: 'Подходящие водители не найдены в радиусе ' + radius + ' км' });
    }

    const best = drivers[0];

    await db.execute(
      'UPDATE loads SET driver_id = ?, status = "Назначен", dispatcher_id = ? WHERE id = ?',
      [best.id, dispatcherId, loadId]
    );
    await db.execute(
      'UPDATE users SET status = "active", load_id = ? WHERE id = ?',
      [loadId, best.id]
    );

    // Уведомить водителя через WebSocket
    try {
      const { notifyDriver } = require('../sockets/trackingSocket');
      notifyDriver(best.id, 'load:assigned', { loadId, message: 'Вам назначен новый заказ' });
    } catch {}

    res.json({
      success: true,
      message: 'Водитель назначен автоматически',
      assignment: { loadId, driver: { id: best.id, distance: best.distance_km, rating: best.rating } },
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
