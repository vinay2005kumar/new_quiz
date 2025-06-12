const mongoose = require('mongoose');

const eventQuizResultSchema = new mongoose.Schema({
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EventQuiz',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Made optional for public submissions
  },
  // Public participant information (for non-authenticated submissions)
  participantInfo: {
    name: String,
    email: String,
    college: String,
    department: String,
    year: String,
    isTeam: {
      type: Boolean,
      default: false
    },
    teamName: String,
    teamMembers: [{
      name: String,
      email: String,
      college: String,
      department: String,
      year: String
    }]
  },
  answers: [{
    questionIndex: {
      type: Number,
      required: true
    },
    selectedOption: {
      type: Number,
      required: true
    }
  }],
  score: {
    type: Number,
    required: true,
    default: 0
  },
  totalMarks: {
    type: Number,
    required: true,
    default: 0
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  timeTaken: {
    type: Number, // Time taken in seconds
    default: 0
  },
  status: {
    type: String,
    enum: ['completed', 'submitted', 'evaluated'],
    default: 'completed'
  }
}, {
  timestamps: true
});

// Add indexes for better query performance
// Remove the problematic unique index on quiz + student since student can be null
eventQuizResultSchema.index({ quiz: 1, score: -1 });
eventQuizResultSchema.index({ student: 1, submittedAt: -1 }, { sparse: true });
eventQuizResultSchema.index({ 'participantInfo.email': 1, submittedAt: -1 });

// Create a compound unique index for public submissions using email
eventQuizResultSchema.index({
  quiz: 1,
  'participantInfo.email': 1
}, {
  unique: true,
  sparse: true,
  partialFilterExpression: {
    'participantInfo.email': { $exists: true, $ne: null }
  }
});

// Create a compound unique index for authenticated submissions
eventQuizResultSchema.index({
  quiz: 1,
  student: 1
}, {
  unique: true,
  sparse: true,
  partialFilterExpression: {
    student: { $exists: true, $ne: null }
  }
});

const EventQuizResult = mongoose.model('EventQuizResult', eventQuizResultSchema);

module.exports = EventQuizResult; 