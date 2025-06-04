const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true
  },
  options: {
    type: [{
      type: String,
      required: true,
      trim: true
    }],
    validate: {
      validator: function(options) {
        return options.length === 4;
      },
      message: 'Each question must have exactly 4 options'
    },
    required: true
  },
  correctAnswer: {
    type: Number,
    required: true,
    min: 0,
    max: 3
  },
  marks: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  }
});

const eventQuizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  duration: {
    type: Number,
    required: true,
    min: 1
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  participantType: {
    type: String,
    enum: ['college', 'any'],
    default: 'college'
  },
  registrationEnabled: {
    type: Boolean,
    default: true
  },
  spotRegistrationEnabled: {
    type: Boolean,
    default: false
  },
  maxParticipants: {
    type: Number,
    default: 0 // 0 means unlimited
  },
  instructions: {
    type: String,
    trim: true
  },
  passingMarks: {
    type: Number,
    default: 0
  },
  totalMarks: {
    type: Number,
    default: 0
  },
  departments: {
    type: [String],
    default: ['all']
  },
  years: {
    type: [String],
    default: ['all']
  },
  semesters: {
    type: [String],
    default: ['all']
  },
  sections: {
    type: [String],
    default: ['all']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  registrations: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: String,
    email: String,
    college: String,
    department: String,
    year: String,
    section: String,
    semester: String,
    registeredAt: {
      type: Date,
      default: Date.now
    },
    isSpotRegistration: {
      type: Boolean,
      default: false
    }
  }],
  questions: [questionSchema],
  status: {
    type: String,
    enum: ['draft', 'upcoming', 'published', 'completed', 'cancelled'],
    default: 'draft'
  }
}, {
  timestamps: true
});

// Add index for efficient queries
eventQuizSchema.index({ startTime: 1, endTime: 1, status: 1 });
eventQuizSchema.index({ 'registrations.student': 1 });

// Method to check if a student is eligible
eventQuizSchema.methods.isStudentEligible = function(student) {
  // If any field is set to 'all', it means that field has no restrictions
  const isDepartmentEligible = this.departments.includes('all') || this.departments.includes(student.department);
  const isYearEligible = this.years.includes('all') || this.years.includes(student.year);
  const isSemesterEligible = this.semesters.includes('all') || this.semesters.includes(student.semester);
  const isSectionEligible = this.sections.includes('all') || this.sections.includes(student.section);

  return isDepartmentEligible && isYearEligible && isSemesterEligible && isSectionEligible;
};

// Calculate total marks before saving
eventQuizSchema.pre('save', function(next) {
  if (this.questions) {
    this.totalMarks = this.questions.reduce((sum, question) => sum + question.marks, 0);
  }
  next();
});

module.exports = mongoose.model('EventQuiz', eventQuizSchema); 