const express = require('express');
const router  = express.Router();
const { authenticateJWT, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/webhooksController');

router.use(authenticateJWT);
router.use(requireRole('admin', 'dispatcher', 'broker'));

router.get ('/',           ctrl.listWebhooks);  // GET    /api/v1/webhooks
router.post('/',           ctrl.createWebhook); // POST   /api/v1/webhooks
router.patch('/:id',       ctrl.updateWebhook); // PATCH  /api/v1/webhooks/:id
router.delete('/:id',      ctrl.deleteWebhook); // DELETE /api/v1/webhooks/:id
router.post('/:id/test',   ctrl.testWebhook);   // POST   /api/v1/webhooks/:id/test

module.exports = router;
