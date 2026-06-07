const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const { generateTtn, generateCmr, generateInvoice } = require('../controllers/pdfController');

router.use(auth.authenticateJWT);

router.get('/load/:id/ttn',     generateTtn);
router.get('/load/:id/cmr',     generateCmr);
router.get('/load/:id/invoice', generateInvoice);

module.exports = router;
