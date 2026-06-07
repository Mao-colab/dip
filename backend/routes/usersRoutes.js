const express = require('express');
const router  = express.Router();
const { authenticateJWT, requireRole } = require('../middleware/auth');
const auditLog = require('../middleware/auditLog');
const ctrl    = require('../controllers/usersController');

router.use(authenticateJWT);

// FR-15: CRUD пользователей
router.get ('/',           ctrl.getUsers);          // GET  /api/v1/users
router.get ('/:id',        ctrl.getUserById);       // GET  /api/v1/users/:id
router.patch('/:id',       auditLog('update','user'), ctrl.updateUser);                            // PATCH /api/v1/users/:id
router.delete('/:id',      requireRole('admin'), auditLog('delete','user'), ctrl.deleteUser);     // DELETE /api/v1/users/:id

// NFR-06: GDPR
router.delete('/:id/personal-data', auditLog('gdpr_delete','user'), ctrl.deletePersonalData);    // DELETE /api/v1/users/:id/personal-data

// FR-19: Транспортные средства
router.get   ('/:userId/vehicles',           ctrl.getVehicles);                                   // GET    /api/v1/users/:userId/vehicles
router.post  ('/vehicles',                   ctrl.addVehicle);                                    // POST   /api/v1/users/vehicles
router.patch ('/vehicles/:vehicleId',        ctrl.updateVehicle);                                 // PATCH  /api/v1/users/vehicles/:vehicleId
router.delete('/vehicles/:vehicleId',        ctrl.deleteVehicle);                                 // DELETE /api/v1/users/vehicles/:vehicleId

module.exports = router;
