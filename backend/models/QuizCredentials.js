const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const quizCredentialsSchema = new mongoose.Schema({
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EventQuiz',
    required: true
  },
  registration: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  originalPassword: {
    type: String,
    required: true // Store original password for email
  },
  isTeam: {
    type: Boolean,
    default: false
  },
  teamName: String,
  participantDetails: {
    name: String,
    email: String,
    college: String,
    department: String,
    year: String,
    phoneNumber: String,
    admissionNumber: String,
    participantType: String
  },
  teamMembers: [{
    name: String,
    email: String,
    college: String,
    department: String,
    year: String,
    phoneNumber: String,
    admissionNumber: String,
    participantType: String
  }],
  memberRole: {
    type: String,
    enum: ['Team Leader', 'Team Member'],
    required: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  lockUntil: Date,
  hasAttemptedQuiz: {
    type: Boolean,
    default: false
  },
  quizSubmission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EventQuizResult'
  },
  // Deletion tracking
  deletionReason: {
    type: String,
    enum: ['Quiz deleted by event manager', 'Account deactivated', 'Other'],
    required: false // Allow undefined/null values
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for efficient queries
quizCredentialsSchema.index({ quiz: 1, username: 1 });
quizCredentialsSchema.index({ quiz: 1, isActive: 1 });

// Hash password before saving
quizCredentialsSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
quizCredentialsSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to check if account is locked
quizCredentialsSchema.methods.isAccountLocked = function() {
  return !!(this.isLocked && this.lockUntil && this.lockUntil > Date.now());
};

// Method to increment login attempts
quizCredentialsSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1, isLocked: false }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 30 minutes
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = {
      isLocked: true,
      lockUntil: Date.now() + 30 * 60 * 1000 // 30 minutes
    };
  }
  
  return this.updateOne(updates);
};

// Method to reset login attempts
quizCredentialsSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
    $set: { isLocked: false, lastLogin: new Date() }
  });
};

module.exports = mongoose.model('QuizCredentials', quizCredentialsSchema);
