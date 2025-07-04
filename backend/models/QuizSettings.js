const mongoose = require('mongoose');

const quizSettingsSchema = new mongoose.Schema({
  // Admin Override Settings
  adminOverride: {
    enabled: {
      type: Boolean,
      default: false
    },
    password: {
      type: String,
      default: 'admin123' // Default password, should be changed by admin
    },
    triggerButtons: {
      button1: {
        type: String,
        enum: ['Ctrl', 'Alt', 'Shift', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
        default: 'Ctrl'
      },
      button2: {
        type: String,
        enum: ['Ctrl', 'Alt', 'Shift', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
        default: '6'
      }
    },
    sessionTimeout: {
      type: Number,
      default: 300, // 5 minutes in seconds
      min: 60,
      max: 1800 // Max 30 minutes
    }
  },

  // Emergency Password Settings for Event Quiz Access
  emergencyAccess: {
    enabled: {
      type: Boolean,
      default: true
    },
    password: {
      type: String,
      default: 'Quiz@123' // Default emergency password for quiz access
    },
    description: {
      type: String,
      default: 'Emergency password allows admin access to any quiz even without registered credentials'
    }
  },
  
  // Violation Settings
  violationSettings: {
    maxViolations: {
      type: Number,
      default: 5,
      min: 1,
      max: 20
    },
    autoTerminate: {
      type: Boolean,
      default: true
    },
    warningThreshold: {
      type: Number,
      default: 3,
      min: 1,
      max: 10
    }
  },
  
  // Logging Settings
  loggingSettings: {
    logViolations: {
      type: Boolean,
      default: true
    },
    logAdminOverrides: {
      type: Boolean,
      default: true
    },
    retentionDays: {
      type: Number,
      default: 30,
      min: 1,
      max: 365
    }
  },
  
  // College Information
  collegeId: {
    type: String,
    required: true,
    unique: true,
    default: 'default'
  },
  
  // Metadata
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  lastUpdatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Ensure only one settings document per college
quizSettingsSchema.index({ collegeId: 1 }, { unique: true });

// Pre-save middleware to update lastUpdatedAt
quizSettingsSchema.pre('save', function(next) {
  this.lastUpdatedAt = new Date();
  next();
});

// Static method to get or create default settings
quizSettingsSchema.statics.getOrCreateDefault = async function(collegeId = 'default') {
  let settings = await this.findOne({ collegeId });
  
  if (!settings) {
    settings = new this({ collegeId });
    await settings.save();
  }
  
  return settings;
};

// Instance method to validate admin override
quizSettingsSchema.methods.validateAdminPassword = function(password) {
  return this.adminOverride.enabled && this.adminOverride.password === password;
};

// Instance method to validate emergency password
quizSettingsSchema.methods.validateEmergencyPassword = function(password) {
  return this.emergencyAccess.enabled && this.emergencyAccess.password === password;
};

// Instance method to check if admin override is available
quizSettingsSchema.methods.isAdminOverrideAvailable = function() {
  return this.adminOverride.enabled;
};

module.exports = mongoose.model('QuizSettings', quizSettingsSchema);
