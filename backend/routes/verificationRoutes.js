const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const { listDocs, addDoc, updateDoc, verifyDoc, deleteDoc } = require('../controllers/verificationController');

router.use(auth.authenticateJWT);

router.get('/:userId',          listDocs);
router.post('/:userId',         addDoc);
router.patch('/doc/:docId',     updateDoc);
router.post('/doc/:docId/verify', verifyDoc);
router.delete('/doc/:docId',    deleteDoc);

module.exports = router;
