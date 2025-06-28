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
  },
  negativeMarks: {
    type: Number,
    default: 0,
    min: 0
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
  // New array format for participant types
  participantTypes: {
    type: [String],
    enum: ['college', 'external'],
    default: ['college']
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
  // Team configuration
  participationMode: {
    type: String,
    enum: ['individual', 'team'],
    default: 'individual'
  },
  teamSize: {
    type: Number,
    default: 1,
    min: 1,
    max: 10,
    required: function() {
      return this.participationMode === 'team';
    }
  },
  instructions: {
    type: String,
    trim: true
  },
  emailInstructions: {
    type: String,
    trim: true,
    default: 'Please login with the provided credentials 10-15 minutes before the quiz starts. Ensure you have a stable internet connection.'
  },
  questionDisplayMode: {
    type: String,
    enum: ['one-by-one', 'all-at-once'],
    default: 'one-by-one'
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
  negativeMarkingEnabled: {
    type: Boolean,
    default: false
  },
  securitySettings: {
    enableFullscreen: {
      type: Boolean,
      default: false
    },
    disableRightClick: {
      type: Boolean,
      default: false
    },
    disableCopyPaste: {
      type: Boolean,
      default: false
    },
    disableTabSwitch: {
      type: Boolean,
      default: false
    },
    enableProctoringMode: {
      type: Boolean,
      default: false
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  registrations: [{
    // For individual registrations
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    participantType: {
      type: String,
      enum: ['college', 'external'],
      default: 'college'
    },
    name: String,
    email: String,
    college: String,
    department: String,
    year: String,
    phoneNumber: String,
    admissionNumber: String,

    // For team registrations
    isTeamRegistration: {
      type: Boolean,
      default: false
    },
    teamName: String,
    teamLeader: {
      participantType: {
        type: String,
        enum: ['college', 'external'],
        default: 'college'
      },
      name: String,
      email: String,
      college: String,
      department: String,
      year: String,
      phoneNumber: String,
      admissionNumber: String
    },
    teamMembers: [{
      participantType: {
        type: String,
        enum: ['college', 'external'],
        default: 'college'
      },
      name: {
        type: String,
        required: true
      },
      email: {
        type: String,
        required: true
      },
      college: String, // Made optional - will be validated in backend logic
      department: String,
      year: String,
      phoneNumber: String,
      admissionNumber: String
    }],

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