const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticateToken, requireRole } = require('../middlewares/authMiddleware');

// Public/Salesperson routes
router.get('/products', productController.getProducts);
router.get('/categories', productController.getCategories);
router.post('/products/reserve', productController.reserveProducts);

// Agent restricted routes
router.post('/products', authenticateToken, requireRole('agent'), productController.addProduct);
router.post('/categories', authenticateToken, requireRole('agent'), productController.addCategory);
router.put('/products/:id/stock', authenticateToken, requireRole('agent'), productController.updateStock);
router.post('/products/:id/add-stock', authenticateToken, requireRole('agent'), productController.addStock);
router.put('/products/:id', authenticateToken, requireRole('agent'), productController.updateProduct);
router.delete('/products/:id', authenticateToken, requireRole('agent'), productController.deleteProduct);

module.exports = router;
