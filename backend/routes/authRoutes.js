const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/authController');
const { authenticateJWT } = require('../middleware/auth');

router.post('/register',        ctrl.register);
router.post('/login',           ctrl.login);
router.post('/logout',          authenticateJWT, ctrl.logout);
router.post('/change-password', authenticateJWT, ctrl.changePassword);
router.get ('/me',              authenticateJWT, ctrl.me);

module.exports = router;
