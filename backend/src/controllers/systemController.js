const Settings = require('../models/Settings');
const Card = require('../models/Card');
const Transaction = require('../models/Transaction');

const getSettings = async (req, res) => {
  try {
    const settings = await Settings.find();
    const result = {};
    settings.forEach(s => { result[s.key] = s.value; });
    res.json(result);
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ error: 'Failed to get settings' });
  }
};

const updateSettings = async (req, res) => {
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
};

const getStats = async (req, res) => {
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
};

module.exports = {
  getSettings,
  updateSettings,
  getStats
};
