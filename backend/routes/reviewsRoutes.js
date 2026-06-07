const express = require('express');
const router  = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const ctrl = require('../controllers/reviewsController');

router.use(authenticateJWT);

router.get ('/:userId', ctrl.getUserReviews); // GET  /api/v1/reviews/:userId
router.post('/',        ctrl.createReview);   // POST /api/v1/reviews
router.delete('/:id',  ctrl.deleteReview);   // DELETE /api/v1/reviews/:id

module.exports = router;
