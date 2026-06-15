/**
 * MT — Tracking Controller
 * Бизнес-логика GPS-модуля: запись пингов, выдача координат, маршруты.
 *
 * Реализованные требования SRS:
 *  - FR-04: Карта отслеживания в реальном времени
 *  - FR-05: Мониторинг статуса водителя
 *  - §5 Надёжность: пинги каждые 30–60 сек
 *  - §12 Риски: Dead Reckoning при потере GPS-сигнала
 *  - §7.1 ERD: таблица gps_logs (driverId, loadId, lat, lng, timestamp)
 */

const db = require('../db/connection');
const { broadcastDriverLocation } = require('../sockets/trackingSocket');

// ─── Константы ───────────────────────────────────────────────────────────────
const WAYPOINTS_LIMIT       = 10;    // Количество последних точек маршрута
const STALE_SIGNAL_MS       = 90_000; // 90 сек без пинга → потеря сигнала
const DELAYED_THRESHOLD_MIN = 15;    // Опоздание более 15 мин → статус "delayed"

// ─────────────────────────────────────────────────────────────────────────────
// Тело запроса: { lat, lng, loadId, speed, heading, accuracy }
// ─────────────────────────────────────────────────────────────────────────────
exports.receiveGpsPing = async (req, res) => {
  const driverId = req.user.id; // из JWT-токена

  const {
    lat,
    lng,
    loadId    = null,
    speed     = 0,
    heading   = 0,
    accuracy  = 0,
  } = req.body;

  // Валидация координат
  if (lat == null || lng == null) {
    return res.status(400).json({ error: 'Координаты обязательны' });
  }
  if (lat < -90 || lat > 90) {
    return res.status(400).json({ error: 'Широта должна быть от -90 до 90' });
  }
  if (lng < -180 || lng > 180) {
    return res.status(400).json({ error: 'Долгота должна быть от -180 до 180' });
  }

  // валидация loadId — должен быть числом или null
  const safeLoadId = loadId != null && !isNaN(Number(loadId))
    ? Number(loadId)
    : null;

  try {
    // 1. Записываем пинг в gps_logs
    const [result] = await db.execute(
      `INSERT INTO gps_logs (driver_id, load_id, lat, lng, speed, heading, accuracy, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(3))`,
      [driverId, safeLoadId, lat, lng, speed, heading, accuracy]
    );

    // 2. Обновляем текущую позицию водителя в таблице users
    await db.execute(
      `UPDATE users
       SET last_lat = ?, last_lng = ?, last_ping_at = NOW(3), status = 'active'
       WHERE id = ?`,
      [lat, lng, driverId]
    );

    // 3. Проверяем опоздание (FR-05) и геозоны (FR-21)
    if (safeLoadId) {
      try {
        await checkAndMarkDelayed(driverId, safeLoadId);
      } catch (delayErr) {
        console.warn('[Delayed Check Error]', delayErr.message);
      }
      try {
        await checkGeofence(driverId, safeLoadId, lat, lng);
      } catch (geoErr) {
        console.warn('[Geofence Check Error]', geoErr.message);
      }
    }

    // 4. Рассылаем координаты диспетчерам через WebSocket
    broadcastDriverLocation({
      driverId,
      loadId: safeLoadId,
      lat,
      lng,
      speed,
      heading,
      timestamp: new Date().toISOString(),
    });

    return res.status(200).json({ ok: true, logId: result.insertId });
  } catch (err) {
    console.error('[GPS Ping Error]', err);
    return res.status(500).json({ error: 'Ошибка сервера при записи пинга' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Возвращает: текущую позицию + последние WAYPOINTS_LIMIT точек
// ─────────────────────────────────────────────────────────────────────────────
exports.getDriverLocation = async (req, res) => {
  const { driverId } = req.params;

  if (isNaN(Number(driverId))) {
    return res.status(400).json({ error: 'Некорректный ID водителя' });
  }

  try {
    // 1. Текущая позиция водителя
    const [[driver]] = await db.execute(
      `SELECT id, name, last_lat, last_lng, last_ping_at, status, load_id
       FROM users WHERE id = ? AND role = 'driver'`,
      [driverId]
    );

    if (!driver) {
      return res.status(404).json({ error: 'Водитель не найден' });
    }

    // 2. Последние N путевых точек
    const [waypoints] = await db.execute(
      `SELECT lat, lng, speed, heading, created_at
       FROM gps_logs
       WHERE driver_id = ?
       ORDER BY created_at DESC
       LIMIT ${WAYPOINTS_LIMIT}`,
      [driverId]
    );

    // 3. Dead Reckoning при потере сигнала (SRS §12)
    const lastPingAge = driver.last_ping_at
      ? Date.now() - new Date(driver.last_ping_at).getTime()
      : Infinity;

    const signalLost = lastPingAge > STALE_SIGNAL_MS;
    let estimatedPosition = null;

    if (signalLost && waypoints.length >= 2) {
      estimatedPosition = deadReckoning(waypoints[0], waypoints[1], lastPingAge);
    }

    return res.status(200).json({
      driverId,
      name:   driver.name,
      status: driver.status,
      loadId: driver.load_id,
      currentPosition: {
        lat:       driver.last_lat,
        lng:       driver.last_lng,
        timestamp: driver.last_ping_at,
      },
      signalLost,
      estimatedPosition,
      waypoints: waypoints.reverse(), // хронологический порядок
    });
  } catch (err) {
    console.error('[Get Driver Location Error]', err);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Плановый маршрут + фактический трек + ETA
// ─────────────────────────────────────────────────────────────────────────────
exports.getOrderRoute = async (req, res) => {
  const { orderId } = req.params;

  if (isNaN(Number(orderId))) {
    return res.status(400).json({ error: 'Некорректный ID заказа' });
  }

  try {
    // 1. Данные заказа
    const [[load]] = await db.execute(
      `SELECT id, origin_lat, origin_lng, origin_addr AS origin_address,
              dest_lat, dest_lng, destination_addr AS dest_address,
              driver_id, planned_pickup_at, planned_delivery_at, status
       FROM loads WHERE id = ?`,
      [orderId]
    );

    if (!load) {
      return res.status(404).json({ error: 'Заказ не найден' });
    }

    // 2. Фактический трек по заказу
    const [actualTrack] = await db.execute(
      `SELECT lat, lng, speed, created_at
       FROM gps_logs
       WHERE load_id = ?
       ORDER BY created_at ASC`,
      [orderId]
    );

    // расстояние в километрах
    const distanceTraveled = calculateTotalDistanceKm(actualTrack);

    //  ETA использует км/ч 
    const recentPoints = actualTrack.slice(-5);
    const eta = estimateETA(recentPoints, load);

    return res.status(200).json({
      orderId,
      status: load.status,
      plannedRoute: {
        origin: {
          lat:     load.origin_lat,
          lng:     load.origin_lng,
          address: load.origin_address,
        },
        destination: {
          lat:     load.dest_lat,
          lng:     load.dest_lng,
          address: load.dest_address,
        },
        plannedPickupAt:   load.planned_pickup_at,
        plannedDeliveryAt: load.planned_delivery_at,
      },
      actualTrack,
      distanceTraveled, //  пройдено км
      eta,
    });
  } catch (err) {
    console.error('[Get Order Route Error]', err);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// Вспомогательные функции
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Dead Reckoning — оценка позиции при потере GPS-сигнала.
 * Экстраполирует по вектору движения между двумя последними точками.
 * SRS §12: "Use Dead Reckoning algorithms to estimate position until signal is restored."
 */
function deadReckoning(last, prev, elapsedMs) {
  const dtPrev =
    new Date(last.created_at).getTime() - new Date(prev.created_at).getTime();

  if (dtPrev <= 0) return null;

  const dLat = (last.lat - prev.lat) / dtPrev;
  const dLng = (last.lng - prev.lng) / dtPrev;

  // Ограничиваем экстраполяцию 5 минутами
  const clampedElapsed = Math.min(elapsedMs, 5 * 60 * 1000);

  return {
    lat:              last.lat + dLat * clampedElapsed,
    lng:              last.lng + dLng * clampedElapsed,
    isEstimated:      true,
    basedOnLastPing:  last.created_at,
  };
}

/**
 * Haversine: расстояние между двумя точками в КИЛОМЕТРАХ.
 *  R = 6371 (км)
 */
function haversineKm(p1, p2) {
  const R     = 6371; // км
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat  = toRad(p2.lat - p1.lat);
  const dLng  = toRad(p2.lng - p1.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Суммарное расстояние по массиву GPS-точек в километрах.
 */
function calculateTotalDistanceKm(points) {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineKm(points[i - 1], points[i]);
  }
  return Math.round(total * 10) / 10; // до 0.1 км
}

/**
 * Оценка ETA на основе средней скорости последних точек.

 * @returns {string|null} ISO-строка или null
 */
function estimateETA(recentPoints, load) {
  if (!recentPoints.length || !load.dest_lat) return null;

  const lastPoint = recentPoints[recentPoints.length - 1];

  //  Средняя скорость в км/ч 
  const avgSpeedKmh =
    recentPoints.reduce((sum, p) => sum + (p.speed || 0), 0) /
    recentPoints.length;

  if (avgSpeedKmh < 1) return null; // Стоим — ETA не рассчитать

  // Оставшееся расстояние в км
  const remainingKm = haversineKm(lastPoint, {
    lat: load.dest_lat,
    lng: load.dest_lng,
  });

  const hoursLeft = remainingKm / avgSpeedKmh;
  const eta = new Date(Date.now() + hoursLeft * 3_600_000);
  return eta.toISOString();
}

/**
 * FR-21: Геозоны — автоматическая смена статуса заявки при въезде в радиус
 * точки погрузки (→ Забран) или доставки (→ Доставлен).
 */
async function checkGeofence(driverId, loadId, lat, lng) {
  const [[load]] = await db.execute(
    `SELECT status,
            origin_lat, origin_lng,
            dest_lat,   dest_lng,
            IFNULL(geofence_radius_m, 500) AS radius_m,
            dispatcher_id
     FROM loads WHERE id = ? AND driver_id = ?`,
    [loadId, driverId]
  );

  if (!load) return;

  if (load.status === 'Назначен' && load.origin_lat && load.origin_lng) {
    const distM = haversineKm({ lat, lng }, { lat: load.origin_lat, lng: load.origin_lng }) * 1000;
    if (distM <= load.radius_m) {
      await db.execute("UPDATE loads SET status = 'Забран' WHERE id = ?", [loadId]);
      console.log(`[Geofence] Заказ #${loadId}: статус → Забран (${Math.round(distM)}м от точки погрузки)`);
      await _geoNotify(load.dispatcher_id, loadId, 'Забран');
    }
  }

  if (load.status === 'Забран' && load.dest_lat && load.dest_lng) {
    const distM = haversineKm({ lat, lng }, { lat: load.dest_lat, lng: load.dest_lng }) * 1000;
    if (distM <= load.radius_m) {
      await db.execute("UPDATE loads SET status = 'Доставлен' WHERE id = ?", [loadId]);
      console.log(`[Geofence] Заказ #${loadId}: статус → Доставлен (${Math.round(distM)}м от точки назначения)`);
      await _geoNotify(load.dispatcher_id, loadId, 'Доставлен');
    }
  }
}

async function _geoNotify(dispatcherId, loadId, newStatus) {
  if (!dispatcherId) return;
  try {
    await db.execute(
      `INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id)
       VALUES (?, 'geofence', ?, ?, 'load', ?)`,
      [dispatcherId,
       `Заказ #${loadId}: ${newStatus}`,
       `Система автоматически сменила статус заказа #${loadId} на «${newStatus}» по геозоне.`,
       loadId]
    );
  } catch {}
}

/**
 * Проверяет опоздание и обновляет статус заказа на "delayed".
 * SRS FR-05: Мониторинг статуса водителя.
 */
async function checkAndMarkDelayed(driverId, loadId) {
  const [[load]] = await db.execute(
    `SELECT planned_pickup_at, planned_delivery_at, status
     FROM loads WHERE id = ? AND driver_id = ?`,
    [loadId, driverId]
  );

  if (!load) return;

  // Не трогаем уже завершённые или помеченные заказы
  if (['delivered', 'delayed', 'paid', 'archived'].includes(load.status)) return;

  const now         = new Date();
  const plannedTime = new Date(
    load.status === 'assigned'
      ? load.planned_pickup_at
      : load.planned_delivery_at
  );

  // plannedTime может быть null если не задано
  if (!plannedTime || isNaN(plannedTime.getTime())) return;

  const delayMin = (now - plannedTime) / 60_000;

  if (delayMin >= DELAYED_THRESHOLD_MIN) {
    await db.execute(
      `UPDATE loads SET status = 'delayed', delay_minutes = ? WHERE id = ?`,
      [Math.round(delayMin), loadId]
    );
    console.log(
      `[Задержка] Заказ #${loadId}, водитель #${driverId}, опоздание: ${Math.round(delayMin)} мин`
    );
  }
}