const jwt = require('jsonwebtoken');
const User = require('../models/User');
const emailService = require('../services/emailService');
const { hashPassword, verifyPassword, generateToken } = require('../helpers/cryptoHelpers');
const { JWT_SECRET } = require('../middlewares/authMiddleware');

const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username/email and password are required' });
  }

  try {
    const searchTerm = username.toLowerCase().trim();

    const query = {
      $or: [{ username: searchTerm }]
    };

    if (searchTerm.includes('@')) {
      query.$or.push({ email: searchTerm });
    }

    const user = await User.findOne(query);

    if (!user) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    if (!user.passwordSet || !user.password) {
      return res.status(403).json({
        error: 'Password not set. Please use your setup link to set your password.',
        needsSetup: true,
        setupRequired: true
      });
    }

    const isValid = await verifyPassword(password, user.password);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    if (user.forcePasswordChange) {
      const changeToken = generateToken();
      user.resetToken = changeToken;
      user.resetTokenExpiry = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour
      await user.save();

      return res.status(403).json({
        error: 'You must change your password before continuing.',
        forcePasswordChange: true,
        changeToken: changeToken,
        username: user.username
      });
    }

    user.lastLogin = Date.now();
    await user.save();

    const token = jwt.sign(
      { id: user._id, username: user.username, fullName: user.fullName, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        lastLogin: user.lastLogin
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
};

const register = async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    return res.status(400).json({ error: 'Full name and email are required' });
  }

  let username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');

  try {
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }

    let existing = await User.findOne({ username });
    let counter = 1;
    while (existing) {
      username = `${email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')}${counter}`;
      existing = await User.findOne({ username });
      counter++;
    }

    const setupToken = generateToken();
    const setupTokenExpiry = new Date(Date.now() + 72 * 60 * 60 * 1000);

    const user = new User({
      username,
      fullName,
      email: email.toLowerCase(),
      role: 'salesperson',
      passwordSet: false,
      setupToken,
      setupTokenExpiry
    });

    await user.save();

    // Use current request to guess frontend url or default port replacement
    const setupUrl = `${req.protocol}://${req.get('host').replace(':8208', ':5173').replace(':8080', ':5173')}?setup=${setupToken}`;

    emailService.sendSetupEmail(email, fullName, username, setupUrl)
      .catch(emailError => console.error('Failed to send email:', emailError));

    res.json({
      success: true,
      message: `Salesperson ${fullName} created. Setup email sent to ${email}.`,
      setupUrl, // keeping setupUrl in response for dev usage
      username,
      email: email.toLowerCase()
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
};

const setupPassword = async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: 'Token and password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const user = await User.findOne({
      setupToken: token,
      setupTokenExpiry: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired setup link. Please contact your agent.' });
    }

    const hashedPassword = await hashPassword(password);

    user.password = hashedPassword;
    user.passwordSet = true;
    user.setupToken = null;
    user.setupTokenExpiry = null;

    const savedUser = await user.save();

    res.json({
      success: true,
      message: 'Password set successfully! You can now log in.',
      username: savedUser.username
    });
  } catch (err) {
    console.error('Setup password error:', err.message);
    res.status(500).json({ error: 'Failed to set password' });
  }
};

const forgotPassword = async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    const searchTerm = username.toLowerCase().trim();

    const query = {
      $or: [{ username: searchTerm }]
    };

    if (searchTerm.includes('@')) {
      query.$or.push({ email: searchTerm });
    }

    const user = await User.findOne(query);

    if (!user) {
      return res.json({ success: true, message: 'If the account exists, a reset link has been sent to the registered email address.' });
    }

    if (!user.email || user.email.trim() === '') {
      return res.json({ success: true, message: 'If the account exists, a reset link has been sent to the registered email address.' });
    }

    const resetToken = generateToken();
    user.resetToken = resetToken;
    user.resetTokenExpiry = new Date(Date.now() + 1 * 60 * 60 * 1000);
    await user.save();

    const resetUrl = `${req.protocol}://${req.get('host').replace(':8208', ':5173').replace(':8080', ':5173')}?reset=${resetToken}`;

    emailService.sendResetEmail(user.email, user.fullName, user.username, resetUrl);

    console.log(`\n🔑 RESET LINK for ${user.fullName} (${user.username}):\n${resetUrl}\n`);

    res.json({
      success: true,
      message: 'If the account exists, a reset link has been sent to the registered email address.'
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to process request' });
  }
};

const resetPassword = async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset link.' });
    }

    user.password = await hashPassword(password);
    user.passwordSet = true;
    user.forcePasswordChange = false;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully! You can now log in.', username: user.username });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

const changePassword = async (req, res) => {
  const { token, oldPassword, newPassword } = req.body;

  if (!token || !oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Token, old password, and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  try {
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired change password link.' });
    }

    const isValid = await verifyPassword(oldPassword, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const isSame = await verifyPassword(newPassword, user.password);
    if (isSame) {
      return res.status(400).json({ error: 'New password must be different from current password' });
    }

    user.password = await hashPassword(newPassword);
    user.forcePasswordChange = false;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully! You can now log in with your new password.',
      username: user.username
    });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await User.find({}, '-password -setupToken -resetToken').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Failed to get users' });
  }
};

const deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    const user = await User.findById(req.params.id);
    if (user && user.role === 'agent') {
      return res.status(400).json({ error: 'Cannot delete agent accounts. Agents are system-seeded.' });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

const verify = (req, res) => {
  res.json({ valid: true, user: req.user });
};

module.exports = {
  login,
  register,
  setupPassword,
  forgotPassword,
  resetPassword,
  changePassword,
  getUsers,
  deleteUser,
  verify
};
