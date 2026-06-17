/**
 * MT — Симулятор движения транспорта (демо-режим трекинга)
 *
 * В реальной эксплуатации координаты приходят от мобильного приложения водителя
 * (POST /api/v1/tracking/ping). Для защиты дипломного проекта и демо-стендов,
 * где живых водителей нет, этот модуль периодически «двигает» демо-водителей
 * по заранее заданным маршрутам и транслирует их позиции диспетчерам через
 * тот же самый WebSocket-канал (broadcastDriverLocation), что и реальные пинги.
 *
 * Важно:
 *  - loadId маршрутов (18–21) и геометрия точек СОВПАДАЮТ с константой ROUTES
 *    во фронтенде (TrackingMap.jsx), поэтому на карте рисуются маршрутные линии.
 *  - driverId (8–11) совпадают с демо-водителями из seed_demo.sql.
 *  - В БД ничего не пишется — только трансляция в комнату "tracking:all".
 *
 * Управление: переменная окружения TRACKING_SIM=off полностью отключает симулятор.
 */

const { broadcastDriverLocation } = require('./trackingSocket');

// ── Маршруты (точки идентичны ROUTES в frontend/src/components/TrackingMap.jsx) ──
// start — начальный прогресс (0..1), чтобы машины стартовали в разных местах.
// status — цвет маркера: active=зелёный, delayed=оранжевый, switched_off=красный.
const TRIPS = [
  {
    driverId: 8, loadId: 19, label: 'Брест → Берлин', start: 0.10, dir: 1, status: 'active',
    speedKmh: [78, 92],
    points: [[52.0975, 23.7341], [52.1000, 21.8000], [52.4000, 19.0000], [52.5000, 14.5500], [52.5200, 13.4050]],
  },
  {
    driverId: 10, loadId: 18, label: 'Минск → Варшава', start: 0.35, dir: 1, status: 'active',
    speedKmh: [70, 85],
    points: [[53.9045, 27.5615], [53.1500, 26.0000], [52.6000, 24.5000], [52.0819, 23.6181], [52.2297, 21.0122]],
  },
  {
    driverId: 11, loadId: 20, label: 'Гомель → Вильнюс', start: 0.55, dir: 1, status: 'delayed',
    speedKmh: [40, 60], // задержка — едет медленнее
    points: [[52.4345, 30.9754], [53.6000, 28.5000], [54.3500, 26.5000], [54.6872, 25.2797]],
  },
  {
    driverId: 9, loadId: 21, label: 'Витебск → Рига', start: 0.78, dir: 1, status: 'switched_off',
    speedKmh: [50, 70],
    points: [[55.1904, 30.2049], [55.5000, 27.0000], [56.0000, 25.5000], [56.9460, 24.1059]],
  },
];

const TICK_MS = 2500; // как часто двигаем машины

let timer = null;

// ── Геометрия: длины сегментов и интерполяция позиции по прогрессу 0..1 ────────
function prepare(trip) {
  const segLen = [];
  let total = 0;
  for (let i = 1; i < trip.points.length; i++) {
    const [a, b] = [trip.points[i - 1], trip.points[i]];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    segLen.push(d);
    total += d;
  }
  trip._segLen = segLen;
  trip._total = total || 1;
  trip.progress = trip.start;
}

/** Возвращает [lat, lng] на маршруте по прогрессу t (0..1). */
function positionAt(trip, t) {
  const target = Math.max(0, Math.min(1, t)) * trip._total;
  let acc = 0;
  for (let i = 0; i < trip._segLen.length; i++) {
    const len = trip._segLen[i];
    if (acc + len >= target || i === trip._segLen.length - 1) {
      const f = len > 0 ? (target - acc) / len : 0;
      const a = trip.points[i];
      const b = trip.points[i + 1];
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    }
    acc += len;
  }
  return trip.points[trip.points.length - 1];
}

/** Азимут (heading, град.) от точки a к точке b. */
function bearing(a, b) {
  const toRad = (x) => (x * Math.PI) / 180;
  const toDeg = (x) => (x * 180) / Math.PI;
  const dLng = toRad(b[1] - a[1]);
  const y = Math.sin(dLng) * Math.cos(toRad(b[0]));
  const x =
    Math.cos(toRad(a[0])) * Math.sin(toRad(b[0])) -
    Math.sin(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function tick() {
  for (const trip of TRIPS) {
    // Шаг прогресса за тик — небольшой, со случайной вариацией (≈ полный путь за 3–4 мин)
    const step = (0.012 + Math.random() * 0.006) * trip.dir;
    let next = trip.progress + step;

    // «Маятник»: дойдя до конца маршрута — разворачиваемся (демо никогда не замирает)
    if (next >= 1) { next = 1; trip.dir = -1; }
    else if (next <= 0) { next = 0; trip.dir = 1; }

    const cur = positionAt(trip, trip.progress);
    const pos = positionAt(trip, next);
    const head = bearing(cur, pos);
    const [vMin, vMax] = trip.speedKmh;
    const speed = Math.round(vMin + Math.random() * (vMax - vMin));

    trip.progress = next;

    broadcastDriverLocation({
      driverId: trip.driverId,
      loadId: trip.loadId,
      lat: Number(pos[0].toFixed(5)),
      lng: Number(pos[1].toFixed(5)),
      speed,
      heading: Math.round(head),
      progress: Number(trip.progress.toFixed(3)),
      status: trip.status, // цвет маркера на карте
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Запускает симулятор. Безопасно вызывать один раз после initTrackingSocket().
 */
function startTrackingSimulator() {
  if (String(process.env.TRACKING_SIM).toLowerCase() === 'off') {
    console.log('ℹ️  Симулятор трекинга отключён (TRACKING_SIM=off)');
    return;
  }
  if (timer) return; // защита от повторного запуска

  TRIPS.forEach(prepare);
  timer = setInterval(tick, TICK_MS);
  if (typeof timer.unref === 'function') timer.unref(); // не держим event loop
  console.log(`🚚 Симулятор трекинга запущен: ${TRIPS.length} водителя движутся по маршрутам (тик ${TICK_MS} мс)`);
}

function stopTrackingSimulator() {
  if (timer) { clearInterval(timer); timer = null; }
}

module.exports = { startTrackingSimulator, stopTrackingSimulator };
