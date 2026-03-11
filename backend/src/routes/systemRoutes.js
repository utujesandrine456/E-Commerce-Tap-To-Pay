const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');
const { authenticateToken, requireRole } = require('../middlewares/authMiddleware');
const PRODUCTS = require('../config/products');

router.get('/settings', authenticateToken, requireRole('agent'), systemController.getSettings);
router.put('/settings', authenticateToken, requireRole('agent'), systemController.updateSettings);
router.get('/stats', systemController.getStats);
router.get('/products', (req, res) => res.json(PRODUCTS));

module.exports = router;
