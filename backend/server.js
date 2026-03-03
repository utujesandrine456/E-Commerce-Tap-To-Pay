const express = require('express');
const mqtt = require('mqtt');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Resend } = require('resend');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

app.use(cors());
app.use(express.json());

const PORT = 8208;
const TEAM_ID = "team_rdf";
const MQTT_BROKER = "mqtt://157.173.101.159:1883";
const MONGO_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET || 'tap-and-pay-secret-key-2026';
const RESEND_API_KEY = process.env.RESEND_API;

// Initialize Resend
if (!RESEND_API_KEY) {
  console.warn('⚠️ WARNING: RESEND_API key not found in environment variables. Email functionality will not work.');
  console.warn('⚠️ Please add RESEND_API=your_api_key to your .env file');
}
const resend = new Resend(RESEND_API_KEY);
console.log(`📧 Resend initialized: ${RESEND_API_KEY ? '✅ API key found' : '❌ No API key'}`);

// MongoDB Connection with better options
mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
  .then(() => {
    console.log('✅ Connected to MongoDB');
    console.log(`📊 Database: ${mongoose.connection.name}`);
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Monitor MongoDB connection
mongoose.connection.on('error', err => {
  console.error('❌ MongoDB error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

// ==================== SCHEMAS ====================

// User Schema (for authentication)
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, default: null },
  fullName: { type: String, required: true },
  email: { type: String, default: '' },
  role: { type: String, enum: ['agent', 'salesperson'], required: true },
  passwordSet: { type: Boolean, default: false },
  forcePasswordChange: { type: Boolean, default: false },
  setupToken: { type: String, default: null },
  setupTokenExpiry: { type: Date, default: null },
  resetToken: { type: String, default: null },
  resetTokenExpiry: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: null }
});

const User = mongoose.model('User', userSchema);

// Card Schema
const cardSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  holderName: { type: String, required: true },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  balance: { type: Number, default: 0 },
  lastTopup: { type: Number, default: 0 },
  passcode: { type: String, default: null },
  passcodeSet: { type: Boolean, default: false },
  status: { type: String, enum: ['active', 'suspended', 'blocked'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Card = mongoose.model('Card', cardSchema);

// Transaction Schema
const transactionSchema = new mongoose.Schema({
  uid: { type: String, required: true, index: true },
  holderName: { type: String, required: true },
  type: { type: String, enum: ['topup', 'debit'], default: 'topup' },
  amount: { type: Number, required: true },
  balanceBefore: { type: Number, required: true },
  balanceAfter: { type: Number, required: true },
  description: { type: String },
  items: { type: Array, default: [] },
  processedBy: { type: String, default: 'system' },
  receiptId: { type: String, default: null },
  timestamp: { type: Date, default: Date.now }
});

const Transaction = mongoose.model('Transaction', transactionSchema);

// System Settings Schema
const settingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  updatedAt: { type: Date, default: Date.now }
});

const Settings = mongoose.model('Settings', settingsSchema);

// ==================== HELPERS ====================

async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

async function verifyPassword(input, hashed) {
  return await bcrypt.compare(input, hashed);
}

async function hashPasscode(passcode) {
  const saltRounds = 10;
  return await bcrypt.hash(passcode, saltRounds);
}

async function verifyPasscode(inputPasscode, hashedPasscode) {
  return await bcrypt.compare(inputPasscode, hashedPasscode);
}

function generateReceiptId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RCP-${timestamp}-${random}`;
}

// JWT Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ error: `Access denied. ${role} role required.` });
    }
    next();
  };
}

// Product catalog with categories
const PRODUCTS = [
  // Food & Beverages
  { id: 'coffee', name: 'Coffee', price: 2.50, icon: '☕', category: 'food' },
  { id: 'sandwich', name: 'Sandwich', price: 5.00, icon: '🥪', category: 'food' },
  { id: 'water', name: 'Water Bottle', price: 1.00, icon: '💧', category: 'food' },
  { id: 'snack', name: 'Snack Pack', price: 3.00, icon: '🍿', category: 'food' },
  { id: 'juice', name: 'Fresh Juice', price: 3.50, icon: '🧃', category: 'food' },
  { id: 'salad', name: 'Salad Bowl', price: 6.00, icon: '🥗', category: 'food' },
  { id: 'chips', name: 'Chips', price: 2.50, icon: '🍟', category: 'food' },

  // Rwandan Local Foods
  { id: 'brochette', name: 'Brochette', price: 4.00, icon: '🍢', category: 'rwandan' },
  { id: 'isombe', name: 'Isombe', price: 3.50, icon: '🥬', category: 'rwandan' },
  { id: 'ubugari', name: 'Ubugari', price: 2.00, icon: '🍚', category: 'rwandan' },
  { id: 'sambaza', name: 'Sambaza (Fried)', price: 3.00, icon: '🐟', category: 'rwandan' },
  { id: 'akabenzi', name: 'Akabenzi (Pork)', price: 5.50, icon: '🥓', category: 'rwandan' },
  { id: 'ikivuguto', name: 'Ikivuguto (Yogurt)', price: 1.50, icon: '🥛', category: 'rwandan' },
  { id: 'agatogo', name: 'Agatogo', price: 4.50, icon: '🍲', category: 'rwandan' },
  { id: 'urwagwa', name: 'Urwagwa (Banana Beer)', price: 2.50, icon: '🍺', category: 'rwandan' },

  // Snacks & Drinks
  { id: 'fanta', name: 'Fanta', price: 1.20, icon: '🥤', category: 'drinks' },
  { id: 'primus', name: 'Primus Beer', price: 2.00, icon: '🍺', category: 'drinks' },
  { id: 'mutzig', name: 'Mutzig Beer', price: 2.00, icon: '🍺', category: 'drinks' },
  { id: 'inyange-juice', name: 'Inyange Juice', price: 1.50, icon: '🧃', category: 'drinks' },

  // Domain Registration Services
  { id: 'domain-com', name: '.com Domain', price: 12.00, icon: '🌐', category: 'domains' },
  { id: 'domain-net', name: '.net Domain', price: 11.00, icon: '🌐', category: 'domains' },
  { id: 'domain-org', name: '.org Domain', price: 10.00, icon: '🌐', category: 'domains' },
  { id: 'domain-io', name: '.io Domain', price: 35.00, icon: '🌐', category: 'domains' },
  { id: 'domain-dev', name: '.dev Domain', price: 15.00, icon: '🌐', category: 'domains' },
  { id: 'domain-app', name: '.app Domain', price: 18.00, icon: '🌐', category: 'domains' },
  { id: 'domain-ai', name: '.ai Domain', price: 80.00, icon: '🤖', category: 'domains' },
  { id: 'domain-xyz', name: '.xyz Domain', price: 8.00, icon: '🌐', category: 'domains' },
  { id: 'domain-co', name: '.co Domain', price: 25.00, icon: '🌐', category: 'domains' },
  { id: 'domain-rw', name: '.rw Domain', price: 20.00, icon: '🇷🇼', category: 'domains' },

  // Digital Services
  { id: 'hosting-basic', name: 'Basic Hosting (1mo)', price: 5.00, icon: '☁️', category: 'services' },
  { id: 'hosting-pro', name: 'Pro Hosting (1mo)', price: 15.00, icon: '☁️', category: 'services' },
  { id: 'ssl-cert', name: 'SSL Certificate', price: 10.00, icon: '🔒', category: 'services' },
  { id: 'email-pro', name: 'Professional Email', price: 8.00, icon: '📧', category: 'services' }
];

// ==================== MQTT ====================

const TOPIC_STATUS = `rfid/${TEAM_ID}/card/status`;
const TOPIC_BALANCE = `rfid/${TEAM_ID}/card/balance`;
const TOPIC_TOPUP = `rfid/${TEAM_ID}/card/topup`;
const TOPIC_PAYMENT = `rfid/${TEAM_ID}/card/payment`;
const TOPIC_REMOVED = `rfid/${TEAM_ID}/card/removed`;

const mqttClient = mqtt.connect(MQTT_BROKER);

mqttClient.on('connect', () => {
  console.log('Connected to MQTT Broker');
  mqttClient.subscribe(TOPIC_STATUS);
  mqttClient.subscribe(TOPIC_BALANCE);
  mqttClient.subscribe(TOPIC_PAYMENT);
  mqttClient.subscribe(TOPIC_REMOVED);
});

mqttClient.on('message', (topic, message) => {
  console.log(`Received message on ${topic}: ${message.toString()}`);
  try {
    const payload = JSON.parse(message.toString());

    if (topic === TOPIC_STATUS) {
      io.emit('card-status', payload);
    } else if (topic === TOPIC_BALANCE) {
      io.emit('card-balance', payload);
    } else if (topic === TOPIC_PAYMENT) {
      io.emit('payment-result', payload);
    } else if (topic === TOPIC_REMOVED) {
      io.emit('card-removed', payload);
    }
  } catch (err) {
    console.error('Failed to parse MQTT message:', err);
  }
});

// ==================== AUTH ENDPOINTS ====================

// Login
app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username/email and password are required' });
  }

  try {
    const searchTerm = username.toLowerCase().trim();
    console.log(`🔍 Login attempt with: ${searchTerm}`);
    
    // Try to find user by username or email
    // Build query conditions that handle empty emails
    const query = {
      $or: [
        { username: searchTerm }
      ]
    };
    
    // Only search by email if the search term looks like an email (contains @)
    if (searchTerm.includes('@')) {
      query.$or.push({ email: searchTerm });
    }
    
    console.log(`� Search query:`, JSON.stringify(query));
    
    const user = await User.findOne(query);
    
    if (!user) {
      console.log(`❌ Login failed: User not found for username/email: ${searchTerm}`);
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    console.log(`🔍 Found user: ${user.username}, email: ${user.email || '(no email)'}`);
    console.log(`📝 Password set flag: ${user.passwordSet}`);
    console.log(`🔐 Password hash exists: ${!!user.password}`);

    // Check if password has been set
    if (!user.passwordSet || !user.password) {
      console.log(`❌ Login failed: Password not set for user ${user.username}`);
      return res.status(403).json({ 
        error: 'Password not set. Please use your setup link to set your password.',
        needsSetup: true,
        setupRequired: true
      });
    }

    const isValid = await verifyPassword(password, user.password);
    console.log(`🔑 Password verification result: ${isValid}`);
    
    if (!isValid) {
      console.log(`❌ Login failed: Invalid password for user ${user.username}`);
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    // Check if user must change password
    if (user.forcePasswordChange) {
      // Generate a temporary change password token
      const crypto = require('crypto');
      const changeToken = crypto.randomBytes(32).toString('hex');
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

    // Update last login
    user.lastLogin = Date.now();
    await user.save();

    // Generate JWT
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
});

// Register new salesperson (agent creates by name + email, generates setup token)
app.post('/auth/register', authenticateToken, requireRole('agent'), async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    return res.status(400).json({ error: 'Full name and email are required' });
  }

  // Generate username from email (part before @)
  let username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');

  try {
    // Check if email already exists
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }

    // Ensure unique username
    let existing = await User.findOne({ username });
    let counter = 1;
    while (existing) {
      username = `${email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')}${counter}`;
      existing = await User.findOne({ username });
      counter++;
    }

    // Generate setup token (valid for 72 hours)
    const crypto = require('crypto');
    const setupToken = crypto.randomBytes(32).toString('hex');
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

    // Build setup URL
    const setupUrl = `${req.protocol}://${req.get('host').replace(':8208', ':9208')}?setup=${setupToken}`;

    // Send email via Resend
    try {
      await resend.emails.send({
        from: 'TAP & PAY <tap-to-pay@aloys.work>',
        to: [email.toLowerCase()],
        subject: 'Welcome to TAP & PAY - Complete Your Account Setup',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 40px auto; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
              .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center; }
              .logo { font-size: 32px; font-weight: 800; color: white; margin: 0; letter-spacing: -0.5px; }
              .tagline { color: rgba(255,255,255,0.9); font-size: 14px; margin: 8px 0 0 0; }
              .content { padding: 40px 30px; }
              .greeting { font-size: 24px; font-weight: 700; color: #f1f5f9; margin: 0 0 16px 0; }
              .message { font-size: 16px; line-height: 1.6; color: #cbd5e1; margin: 0 0 24px 0; }
              .info-box { background: rgba(99, 102, 241, 0.1); border-left: 4px solid #6366f1; padding: 16px; border-radius: 8px; margin: 24px 0; }
              .info-label { font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 4px 0; }
              .info-value { font-size: 16px; color: #f1f5f9; font-weight: 600; margin: 0; font-family: monospace; }
              .button { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 600; font-size: 16px; margin: 24px 0; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4); }
              .button:hover { box-shadow: 0 6px 20px rgba(99, 102, 241, 0.6); }
              .footer { background: #0f172a; padding: 24px 30px; text-align: center; border-top: 1px solid rgba(255,255,255,0.1); }
              .footer-text { font-size: 13px; color: #64748b; margin: 0; }
              .warning { background: rgba(245, 158, 11, 0.1); border-left: 4px solid #f59e0b; padding: 12px; border-radius: 8px; margin: 16px 0; font-size: 14px; color: #fbbf24; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 class="logo">TAP & PAY</h1>
                <p class="tagline">Secure RFID Payment System</p>
              </div>
              <div class="content">
                <h2 class="greeting">Welcome, ${fullName}! 👋</h2>
                <p class="message">
                  Your TAP & PAY salesperson account has been created by an agent. To get started, you need to complete your account setup by creating a secure password.
                </p>
                <div class="info-box">
                  <p class="info-label">Your Username</p>
                  <p class="info-value">${username}</p>
                </div>
                <p class="message">
                  Click the button below to set your password and activate your account:
                </p>
                <center>
                  <a href="${setupUrl}" class="button">Complete Account Setup →</a>
                </center>
                <div class="warning">
                  ⚠️ This setup link will expire in 72 hours. If it expires, please contact your agent to generate a new one.
                </div>
                <p class="message" style="font-size: 14px; color: #94a3b8; margin-top: 32px;">
                  After setting your password, you'll be able to log in and start processing payments using your RFID card reader.
                </p>
              </div>
              <div class="footer">
                <p class="footer-text">© 2026 TAP & PAY. All rights reserved.</p>
                <p class="footer-text" style="margin-top: 8px;">If you didn't request this account, please ignore this email.</p>
              </div>
            </div>
          </body>
          </html>
        `
      });
      console.log(`✅ Setup email sent to ${email}`);
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      // Continue even if email fails - return the link
    }

    console.log(`\n📧 SETUP LINK for ${fullName} (${email}):\n${setupUrl}\n`);

    res.json({ 
      success: true, 
      message: `Salesperson ${fullName} created. Setup email sent to ${email}.`,
      setupUrl,
      username,
      email: email.toLowerCase()
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Setup password (salesperson first login via token)
app.post('/auth/setup-password', async (req, res) => {
  console.log(`\n🔐 ===== SETUP PASSWORD ENDPOINT CALLED =====`);
  console.log(`📝 Request body:`, req.body);
  
  const { token, password } = req.body;

  console.log(`📝 Token received: ${token ? 'YES (' + token.substring(0, 20) + '...)' : 'NO'}`);
  console.log(`📝 Password received: ${password ? 'YES (length: ' + password.length + ')' : 'NO'}`);

  if (!token || !password) {
    console.log(`❌ Missing required fields`);
    return res.status(400).json({ error: 'Token and password are required' });
  }

  if (password.length < 6) {
    console.log(`❌ Password too short: ${password.length} characters`);
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    // Check MongoDB connection first
    if (mongoose.connection.readyState !== 1) {
      console.error(`❌ MongoDB not connected. State: ${mongoose.connection.readyState}`);
      return res.status(500).json({ error: 'Database connection error. Please try again.' });
    }

    console.log(`\n🔐 ===== SETUP PASSWORD REQUEST =====`);
    console.log(`📝 Token: ${token.substring(0, 20)}...`);
    console.log(`📝 Password length: ${password.length}`);
    
    const user = await User.findOne({ 
      setupToken: token, 
      setupTokenExpiry: { $gt: new Date() } 
    });

    if (!user) {
      console.log(`❌ No user found with this token or token expired`);
      return res.status(400).json({ error: 'Invalid or expired setup link. Please contact your agent.' });
    }

    console.log(`✅ Found user: ${user.username} (ID: ${user._id})`);
    console.log(`📝 BEFORE - passwordSet: ${user.passwordSet}, hasPassword: ${!!user.password}`);
    
    const hashedPassword = await hashPassword(password);
    console.log(`🔑 Generated hash (first 30 chars): ${hashedPassword.substring(0, 30)}...`);
    
    // Update user document
    user.password = hashedPassword;
    user.passwordSet = true;
    user.setupToken = null;
    user.setupTokenExpiry = null;
    
    const savedUser = await user.save();
    console.log(`✅ AFTER SAVE - passwordSet: ${savedUser.passwordSet}, hasPassword: ${!!savedUser.password}`);

    // Verify with fresh database query
    const verifyUser = await User.findById(user._id).lean();
    console.log(`🔍 FRESH QUERY - passwordSet: ${verifyUser.passwordSet}, hasPassword: ${!!verifyUser.password}`);
    console.log(`🔍 Password hash in DB: ${verifyUser.password ? verifyUser.password.substring(0, 30) + '...' : 'NULL'}`);

    if (!verifyUser.password || !verifyUser.passwordSet) {
      console.error(`❌ CRITICAL ERROR: Password was not persisted to database!`);
      console.error(`Database state:`, {
        _id: verifyUser._id,
        username: verifyUser.username,
        passwordSet: verifyUser.passwordSet,
        hasPassword: !!verifyUser.password
      });
      return res.status(500).json({ error: 'Failed to save password to database. Please contact support.' });
    }

    console.log(`✅ SUCCESS - Password saved and verified in database!`);
    console.log(`🔐 ===== SETUP COMPLETE =====\n`);

    res.json({ 
      success: true, 
      message: 'Password set successfully! You can now log in.',
      username: savedUser.username
    });
  } catch (err) {
    console.error('❌ Setup password error:', err.message);
    console.error('Stack trace:', err.stack);
    res.status(500).json({ error: 'Failed to set password: ' + err.message });
  }
});

// Forgot password (generates reset token and sends email)
app.post('/auth/forgot-password', async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    const searchTerm = username.toLowerCase().trim();
    
    // Build query conditions that handle empty emails
    const query = {
      $or: [
        { username: searchTerm }
      ]
    };
    
    // Only search by email if the search term looks like an email (contains @)
    if (searchTerm.includes('@')) {
      query.$or.push({ email: searchTerm });
    }
    
    const user = await User.findOne(query);
    
    if (!user) {
      // Don't reveal if user exists
      return res.json({ success: true, message: 'If the account exists, a reset link has been sent to the registered email address.' });
    }

    // Check if user has email
    if (!user.email || user.email.trim() === '') {
      console.log(`⚠️ User ${user.username} has no email address. Cannot send reset link.`);
      return res.json({ success: true, message: 'If the account exists, a reset link has been sent to the registered email address.' });
    }

    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetToken = resetToken;
    user.resetTokenExpiry = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour
    await user.save();

    const resetUrl = `${req.protocol}://${req.get('host').replace(':8208', ':9208')}?reset=${resetToken}`;

    // Send password reset email
    try {
      const emailResult = await resend.emails.send({
        from: 'TAP & PAY <tap-to-pay@aloys.work>',
        to: [user.email],
        subject: 'TAP & PAY - Password Reset Request',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 40px auto; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
              .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center; }
              .logo { font-size: 32px; font-weight: 800; color: white; margin: 0; letter-spacing: -0.5px; }
              .tagline { color: rgba(255,255,255,0.9); font-size: 14px; margin: 8px 0 0 0; }
              .content { padding: 40px 30px; }
              .greeting { font-size: 24px; font-weight: 700; color: #f1f5f9; margin: 0 0 16px 0; }
              .message { font-size: 16px; line-height: 1.6; color: #cbd5e1; margin: 0 0 24px 0; }
              .info-box { background: rgba(99, 102, 241, 0.1); border-left: 4px solid #6366f1; padding: 16px; border-radius: 8px; margin: 24px 0; }
              .info-label { font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 4px 0; }
              .info-value { font-size: 16px; color: #f1f5f9; font-weight: 600; margin: 0; font-family: monospace; }
              .button { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 600; font-size: 16px; margin: 24px 0; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4); }
              .footer { background: #0f172a; padding: 24px 30px; text-align: center; border-top: 1px solid rgba(255,255,255,0.1); }
              .footer-text { font-size: 13px; color: #64748b; margin: 0; }
              .warning { background: rgba(245, 158, 11, 0.1); border-left: 4px solid #f59e0b; padding: 12px; border-radius: 8px; margin: 16px 0; font-size: 14px; color: #fbbf24; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 class="logo">TAP & PAY</h1>
                <p class="tagline">Secure RFID Payment System</p>
              </div>
              <div class="content">
                <h2 class="greeting">Password Reset Request 🔑</h2>
                <p class="message">
                  Hello ${user.fullName},
                </p>
                <p class="message">
                  We received a request to reset your password for your TAP & PAY account.
                </p>
                <div class="info-box">
                  <p class="info-label">Username</p>
                  <p class="info-value">${user.username}</p>
                </div>
                <p class="message">
                  Click the button below to reset your password:
                </p>
                <center>
                  <a href="${resetUrl}" class="button">Reset Password →</a>
                </center>
                <div class="warning">
                  ⚠️ This reset link will expire in 1 hour. If you didn't request this reset, please ignore this email and your password will remain unchanged.
                </div>
              </div>
              <div class="footer">
                <p class="footer-text">© 2026 TAP & PAY. All rights reserved.</p>
                <p class="footer-text" style="margin-top: 8px;">For security reasons, never share your password with anyone.</p>
              </div>
            </div>
          </body>
          </html>
        `
      });
      console.log(`✅ Password reset email sent to ${user.email}`);
      console.log(`📧 Email ID: ${emailResult.id}`);
    } catch (emailError) {
      console.error('❌ Failed to send reset email:', emailError);
      console.error('Error details:', emailError.message);
      // Continue anyway - don't reveal email sending failure to user
    }

    console.log(`\n🔑 RESET LINK for ${user.fullName} (${user.username}):\n${resetUrl}\n`);

    res.json({ 
      success: true, 
      message: 'If the account exists, a reset link has been sent to the registered email address.'
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Reset password (using token)
app.post('/auth/reset-password', async (req, res) => {
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
    user.forcePasswordChange = false; // Clear force change flag
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully! You can now log in.', username: user.username });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Change password (for forced password change on first login)
app.post('/auth/change-password', async (req, res) => {
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

    // Verify old password
    const isValid = await verifyPassword(oldPassword, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Check if new password is same as old
    const isSame = await verifyPassword(newPassword, user.password);
    if (isSame) {
      return res.status(400).json({ error: 'New password must be different from current password' });
    }

    user.password = await hashPassword(newPassword);
    user.forcePasswordChange = false;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    console.log(`✅ Password changed for ${user.username}`);

    res.json({ 
      success: true, 
      message: 'Password changed successfully! You can now log in with your new password.',
      username: user.username 
    });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Get all users (agent only)
app.get('/auth/users', authenticateToken, requireRole('agent'), async (req, res) => {
  try {
    const users = await User.find({}, '-password -setupToken -resetToken').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Delete user (agent only)
app.delete('/auth/users/:id', authenticateToken, requireRole('agent'), async (req, res) => {
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
});

// Verify token
app.get('/auth/verify', authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// Test email endpoint (for debugging)
app.post('/auth/test-email', authenticateToken, requireRole('agent'), async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email address required' });
  }

  if (!RESEND_API_KEY) {
    return res.status(500).json({ error: 'Resend API key not configured' });
  }

  try {
    const result = await resend.emails.send({
      from: 'TAP & PAY <tap-to-pay@aloys.work>',
      to: [email],
      subject: 'TAP & PAY - Test Email',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; }
            h1 { color: #6366f1; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>✅ Email Test Successful!</h1>
            <p>This is a test email from TAP & PAY system.</p>
            <p>If you received this, your Resend integration is working correctly.</p>
            <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          </div>
        </body>
        </html>
      `
    });
    
    console.log(`✅ Test email sent to ${email}`);
    console.log(`📧 Email ID: ${result.id}`);
    
    res.json({ 
      success: true, 
      message: `Test email sent to ${email}`,
      emailId: result.id
    });
  } catch (error) {
    console.error('❌ Test email failed:', error);
    res.status(500).json({ 
      error: 'Failed to send test email',
      details: error.message 
    });
  }
});

// ==================== CARD ENDPOINTS ====================

// Top up
app.post('/topup', async (req, res) => {
  const { uid, amount, holderName, passcode, email, phone } = req.body;

  if (!uid || amount === undefined) {
    return res.status(400).json({ error: 'UID and amount are required' });
  }

  try {
    let card = await Card.findOne({ uid });
    const balanceBefore = card ? card.balance : 0;

    if (!card) {
      if (!holderName) {
        return res.status(400).json({ error: 'Holder name is required for new cards' });
      }

      if (!passcode || !/^\d{6}$/.test(passcode)) {
        return res.status(400).json({ error: 'A 6-digit passcode is required for new cards' });
      }

      const hashedPasscode = await hashPasscode(passcode);

      card = new Card({
        uid,
        holderName,
        balance: amount,
        lastTopup: amount,
        passcode: hashedPasscode,
        passcodeSet: true,
        email: email || '',
        phone: phone || ''
      });
    } else {
      card.balance += amount;
      card.lastTopup = amount;
      card.updatedAt = Date.now();
    }

    await card.save();

    const transaction = new Transaction({
      uid: card.uid,
      holderName: card.holderName,
      type: 'topup',
      amount: amount,
      balanceBefore: balanceBefore,
      balanceAfter: card.balance,
      description: `Top-up of $${amount.toFixed(2)}`,
      processedBy: req.body.processedBy || 'system'
    });
    await transaction.save();

    // Publish to MQTT
    const payload = JSON.stringify({ uid, amount: card.balance });
    mqttClient.publish(TOPIC_TOPUP, payload, (err) => {
      if (err) {
        console.error('Failed to publish topup:', err);
      }
      console.log(`Published topup for ${uid} (${card.holderName}): ${card.balance}`);
    });

    res.json({
      success: true,
      message: 'Topup successful',
      card: {
        uid: card.uid,
        holderName: card.holderName,
        balance: card.balance,
        lastTopup: card.lastTopup,
        email: card.email,
        phone: card.phone
      },
      transaction: {
        id: transaction._id,
        amount: transaction.amount,
        balanceAfter: transaction.balanceAfter,
        timestamp: transaction.timestamp
      }
    });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Database operation failed' });
  }
});

// Payment / Debit endpoint with atomic rollback
app.post('/pay', async (req, res) => {
  const { uid, productId, amount, description, passcode, items, processedBy } = req.body;

  if (!uid || (!productId && amount === undefined)) {
    return res.status(400).json({ error: 'UID and product or amount are required' });
  }

  // Use MongoDB session for atomic transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const card = await Card.findOne({ uid }).session(session);
    if (!card) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'Card not found. Please top up first.' });
    }

    // Check card status
    if (card.status !== 'active') {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ error: `Card is ${card.status}. Contact an agent.` });
    }

    // Verify passcode if set
    if (card.passcodeSet) {
      if (!passcode) {
        await session.abortTransaction();
        session.endSession();
        return res.status(401).json({
          error: 'Passcode required for this card',
          passcodeRequired: true
        });
      }

      const isValid = await verifyPasscode(passcode, card.passcode);
      if (!isValid) {
        await session.abortTransaction();
        session.endSession();
        return res.status(401).json({
          error: 'Incorrect passcode',
          passcodeRequired: true
        });
      }
    }

    // Resolve amount
    let payAmount = amount;
    let payDescription = description || 'Payment';

    if (productId) {
      const product = PRODUCTS.find(p => p.id === productId);
      if (!product) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ error: 'Invalid product ID' });
      }
      payAmount = product.price;
      payDescription = `Purchase: ${product.name}`;
    }

    if (!payAmount || payAmount <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'Invalid payment amount' });
    }

    // Check sufficient balance - ATOMIC CHECK
    if (card.balance < payAmount) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        error: 'Insufficient balance. Transaction rolled back.',
        currentBalance: card.balance,
        required: payAmount,
        shortfall: payAmount - card.balance,
        rolledBack: true
      });
    }

    const balanceBefore = card.balance;
    const receiptId = generateReceiptId();

    // Deduct amount atomically
    card.balance -= payAmount;
    card.updatedAt = Date.now();
    await card.save({ session });

    // Create transaction record
    const transaction = new Transaction({
      uid: card.uid,
      holderName: card.holderName,
      type: 'debit',
      amount: payAmount,
      balanceBefore: balanceBefore,
      balanceAfter: card.balance,
      description: payDescription,
      items: items || [],
      processedBy: processedBy || 'system',
      receiptId: receiptId
    });
    await transaction.save({ session });

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    // Publish to MQTT
    const mqttPayload = JSON.stringify({
      uid,
      amount: card.balance,
      deducted: payAmount,
      description: payDescription,
      status: 'success'
    });
    mqttClient.publish(TOPIC_PAYMENT, mqttPayload, (err) => {
      if (err) console.error('Failed to publish payment:', err);
      console.log(`Published payment for ${uid} (${card.holderName}): -$${payAmount.toFixed(2)}, balance: $${card.balance.toFixed(2)}`);
    });

    // Emit real-time update
    io.emit('payment-success', {
      uid: card.uid,
      holderName: card.holderName,
      amount: payAmount,
      balanceBefore,
      balanceAfter: card.balance,
      description: payDescription,
      receiptId: receiptId,
      timestamp: transaction.timestamp
    });

    res.json({
      success: true,
      message: 'Payment successful',
      card: {
        uid: card.uid,
        holderName: card.holderName,
        balance: card.balance
      },
      transaction: {
        id: transaction._id,
        type: 'debit',
        amount: payAmount,
        balanceBefore,
        balanceAfter: card.balance,
        description: payDescription,
        receiptId: receiptId,
        items: items || [],
        timestamp: transaction.timestamp
      }
    });
  } catch (err) {
    // ROLLBACK on any error
    await session.abortTransaction();
    session.endSession();
    console.error('Payment error (rolled back):', err);
    res.status(500).json({ error: 'Payment processing failed. Transaction rolled back.', rolledBack: true });
  }
});

// Products catalog endpoint
app.get('/products', (req, res) => {
  res.json(PRODUCTS);
});

// Get card details
app.get('/card/:uid', async (req, res) => {
  try {
    const card = await Card.findOne({ uid: req.params.uid });
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }
    res.json(card);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Database operation failed' });
  }
});

// Update card (agent only)
app.put('/card/:uid', authenticateToken, requireRole('agent'), async (req, res) => {
  const { holderName, email, phone, status, balance } = req.body;

  try {
    const card = await Card.findOne({ uid: req.params.uid });
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    if (holderName !== undefined) card.holderName = holderName;
    if (email !== undefined) card.email = email;
    if (phone !== undefined) card.phone = phone;
    if (status !== undefined) card.status = status;
    if (balance !== undefined) {
      const oldBalance = card.balance;
      card.balance = balance;

      // Record the balance adjustment as a transaction
      if (balance !== oldBalance) {
        const adjustType = balance > oldBalance ? 'topup' : 'debit';
        const adjustAmount = Math.abs(balance - oldBalance);
        const transaction = new Transaction({
          uid: card.uid,
          holderName: card.holderName,
          type: adjustType,
          amount: adjustAmount,
          balanceBefore: oldBalance,
          balanceAfter: balance,
          description: `Agent adjustment: Balance ${adjustType === 'topup' ? 'increased' : 'decreased'} by $${adjustAmount.toFixed(2)}`,
          processedBy: req.user.username
        });
        await transaction.save();
      }
    }
    card.updatedAt = Date.now();
    await card.save();

    res.json({ success: true, message: 'Card updated', card });
  } catch (err) {
    console.error('Update card error:', err);
    res.status(500).json({ error: 'Failed to update card' });
  }
});

// Delete card (agent only)
app.delete('/card/:uid', authenticateToken, requireRole('agent'), async (req, res) => {
  try {
    await Card.findOneAndDelete({ uid: req.params.uid });
    res.json({ success: true, message: 'Card deleted successfully' });
  } catch (err) {
    console.error('Delete card error:', err);
    res.status(500).json({ error: 'Failed to delete card' });
  }
});

// Get all cards
app.get('/cards', async (req, res) => {
  try {
    const cards = await Card.find().sort({ updatedAt: -1 });
    res.json(cards);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Database operation failed' });
  }
});

// Set passcode
app.post('/card/:uid/set-passcode', async (req, res) => {
  const { passcode } = req.body;

  if (!passcode || !/^\d{6}$/.test(passcode)) {
    return res.status(400).json({ error: 'Passcode must be exactly 6 digits' });
  }

  try {
    const card = await Card.findOne({ uid: req.params.uid });
    if (!card) return res.status(404).json({ error: 'Card not found' });

    if (card.passcodeSet) {
      return res.status(400).json({ error: 'Passcode already set. Use change-passcode endpoint.' });
    }

    card.passcode = await hashPasscode(passcode);
    card.passcodeSet = true;
    card.updatedAt = Date.now();
    await card.save();

    res.json({ success: true, message: 'Passcode set successfully', passcodeSet: true });
  } catch (err) {
    console.error('Set passcode error:', err);
    res.status(500).json({ error: 'Failed to set passcode' });
  }
});

// Change passcode
app.post('/card/:uid/change-passcode', async (req, res) => {
  const { oldPasscode, newPasscode } = req.body;

  if (!oldPasscode || !newPasscode) {
    return res.status(400).json({ error: 'Both old and new passcodes are required' });
  }

  if (!/^\d{6}$/.test(newPasscode)) {
    return res.status(400).json({ error: 'New passcode must be exactly 6 digits' });
  }

  try {
    const card = await Card.findOne({ uid: req.params.uid });
    if (!card) return res.status(404).json({ error: 'Card not found' });

    if (!card.passcodeSet) {
      return res.status(400).json({ error: 'No passcode set. Use set-passcode endpoint first.' });
    }

    const isValid = await verifyPasscode(oldPasscode, card.passcode);
    if (!isValid) return res.status(401).json({ error: 'Incorrect old passcode' });

    card.passcode = await hashPasscode(newPasscode);
    card.updatedAt = Date.now();
    await card.save();

    res.json({ success: true, message: 'Passcode changed successfully' });
  } catch (err) {
    console.error('Change passcode error:', err);
    res.status(500).json({ error: 'Failed to change passcode' });
  }
});

// Verify passcode
app.post('/card/:uid/verify-passcode', async (req, res) => {
  const { passcode } = req.body;

  if (!passcode || !/^\d{6}$/.test(passcode)) {
    return res.status(400).json({ error: 'Passcode must be exactly 6 digits', valid: false });
  }

  try {
    const card = await Card.findOne({ uid: req.params.uid });
    if (!card) return res.status(404).json({ error: 'Card not found', valid: false });

    if (!card.passcodeSet) {
      return res.status(400).json({ error: 'No passcode set for this card', valid: false });
    }

    const isValid = await verifyPasscode(passcode, card.passcode);

    if (isValid) {
      res.json({ success: true, valid: true, message: 'Passcode verified' });
    } else {
      res.status(401).json({ error: 'Incorrect passcode', valid: false });
    }
  } catch (err) {
    console.error('Verify passcode error:', err);
    res.status(500).json({ error: 'Failed to verify passcode', valid: false });
  }
});

// Transaction history
app.get('/transactions/:uid', async (req, res) => {
  try {
    const transactions = await Transaction.find({ uid: req.params.uid })
      .sort({ timestamp: -1 })
      .limit(50);
    res.json(transactions);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Database operation failed' });
  }
});

app.get('/transactions', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const transactions = await Transaction.find()
      .sort({ timestamp: -1 })
      .limit(limit);
    res.json(transactions);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Database operation failed' });
  }
});

// ==================== SYSTEM SETTINGS ====================

app.get('/settings', authenticateToken, requireRole('agent'), async (req, res) => {
  try {
    const settings = await Settings.find();
    const result = {};
    settings.forEach(s => { result[s.key] = s.value; });
    res.json(result);
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

app.put('/settings', authenticateToken, requireRole('agent'), async (req, res) => {
  try {
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      await Settings.findOneAndUpdate(
        { key },
        { key, value, updatedAt: Date.now() },
        { upsert: true }
      );
    }
    res.json({ success: true, message: 'Settings updated' });
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// System Stats endpoint
app.get('/stats', async (req, res) => {
  try {
    const cards = await Card.find();
    const transactions = await Transaction.find();
    const today = new Date().toDateString();
    const todayTx = transactions.filter(tx => new Date(tx.timestamp).toDateString() === today);

    const topupVolume = transactions.filter(tx => tx.type === 'topup').reduce((sum, tx) => sum + tx.amount, 0);
    const purchaseVolume = transactions.filter(tx => tx.type === 'debit').reduce((sum, tx) => sum + tx.amount, 0);
    const netBalance = cards.reduce((sum, card) => sum + card.balance, 0);

    res.json({
      totalCards: cards.length,
      totalTransactions: transactions.length,
      todayTransactions: todayTx.length,
      topupVolume,
      purchaseVolume,
      netBalance,
      activeCards: cards.filter(c => c.status === 'active').length,
      suspendedCards: cards.filter(c => c.status === 'suspended').length,
      blockedCards: cards.filter(c => c.status === 'blocked').length
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

// ==================== SEED DEFAULT USERS ====================

async function seedDefaultUsers() {
  try {
    const agentExists = await User.findOne({ username: 'agent' });
    if (!agentExists) {
      const hashedPassword = await hashPassword('agent123');
      await User.create({
        username: 'agent',
        password: hashedPassword,
        fullName: 'System Agent',
        email: 'agent@tapandpay.rw',
        role: 'agent',
        passwordSet: true,
        forcePasswordChange: true // Force password change on first login
      });
      console.log('Default agent user created (username: agent, password: agent123)');
      console.log('⚠️  Agent must change password on first login');
    } else if (!agentExists.passwordSet) {
      // Fix existing agent that may not have passwordSet flag
      agentExists.passwordSet = true;
      agentExists.forcePasswordChange = true;
      await agentExists.save();
    }
    
  } catch (err) {
    console.error('Error seeding users:', err);
  }
}

// Seed after connection
mongoose.connection.once('open', () => {
  seedDefaultUsers();
});

// ==================== SOCKET ====================

io.on('connection', (socket) => {
  console.log('User connected to the dashboard');
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// ==================== START SERVER ====================

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on http://0.0.0.0:${PORT}`);
  console.log(`Access from: http://157.173.101.159:${PORT}`);
});
