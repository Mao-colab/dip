/**
 * MT — Chat Routes
 * FR-07: Маршруты API мессенджера
 */

const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/chatController');
const { authenticateJWT, requireRole } = require('../middleware/auth');

// Все маршруты требуют авторизации
router.use(authenticateJWT);

// GET /api/v1/chat/contacts — список чатов (все авторизованные)
router.get('/contacts', ctrl.getContacts);

// GET /api/v1/chat/user/:userId — прямые сообщения с пользователем
router.get('/user/:userId', ctrl.getDirectHistory);

// GET /api/v1/chat/:orderId — история по заказу
router.get('/:orderId', ctrl.getChatHistory);

// POST /api/v1/chat/send — отправить сообщение
router.post('/send', ctrl.sendMessage);

module.exports = router;
