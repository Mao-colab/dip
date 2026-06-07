const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const { exportLoads, exportAnalytics, exportClaims } = require('../controllers/exportController');

router.use(auth.authenticateJWT);

router.get('/loads',     exportLoads);
router.get('/analytics', exportAnalytics);
router.get('/claims',    exportClaims);

module.exports = router;
