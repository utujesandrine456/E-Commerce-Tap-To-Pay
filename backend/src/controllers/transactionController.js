const mongoose = require('mongoose');
const Card = require('../models/Card');
const Transaction = require('../models/Transaction');
const PRODUCTS = require('../config/products');
const mqttService = require('../services/mqttService');
const emailService = require('../services/emailService');
const { verifyPasscode, generateReceiptId } = require('../helpers/cryptoHelpers');

const topup = async (req, res) => {
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

      const { hashPasscode } = require('../helpers/cryptoHelpers');
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

    const receiptId = generateReceiptId();
    const transaction = new Transaction({
      uid: card.uid,
      holderName: card.holderName,
      type: 'topup',
      amount: amount,
      balanceBefore: balanceBefore,
      balanceAfter: card.balance,
      description: `Top-up of $${amount.toFixed(2)}`,
      processedBy: req.body.processedBy || 'system',
      receiptId: receiptId
    });
    await transaction.save();

    if (card.email && card.email.trim() !== '') {
      emailService.sendReceiptEmail(card.email, transaction.toObject ? transaction.toObject() : transaction)
        .catch(emailErr => console.error('Background topup email failed:', emailErr));
    }

    mqttService.publishTopup(uid, card.balance, card.holderName);

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
        receiptId: transaction.receiptId,
        timestamp: transaction.timestamp
      }
    });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Database operation failed' });
  }
};

const pay = async (req, res) => {
  const { uid, productId, amount, description, passcode, items, processedBy } = req.body;

  if (!uid || (!productId && amount === undefined)) {
    return res.status(400).json({ error: 'UID and product or amount are required' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const card = await Card.findOne({ uid }).session(session);
    if (!card) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'Card not found. Please top up first.' });
    }

    if (card.status !== 'active') {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ error: `Card is ${card.status}. Contact an agent.` });
    }

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

    card.balance -= payAmount;
    card.updatedAt = Date.now();
    await card.save({ session });

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

    await session.commitTransaction();
    session.endSession();

    mqttService.publishPayment(uid, card.balance, payAmount, payDescription, 'success', card.holderName);

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
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
    }

    if (card.email && card.email.trim() !== '') {
      emailService.sendReceiptEmail(card.email, transaction.toObject ? transaction.toObject() : transaction)
        .catch(emailErr => console.error('Background email failed:', emailErr));
    }

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
    await session.abortTransaction();
    session.endSession();
    console.error('Payment error (rolled back):', err);
    res.status(500).json({ error: 'Payment processing failed. Transaction rolled back.', rolledBack: true });
  }
};

const getTransactions = async (req, res) => {
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
};

const getUserTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ uid: req.params.uid })
      .sort({ timestamp: -1 })
      .limit(50);
    res.json(transactions);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Database operation failed' });
  }
};

module.exports = {
  topup,
  pay,
  getTransactions,
  getUserTransactions
};
