const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const { listAuditLogs } = require('../controllers/auditController');

router.use(auth.authenticateJWT);
router.get('/', listAuditLogs);

module.exports = router;
