const mongoose = require('mongoose');

const collegeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  website: {
    type: String,
    trim: true
  },
  establishedYear: {
    type: Number,
    min: 1800,
    max: new Date().getFullYear()
  },
  description: {
    type: String,
    trim: true
  },
  logo: {
    type: String, // URL or base64 string for logo
    trim: true
  },
  backgroundType: {
    type: String,
    enum: ['gradient', 'solid', 'image'],
    default: 'gradient'
  },
  backgroundValue: {
    type: String,
    default: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  backgroundImage: {
    type: String, // URL or base64 string for background image
    trim: true
  },
  headerStyle: {
    type: String,
    enum: ['transparent', 'solid', 'gradient'],
    default: 'transparent'
  },
  headerColor: {
    type: String,
    default: 'rgba(255, 255, 255, 0.1)'
  },
  headerTextColor: {
    type: String,
    default: 'white'
  },
  footerStyle: {
    type: String,
    enum: ['transparent', 'solid', 'gradient'],
    default: 'solid'
  },
  footerColor: {
    type: String,
    default: 'rgba(0, 0, 0, 0.8)'
  },
  footerTextColor: {
    type: String,
    default: 'white'
  },
  isSetup: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Ensure only one college record exists
collegeSchema.index({}, { unique: true });

module.exports = mongoose.model('College', collegeSchema);
