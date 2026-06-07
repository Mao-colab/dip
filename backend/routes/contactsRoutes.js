const express = require('express');
const router  = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const ctrl    = require('../controllers/contactsController');

router.use(authenticateJWT);

router.get   ('/',                 ctrl.getContacts);         // GET  /api/v1/contacts
router.get   ('/catalog',          ctrl.getCatalog);          // GET  /api/v1/contacts/catalog
router.post  ('/:id/review',       ctrl.leaveReview);         // POST /api/v1/contacts/:id/review
router.post  ('/:id/blacklist',    ctrl.addToBlacklist);      // POST /api/v1/contacts/:id/blacklist
router.delete('/:id/blacklist',    ctrl.removeFromBlacklist); // DELETE /api/v1/contacts/:id/blacklist

module.exports = router;
