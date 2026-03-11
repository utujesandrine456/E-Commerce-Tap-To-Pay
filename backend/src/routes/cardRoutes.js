const express = require('express');
const router = express.Router();
const cardController = require('../controllers/cardController');
const { authenticateToken, requireRole } = require('../middlewares/authMiddleware');

router.get('/', cardController.getCards);
router.get('/:uid', cardController.getCard);
router.put('/:uid', authenticateToken, requireRole('agent'), cardController.updateCard);
router.delete('/:uid', authenticateToken, requireRole('agent'), cardController.deleteCard);

router.post('/:uid/set-passcode', cardController.setPasscode);
router.post('/:uid/change-passcode', cardController.changePasscode);
router.post('/:uid/verify-passcode', cardController.verifyCardPasscode);

module.exports = router;
