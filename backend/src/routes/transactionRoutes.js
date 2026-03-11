const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { transactionLimiter } = require('../middlewares/rateLimiter');

// Support multiple logical mappings based on where the router is mounted
router.get('/', transactionController.getTransactions);
router.get('/transactions', transactionController.getTransactions);

router.post('/', transactionLimiter, transactionController.topup); // when mounted at /topup
router.post('/topup', transactionLimiter, transactionController.topup);

// For /pay mapping
router.post('/pay', transactionLimiter, transactionController.pay);

router.get('/:uid', transactionController.getUserTransactions);

module.exports = router;
