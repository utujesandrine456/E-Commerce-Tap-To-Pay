const mongoose = require('mongoose');

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

module.exports = mongoose.model('Card', cardSchema);
