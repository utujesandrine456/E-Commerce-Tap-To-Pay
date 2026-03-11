const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  sessionId: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: '0s' } // This will auto-delete the document when it expires
  }
}, { timestamps: true });

module.exports = mongoose.model('Reservation', reservationSchema);
