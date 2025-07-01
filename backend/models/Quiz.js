const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true
    // Note: trim removed to preserve code formatting and indentation
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
  },
  isCodeQuestion: {
    type: Boolean,
    default: false
  }
});

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['academic', 'event'],
    required: true
  },
  subject: {
    code: {
      type: String,
      required: function() {
        return this.type === 'academic';
      },
      trim: true
    },
    name: {
      type: String,
      required: function() {
        return this.type === 'academic';
      },
      trim: true
    }
  },
  eventDetails: {
    name: {
      type: String,
      required: function() {
        return this.type === 'event';
      }
    },
    description: {
      type: String,
      required: function() {
        return this.type === 'event';
      }
    },
    organizer: {
      type: String,
      required: function() {
        return this.type === 'event';
      }
    },
    venue: {
      type: String,
      required: function() {
        return this.type === 'event';
      }
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  duration: {
    type: Number,
    required: true,
    min: 1
  },
  totalMarks: {
    type: Number,
    required: true,
    min: 1,
    default: function() {
      return this.questions ? this.questions.reduce((sum, q) => sum + q.marks, 0) : 0;
    }
  },
  passingMarks: {
    type: Number,
    default: 0
  },
  negativeMarkingEnabled: {
    type: Boolean,
    default: false
  },
  shuffleQuestions: {
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
  questions: {
    type: [questionSchema],
    required: true,
    validate: {
      validator: function(questions) {
        return questions.length > 0;
      },
      message: 'Quiz must have at least one question'
    }
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true,
    validate: {
      validator: function(endTime) {
        // Skip validation if startTime is not set (this happens during updates)
        if (!this.startTime) return true;
        return endTime > this.startTime;
      },
      message: 'End time must be after start time'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  allowedGroups: [{
    department: String,
    year: Number,
    semester: Number,
    section: String
  }],
  sectionEndTimes: {
    type: Map,
    of: {
      endTime: {
        type: Date,
        required: true,
        validate: {
          validator: function(endTime) {
            return endTime > this.startTime;
          },
          message: 'Section end time must be after quiz start time'
        }
      },
      isActive: {
        type: Boolean,
        default: true
      }
    },
    default: new Map()
  },
  // New fields for section-specific settings
  sectionSettings: {
    type: Map,
    of: {
      shuffleQuestions: {
        type: Boolean,
        default: false
      },
      shuffleOptions: {
        type: Boolean,
        default: false
      },
      allowedAttempts: {
        type: Number,
        default: 1,
        min: 1
      },
      instructions: {
        type: String,
        trim: true
      }
    },
    default: new Map()
  },
  // Fields for event quizzes
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
  eligibility: {
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
    }
  },
  // Event quiz registrations (for event type quizzes)
  registrations: [{
    // For individual registrations
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
    phoneNumber: String,
    rollNumber: String,
    admissionNumber: String,

    // For team registrations
    isTeamRegistration: {
      type: Boolean,
      default: false
    },
    teamName: String,
    teamLeader: {
      name: String,
      email: String,
      college: String,
      department: String,
      year: String,
      section: String,
      phoneNumber: String,
      rollNumber: String,
      admissionNumber: String
    },
    teamMembers: [{
      name: {
        type: String,
        required: true
      },
      email: {
        type: String,
        required: true
      },
      college: {
        type: String,
        required: true
      },
      department: String,
      year: String,
      section: String,
      phoneNumber: String,
      rollNumber: String,
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
  submissions: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    answers: [{
      questionIndex: Number,
      selectedOption: Number
    }],
    score: Number,
    submittedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['submitted', 'evaluated'],
      default: 'submitted'
    }
  }]
}, {
  timestamps: true
});

// Index for efficient querying
quizSchema.index({
  isActive: 1,
  'allowedGroups.department': 1,
  'allowedGroups.year': 1,
  'allowedGroups.section': 1
});

// Enable virtuals in JSON
quizSchema.set('toJSON', { virtuals: true });
quizSchema.set('toObject', { virtuals: true });

// Method to check if a student can access this quiz
quizSchema.methods.canStudentAccess = function(student) {
  return (
    this.isActive &&
    this.allowedGroups.some(group => 
      group.department === student.department &&
      group.year === student.year &&
      group.section === student.section &&
      (!this.sectionEndTimes.has(student.section) || 
       (this.sectionEndTimes.get(student.section).isActive &&
        new Date() < this.sectionEndTimes.get(student.section).endTime))
    )
  );
};

// Method to get section-specific settings
quizSchema.methods.getSectionSettings = function(section) {
  return this.sectionSettings.get(section) || {
    shuffleQuestions: false,
    shuffleOptions: false,
    allowedAttempts: 1,
    instructions: ''
  };
};

// Method to shuffle questions for a specific student
quizSchema.methods.getShuffledQuestions = function(studentId) {
  if (!this.shuffleQuestions) {
    return this.questions;
  }

  // Create a deterministic shuffle based on quiz ID + student ID
  // This ensures the same student always gets the same order
  const seed = this._id.toString() + studentId.toString();
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Use the hash as seed for shuffling
  const questions = [...this.questions];
  const random = (seed) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  // Fisher-Yates shuffle with deterministic random
  for (let i = questions.length - 1; i > 0; i--) {
    const j = Math.floor(random(hash + i) * (i + 1));
    [questions[i], questions[j]] = [questions[j], questions[i]];
  }

  return questions;
};

// Middleware to calculate total marks before saving
quizSchema.pre('save', function(next) {
  if (this.questions) {
    this.totalMarks = this.questions.reduce((sum, question) => sum + question.marks, 0);
  }
  next();
});

// Add a custom method to validate dates
quizSchema.statics.validateDates = function(startTime, endTime) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  if (isNaN(start.getTime())) {
    throw new Error('Invalid start time');
  }
  
  if (isNaN(end.getTime())) {
    throw new Error('Invalid end time');
  }
  
  if (end <= start) {
    throw new Error('End time must be after start time');
  }
  
  return true;
};

const Quiz = mongoose.model('Quiz', quizSchema);
module.exports = Quiz; 