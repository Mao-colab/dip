const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const { calculateRate, saveQuote, getHistory, deleteQuote } = require('../controllers/rateController');

router.use(auth.authenticateJWT);

router.post('/calculate', calculateRate);
router.post('/save',      saveQuote);
router.get('/history',    getHistory);
router.delete('/:id',     deleteQuote);

module.exports = router;
