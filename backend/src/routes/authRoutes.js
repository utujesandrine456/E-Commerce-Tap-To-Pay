const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, requireRole } = require('../middlewares/authMiddleware');
const { authLimiter } = require('../middlewares/rateLimiter');
const emailService = require('../services/emailService');

router.post('/login', authLimiter, authController.login);
router.post('/register', authenticateToken, requireRole('agent'), authController.register);
router.post('/setup-password', authLimiter, authController.setupPassword);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password', authLimiter, authController.resetPassword);
router.post('/change-password', authLimiter, authController.changePassword);

router.get('/users', authenticateToken, requireRole('agent'), authController.getUsers);
router.delete('/users/:id', authenticateToken, requireRole('agent'), authController.deleteUser);
router.get('/verify', authenticateToken, authController.verify);

// Test email endpoint (for debugging)
router.post('/test-email', authenticateToken, requireRole('agent'), async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email address required' });
  }

  try {
    const result = await emailService.sendTestEmail(email);
    res.json({
      success: true,
      message: `Test email sent to ${email}`,
      emailId: result.id
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send test email', details: error.message });
  }
});

module.exports = router;
