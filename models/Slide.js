const mongoose = require('mongoose');

const slideSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  subtitle: {
    type: String,
    required: true,
    trim: true
  },
  buttonText: {
    type: String,
    default: 'Learn More',
    trim: true
  },
  buttonAction: {
    type: String,
    trim: true
  },
  slideClass: {
    type: String,
    default: 'mk-slide3'
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  backgroundImage: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Slide', slideSchema);