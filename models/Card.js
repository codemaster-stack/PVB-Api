// models/Card.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const cardSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  cardHolderName: {
    type: String,
    required: true,
    maxlength: 25
  },
  cardType: {
    type: String,
    enum: ['visa', 'mastercard'],
    required: true
  },
  cardNumber: {
    type: String,
    required: true,
    unique: true
  },
  cvv: {
    type: String,
    required: true
  },
  expiryDate: {
    type: String,
    required: true
  },
  transactionPin: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  approvedAt: {
    type: Date
  },
  rejectedAt: {
    type: Date
  },
  rejectionReason: {
    type: String
  }
}, {
  timestamps: true
});

// Hash transaction PIN before saving
cardSchema.pre('save', async function(next) {
  if (this.isModified('transactionPin')) {
    this.transactionPin = await bcrypt.hash(this.transactionPin, 10);
  }
  next();
});

// Method to compare PIN
cardSchema.methods.matchPin = async function(enteredPin) {
  return await bcrypt.compare(enteredPin, this.transactionPin);
};

module.exports = mongoose.model('Card', cardSchema);