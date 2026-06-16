/**
 * Роуты управления ролями/правами (БД вместо localStorage).
 * Доступ — только администратор.
 */
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/roleController');
const { authenticateJWT, requireRole } = require('../middleware/auth');

router.get('/permissions',        authenticateJWT, requireRole('admin'), ctrl.getRolePermissions);
router.put('/permissions',        authenticateJWT, requireRole('admin'), ctrl.updateRolePermission);
router.post('/permissions/reset', authenticateJWT, requireRole('admin'), ctrl.resetRolePermissions);

module.exports = router;
