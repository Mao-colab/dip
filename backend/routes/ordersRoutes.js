const express  = require('express');
const router   = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const auditLog = require('../middleware/auditLog');
const ctrl     = require('../controllers/ordersController');

router.use(authenticateJWT);

router.get ('/',            ctrl.getLoads);                                    // GET  /api/v1/loads
router.get ('/aging',       ctrl.getAgingLoads);                               // GET  /api/v1/loads/aging
router.get ('/:id',         ctrl.getLoadById);                                 // GET  /api/v1/loads/:id
router.post('/',            auditLog('create', 'load'), ctrl.createLoad);      // POST /api/v1/loads
router.patch('/:id',        auditLog('update', 'load'), ctrl.updateLoad);      // PATCH /api/v1/loads/:id
router.post('/:id/pod',     auditLog('pod', 'load'),    ctrl.confirmDelivery); // POST /api/v1/loads/:id/pod

module.exports = router;
