const express = require('express');
const router = express.Router();
const { authenticateJWT, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/autoassignController');

// Все роуты требуют авторизации
router.use(authenticateJWT);

// GET /api/v1/autoassign/suggest/:loadId - Получить список подходящих водителей
router.get('/suggest/:loadId', ctrl.getSuggestedDrivers);

// POST /api/v1/autoassign/offer/:loadId - Предложить заказ конкретному водителю
router.post('/offer/:loadId', requireRole('broker', 'dispatcher'), ctrl.offerToDriver);

// POST /api/v1/autoassign/assign/:loadId - Автоматически назначить лучшего водителя
router.post('/assign/:loadId', requireRole('dispatcher', 'admin'), ctrl.autoAssignDriver);

module.exports = router;