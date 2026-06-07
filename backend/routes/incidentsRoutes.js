const express = require('express');
const router  = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const ctrl = require('../controllers/incidentsController');

router.use(authenticateJWT);

router.get ('/',         ctrl.listIncidents);   // GET  /api/v1/incidents
router.get ('/:id',     ctrl.getIncident);     // GET  /api/v1/incidents/:id
router.post('/',        ctrl.createIncident);  // POST /api/v1/incidents
router.patch('/:id',    ctrl.updateIncident);  // PATCH /api/v1/incidents/:id
router.post('/:id/resolve', ctrl.resolveIncident); // POST /api/v1/incidents/:id/resolve

module.exports = router;
