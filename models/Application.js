const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false 
  },
  fullName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['Loan', 'Investment', 'Forex'],
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  // Flexible field for different application types
  details: {
    amount: Number, // For Loan/Investment
    duration: String, // For Loan/Investment
    purpose: String, // For Loan
    experienceLevel: String, // For Forex
    message: String, // General
    nin: String,
    guarantor: {
        name: String,
        phone: String,
        email: String,
        relationship: String,
        address: String
    },
    // New Next of Kin for Investment
    nok: {
        name: String,
        phone: String,
        relationship: String
    },
    goals: String // For Forex
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  approvedAt: {
    type: Date
  }
});

module.exports = mongoose.model('Application', ApplicationSchema);
