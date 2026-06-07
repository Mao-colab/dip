const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const {
  listNotifications, markRead, markAllRead, deleteNotification
} = require('../controllers/notificationsController');

router.use(auth.authenticateJWT);

router.get('/',              listNotifications);
router.patch('/read-all',    markAllRead);
router.patch('/:id/read',    markRead);
router.delete('/:id',        deleteNotification);

module.exports = router;
