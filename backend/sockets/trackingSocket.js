/**
 * MT — WebSocket: Трансляция GPS-координат в реальном времени
 *
 * SRS §9.3 Мессенджер: "WebSocket push notification"
 * SRS §5 Надёжность: обновление локации каждые 30–60 секунд
 *
 * Архитектура:
 *  - Диспетчеры подписываются на комнату "tracking:all"
 *  - При каждом GPS-пинге — бродкастим всем подписчикам
 *  - Комнаты по orderId для отслеживания конкретного заказа
 *
 * 
 */

const { Server } = require('socket.io');
const jwt        = require('jsonwebtoken');

let io;

// ключи Map всегда строки (String(userId))
// Иначе Map.get(1) !== Map.get("1") — водитель не находился
const driverSockets = new Map(); // { "driverId" → Set<socketId> }

// Допустимые статусы водителя (должны совпадать со схемой БД)
const VALID_DRIVER_STATUSES = new Set(['active', 'idle', 'switched_off', 'delayed']);

/**
 * Инициализация WebSocket-сервера.
 * Вызывается один раз при старте: initTrackingSocket(httpServer)
 */
function initTrackingSocket(httpServer) {
  const socketCorsOrigin = process.env.NODE_ENV === 'production'
    ? (process.env.FRONTEND_URL || true)
    : (process.env.FRONTEND_URL || 'http://localhost:3000');

  io = new Server(httpServer, {
    cors: {
      origin:  socketCorsOrigin,
      methods: ['GET', 'POST'],
    },
    pingTimeout:  60_000,
    pingInterval: 25_000,
  });

  // ── Middleware: проверка JWT при подключении ──────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Аутентификация требуется'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded; // { id, role, name }
      next();
    } catch {
      next(new Error('Недействительный токен'));
    }
  });

  // ── Обработка подключений ─────────────────────────────────────────────────
  io.on('connection', (socket) => {
    //  всегда строка
    const userId = String(socket.user.id);
    const role   = socket.user.role;

    console.log(`[WS] Подключился ${role} #${userId} (socket: ${socket.id})`);

    // Диспетчер/брокер/админ — подписка на общий канал
    if (['dispatcher', 'broker', 'admin'].includes(role)) {
      socket.join('tracking:all');
    }

    // Водитель — регистрируем сокет для уведомлений
    if (role === 'driver') {
      if (!driverSockets.has(userId)) {
        driverSockets.set(userId, new Set());
      }
      driverSockets.get(userId).add(socket.id);
    }

    // ── Подписка на конкретный заказ ─────────────────────────────────────
    socket.on('subscribe:order', (orderId) => {
      //  валидация orderId
      if (!orderId || isNaN(Number(orderId))) return;
      socket.join(`order:${orderId}`);
      console.log(`[WS] Socket ${socket.id} подписан на заказ #${orderId}`);
    });

    socket.on('unsubscribe:order', (orderId) => {
      if (!orderId) return;
      socket.leave(`order:${orderId}`);
    });

    // ── Обновление статуса водителя ──────────────────────────────────────
    socket.on('driver:status', ({ status }) => {
      if (role !== 'driver') return;

      //  валидация статуса — только допустимые значения из БД
      if (!VALID_DRIVER_STATUSES.has(status)) {
        console.warn(`[WS] Недопустимый статус "${status}" от водителя #${userId}`);
        return;
      }

      io.to('tracking:all').emit('driver:status:update', {
        driverId:  userId,
        status,
        timestamp: new Date().toISOString(),
      });
    });

    // ── Отключение ────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      if (role === 'driver') {
        const sockets = driverSockets.get(userId);
        if (sockets) {
          sockets.delete(socket.id);

          // Если у водителя не осталось активных сокетов — он оффлайн
          if (sockets.size === 0) {
            driverSockets.delete(userId);
            io.to('tracking:all').emit('driver:status:update', {
              driverId:  userId,
              status:    'switched_off',
              timestamp: new Date().toISOString(),
            });
          }
        }
      }
      console.log(`[WS] Отключился ${role} #${userId} (socket: ${socket.id})`);
    });
  });

  return io;
}

/**
 * Рассылает GPS-координаты водителя:
 *  1. Всем диспетчерам в "tracking:all"
 *  2. Подписчикам конкретного заказа в "order:${loadId}"
 *
 * Вызывается из trackingController.receiveGpsPing()
 *
 * @param {{ driverId, loadId, lat, lng, speed, heading, timestamp }} payload
 */
function broadcastDriverLocation(payload) {
  if (!io) {
    console.warn('[WS] Socket.io не инициализирован');
    return;
  }

  const event = 'driver:location:update';

  // Всем диспетчерам
  io.to('tracking:all').emit(event, payload);

  // Подписчикам конкретного заказа
  if (payload.loadId) {
    io.to(`order:${payload.loadId}`).emit(event, payload);
  }
}

/**
 * Отправляет уведомление конкретному водителю.
 * Используется при назначении заказа (Assign).
 *
 * @param {string|number} driverId
 * @param {string} event
 * @param {any} data
 */
function notifyDriver(driverId, event, data) {
  if (!io) return;

  // приводим к строке для поиска в Map
  const sockets = driverSockets.get(String(driverId));

  if (!sockets || sockets.size === 0) {
    console.log(`[WS] Водитель #${driverId} оффлайн — уведомление не доставлено`);
    return;
  }

  sockets.forEach((socketId) => {
    io.to(socketId).emit(event, data);
  });
}

module.exports = { initTrackingSocket, broadcastDriverLocation, notifyDriver };