/**
 * MT — Модуль GPS-отслеживания
 * Маршруты API (RESTful) для Telematics & Tracking Module
 * SRS: §9.2 — POST /ping, GET /:driverId, GET /routes/:orderId
 *
 * Все запросы защищены JWT-токеном (RBAC: SRS §5 — Безопасность)
 *
 * 
 
 */

const express    = require('express');
const router     = express.Router();
const ctrl       = require('../controllers/trackingController');
const { authenticateJWT, requireRole } = require('../middleware/auth');


// Водитель отправляет GPS-координаты каждые 30–60 сек (SRS §5 — Надёжность).
// Доступ: только роль "driver"
router.post(
  '/ping',
  authenticateJWT,
  requireRole('driver'),
  ctrl.receiveGpsPing
);

// 

// Плановый маршрут + фактический трек водителя.
// Используется для синей линии на карте (SRS FR-06).
// Доступ: dispatcher, broker, admin
router.get(
  '/routes/:orderId',
  authenticateJWT,
  requireRole('dispatcher', 'broker', 'admin'),
  ctrl.getOrderRoute
);


// Текущая позиция водителя + последние путевые точки.
// Используется для маркера на карте диспетчера.
// Доступ: dispatcher, broker, admin
router.get(
  '/:driverId',
  authenticateJWT,
  requireRole('dispatcher', 'broker', 'admin'),
  ctrl.getDriverLocation
);

module.exports = router;