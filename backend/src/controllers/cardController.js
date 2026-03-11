const Card = require('../models/Card');
const Transaction = require('../models/Transaction');
const { hashPasscode, verifyPasscode, generateReceiptId } = require('../helpers/cryptoHelpers');

const getCards = async (req, res) => {
  try {
    const cards = await Card.find().sort({ updatedAt: -1 });
    res.json(cards);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Database operation failed' });
  }
};

const getCard = async (req, res) => {
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
};

const updateCard = async (req, res) => {
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
          processedBy: req.user.username,
          receiptId: generateReceiptId()
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
};

const deleteCard = async (req, res) => {
  try {
    await Card.findOneAndDelete({ uid: req.params.uid });
    res.json({ success: true, message: 'Card deleted successfully' });
  } catch (err) {
    console.error('Delete card error:', err);
    res.status(500).json({ error: 'Failed to delete card' });
  }
};

const setPasscode = async (req, res) => {
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
};

const changePasscode = async (req, res) => {
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
};

const verifyCardPasscode = async (req, res) => {
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
};

module.exports = {
  getCards,
  getCard,
  updateCard,
  deleteCard,
  setPasscode,
  changePasscode,
  verifyCardPasscode
};
