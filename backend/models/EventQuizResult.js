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
    required: true
  },
  answers: [{
    type: Number,
    required: true
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
  startTime: {
    type: Date,
    required: true
  },
  submitTime: {
    type: Date,
    required: true
  },
  duration: {
    type: Number,  // Duration in minutes
    required: true
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
eventQuizResultSchema.index({ quiz: 1, student: 1 }, { unique: true });
eventQuizResultSchema.index({ quiz: 1, score: -1 });
eventQuizResultSchema.index({ student: 1, submitTime: -1 });

const EventQuizResult = mongoose.model('EventQuizResult', eventQuizResultSchema);

module.exports = EventQuizResult; 