const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const {
  listClaims, getClaim, createClaim, updateClaim, resolveClaim, deleteClaim
} = require('../controllers/claimsController');

router.use(auth.authenticateJWT);

router.get('/',         listClaims);
router.get('/:id',      getClaim);
router.post('/',        createClaim);
router.patch('/:id',    updateClaim);
router.post('/:id/resolve', resolveClaim);
router.delete('/:id',   deleteClaim);

module.exports = router;
