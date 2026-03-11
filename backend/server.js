require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');

const connectDB = require('./src/config/db');
const { initMqtt } = require('./src/services/mqttService');
const { seedDefaultUsers } = require('./src/services/seedService');
const { apiLimiter } = require('./src/middlewares/rateLimiter');
const emailService = require('./src/services/emailService');

// Routes
const authRoutes = require('./src/routes/authRoutes');
const cardRoutes = require('./src/routes/cardRoutes');
const transactionRoutes = require('./src/routes/transactionRoutes');
const systemRoutes = require('./src/routes/systemRoutes');
const systemController = require('./src/controllers/systemController');
const transactionController = require('./src/controllers/transactionController');
const { transactionLimiter } = require('./src/middlewares/rateLimiter');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});
app.set('io', io); 

// Middlewares
app.use(helmet()); 
app.use(cors());
app.use(express.json());

// API Limiting 
app.use(apiLimiter);

const PORT = 8208;

// Connect to DB and seed
connectDB().then(() => {
  seedDefaultUsers();
});

// Init MQTT with socket reference
initMqtt(io);

// Main Application Routes Configured Cleanly
app.use('/auth', authRoutes);

app.use('/card', cardRoutes);
app.get('/cards', require('./src/controllers/cardController').getCards);

// Transaction Routes
app.post('/topup', transactionLimiter, transactionController.topup);
app.post('/pay', transactionLimiter, transactionController.pay);
app.get('/transactions/:uid', transactionController.getUserTransactions);
app.get('/transactions', transactionController.getTransactions);

// System Routes
app.use('/', systemRoutes);

// Extra route
app.post('/send-receipt', async (req, res) => {
  const { email, transaction } = req.body;

  if (!email || !transaction) {
    return res.status(400).json({ error: 'Email and transaction data required' });
  }

  const result = await emailService.sendReceiptEmail(email, transaction);

  if (result) {
    res.json({
      success: true,
      message: `Receipt sent to ${email}`,
      emailId: result.id
    });
  } else {
    res.status(500).json({ error: 'Failed to send receipt email' });
  }
});


// Socket IO
io.on('connection', (socket) => {
  console.log('User connected to the dashboard');
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// START SERVER
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on http://0.0.0.0:${PORT}`);
  console.log(`Access from: http://157.173.101.159:${PORT}`);
});
