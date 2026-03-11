const mongoose = require('mongoose');

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

module.exports = mongoose.model('User', userSchema);
