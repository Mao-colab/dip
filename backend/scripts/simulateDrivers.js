/**
 * Симулятор движения водителей для демонстрации защиты диплома.
 *
 * Логинится под демо-водителями (см. backend/db/seed_demo.sql, пароль demo1234),
 * затем периодически шлёт POST /tracking/ping с реалистичными координатами
 * вдоль заданных маршрутов (соответствуют ROUTES в TrackingMap.jsx).
 *
 * Эндпоинт /tracking/ping сам пишет в GPS_Logs, обновляет Users.last_lat/last_lng,
 * рассылает driver:location:update через WebSocket и проверяет геозоны/опоздания —
 * никаких изменений в бэкенде для работы симулятора не требуется.
 *
 * Запуск:  node backend/scripts/simulateDrivers.js
 * Останов: Ctrl+C (SIGINT) — корректно остановит все таймеры
 */

const API = process.env.API_URL || 'http://localhost:4000/api/v1';

// Маршруты совпадают с ROUTES в TrackingMap.jsx. loadId должен существовать
// в таблице loads и быть назначен соответствующему водителю (driver_id).
const SCENARIOS = [
  {
    name: 'Иван Петров — Брест → Берлин',
    email: 'driver@mt.by', password: 'demo1234', loadId: 19,
    points: [[52.0975, 23.7341], [52.1000, 21.8000], [52.4000, 19.0000], [52.5000, 14.5500], [52.5200, 13.4050]],
  },
  {
    name: 'Николай Зайцев — Минск → Варшава',
    email: 'driver3@mt.by', password: 'demo1234', loadId: 18,
    points: [[53.9045, 27.5615], [53.1500, 26.0000], [52.6000, 24.5000], [52.0819, 23.6181], [52.2297, 21.0122]],
  },
  {
    name: 'Роман Козлов — Гомель → Вильнюс',
    email: 'driver4@mt.by', password: 'demo1234', loadId: 20,
    points: [[52.4345, 30.9754], [53.6000, 28.5000], [54.3500, 26.5000], [54.6872, 25.2797]],
  },
];

const STEP_MS            = 4000;  // интервал отправки пинга
const STEPS_PER_SEGMENT  = 12;    // плавность хода между точками маршрута
const MAX_LOGIN_RETRIES  = 5;

const timers = [];
let stopped = false;

function lerp(a, b, t) { return a + (b - a) * t; }

function jitter(base, amplitude) {
  return base + (Math.random() * 2 - 1) * amplitude;
}

function bearing(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const y = Math.sin(toRad(b[1] - a[1])) * Math.cos(toRad(b[0]));
  const x = Math.cos(toRad(a[0])) * Math.sin(toRad(b[0])) -
    Math.sin(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.cos(toRad(b[1] - a[1]));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function login(email, password) {
  for (let attempt = 1; attempt <= MAX_LOGIN_RETRIES; attempt++) {
    try {
      const r = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await r.json().catch(() => ({}));
      if (data.token) return data.token;
      throw new Error(data.error || `HTTP ${r.status}`);
    } catch (e) {
      console.warn(`[sim] Логин ${email}: попытка ${attempt}/${MAX_LOGIN_RETRIES} не удалась — ${e.message}`);
      await sleep(1500 * attempt);
    }
  }
  throw new Error(`Не удалось авторизоваться как ${email} после ${MAX_LOGIN_RETRIES} попыток`);
}

async function sendPing(token, payload) {
  try {
    const r = await fetch(`${API}/tracking/ping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      console.warn(`[sim] Заказ #${payload.loadId}: HTTP ${r.status} ${data.error || ''}`);
    }
  } catch (e) {
    console.warn(`[sim] Заказ #${payload.loadId}: сетевая ошибка пинга — ${e.message}`);
  }
}

async function runScenario(sc) {
  let token;
  try {
    token = await login(sc.email, sc.password);
  } catch (e) {
    console.error(`[sim] ПРОПУСК сценария «${sc.name}»: ${e.message}`);
    return;
  }

  console.log(`[sim] ✓ ${sc.name} (заказ #${sc.loadId}) — запущен`);

  let segIdx = 0;
  let stepIdx = 0;

  const tick = async () => {
    if (stopped) return;

    const a = sc.points[segIdx];
    const b = sc.points[Math.min(segIdx + 1, sc.points.length - 1)];
    const t = stepIdx / STEPS_PER_SEGMENT;

    const lat = jitter(lerp(a[0], b[0], t), 0.0015);
    const lng = jitter(lerp(a[1], b[1], t), 0.0015);
    const speed = Math.round(jitter(80, 12));     // ~68-92 км/ч — реалистично для фуры на трассе
    const heading = Math.round(bearing(a, b));

    await sendPing(token, { lat, lng, loadId: sc.loadId, speed, heading, accuracy: 12 });

    stepIdx++;
    if (stepIdx > STEPS_PER_SEGMENT) {
      stepIdx = 0;
      if (segIdx < sc.points.length - 2) {
        segIdx++;
      } else {
        console.log(`[sim] ${sc.name}: прибыл в точку назначения, едет на новый круг по тому же маршруту`);
        segIdx = 0; // зацикливаем для длительной демонстрации
      }
    }
  };

  await tick();
  const timer = setInterval(tick, STEP_MS);
  timers.push(timer);
}

async function main() {
  console.log('[sim] Запуск симулятора движения водителей...');
  console.log(`[sim] API: ${API}`);

  for (const sc of SCENARIOS) {
    await runScenario(sc);
    await sleep(800); // развести старты во времени, чтобы маркеры не "прыгали" одновременно
  }

  if (timers.length === 0) {
    console.error('[sim] Ни один сценарий не запустился. Проверьте, что backend запущен и в БД есть демо-данные (seed_demo.sql).');
    process.exit(1);
  }

  console.log('[sim] Все доступные сценарии запущены. Оставьте процесс работающим во время демонстрации (Ctrl+C для остановки).');
}

function shutdown() {
  if (stopped) return;
  stopped = true;
  console.log('\n[sim] Останавливаю симулятор...');
  timers.forEach(clearInterval);
  setTimeout(() => process.exit(0), 200);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

main().catch((e) => {
  console.error('[sim] Критическая ошибка запуска:', e.message);
  process.exit(1);
});
