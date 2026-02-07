const mongoose = require('mongoose');

const siteContentSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true
  },
  value: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'text' // text, image, number
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('SiteContent', siteContentSchema);
