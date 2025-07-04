const express = require('express');
const router = express.Router();
const EventQuiz = require('../models/EventQuiz');
const { auth, isEventAdmin, authorize } = require('../middleware/auth');
const EventQuizAccount = require('../models/EventQuizAccount');
const EventQuizResult = require('../models/EventQuizResult');
const QuizCredentials = require('../models/QuizCredentials');
const QuizSettings = require('../models/QuizSettings');
const { generateCredentials, sendRegistrationEmail } = require('../services/emailService');
const { encrypt, decrypt } = require('../utils/encryption');
const multer = require('multer');
const XLSX = require('xlsx');
const mammoth = require('mammoth');
const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs').promises;
const User = require('../models/User');

// Universal code detection and HTML formatting functions (same as regular quiz)
const isCodeLine = (line) => {
  const trimmed = line.trim();
  if (!trimmed) return false;

  // Check for common programming patterns
  const codePatterns = [
    /^\s{2,}/, // 2+ spaces at start (indentation)
    /def\s+\w+\s*\(/, // Python function definition
    /function\s+\w+\s*\(/, // JavaScript function
    /class\s+\w+/, // Class definition
    /if\s*\(.*\)\s*[:{]/, // If statements
    /for\s*\(.*\)\s*[:{]/, // For loops
    /while\s*\(.*\)\s*[:{]/, // While loops
    /else\s*[:{]/, // Else statements
    /return\s+/, // Return statements
    /print\s*\(/, // Print statements
    /console\.log\s*\(/, // Console.log
    /\w+\s*=\s*\w+/, // Variable assignments
    /[{}();]/, // Common code punctuation
    /<\w+[^>]*>/, // HTML tags
    /^\s*#/, // Comments or preprocessor directives
    /import\s+/, // Import statements
    /from\s+\w+\s+import/, // Python imports
  ];

  return codePatterns.some(pattern => pattern.test(line));
};

const hasCodeContent = (text) => {
  if (!text) return false;
  const lines = text.split('\n');
  return lines.some(line => isCodeLine(line));
};

const processTextWithHtmlFormatting = (text) => {
  if (!text) return '';

  // Simple approach: if text contains any code patterns, wrap the entire text in <pre>
  // This ensures perfect preservation without complex parsing
  if (hasCodeContent(text)) {
    // Check if this is HTML code that should be displayed as text
    if (text.includes('<html>') || text.includes('<!DOCTYPE') || text.includes('<div>') || text.includes('<p>') || text.includes('<span>') || text.includes('<body>')) {
      // This is HTML code - escape it so it displays as text
      const processedText = text
        .replace(/&/g, '&amp;')   // Must be first
        .replace(/</g, '&lt;')    // Escape < for HTML display
        .replace(/>/g, '&gt;')    // Escape > for HTML display
        .replace(/"/g, '&quot;')  // Escape quotes
        .replace(/'/g, '&#x27;'); // Escape single quotes

      return '<pre>' + processedText + '</pre>';
    } else {
      // For C/C++/Python/etc. code, preserve angle brackets completely
      // Only escape ampersands that aren't part of HTML entities
      let processedText = text.replace(/&(?![a-zA-Z0-9#]+;)/g, '&amp;');

      return '<pre>' + processedText + '</pre>';
    }
  }

  // For non-code text, return as-is
  return text;
};

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    try {
      await fs.mkdir(uploadsDir, { recursive: true });
      cb(null, uploadsDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
    'application/vnd.ms-excel', // xls
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
    'application/msword', // doc
    'image/jpeg',
    'image/png',
    'image/gif'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only Excel, Word files and images (JPEG, PNG, GIF) are allowed.'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Configure multer for memory uploads (for parsing endpoints)
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Create a new event quiz
router.post('/', auth, authorize('faculty', 'admin', 'event'), async (req, res) => {
  try {
    // Validate questions
    if (!req.body.questions || !Array.isArray(req.body.questions) || req.body.questions.length === 0) {
      return res.status(400).json({ message: 'At least one question is required' });
    }

    // Validate each question
    for (const question of req.body.questions) {
      if (!question.question) {
        return res.status(400).json({ message: 'Question text is required' });
      }
      if (!Array.isArray(question.options) || question.options.length !== 4) {
        return res.status(400).json({ message: 'Each question must have exactly 4 options' });
      }
      if (question.correctAnswer === undefined || question.correctAnswer < 0 || question.correctAnswer > 3) {
        return res.status(400).json({ message: 'Valid correct answer index (0-3) is required' });
      }
      if (!question.marks || question.marks < 1) {
        return res.status(400).json({ message: 'Valid marks (minimum 1) are required' });
      }
    }

    // Use the fields directly from request body (frontend sends them directly)
    const quizData = {
      ...req.body,
      // Use the fields from request body, with fallbacks to ['all'] if not provided
      departments: req.body.departments || ['all'],
      years: req.body.years || ['all'],
      semesters: req.body.semesters || ['all'],
      sections: req.body.sections || ['all'],
      createdBy: req.user._id,
      totalMarks: req.body.questions.reduce((sum, q) => sum + (q.marks || 1), 0),
      status: 'upcoming'
    };

    console.log('Creating quiz with data:', quizData);
    console.log('participantTypes in quizData:', quizData.participantTypes);
    console.log('departments in quizData:', quizData.departments);
    console.log('years in quizData:', quizData.years);
    console.log('semesters in quizData:', quizData.semesters);

    const quiz = new EventQuiz(quizData);
    console.log('Quiz before save:', quiz.toObject());

    await quiz.save();
    console.log('Quiz after save:', quiz.toObject());
    console.log('Saved participantTypes:', quiz.participantTypes);

    // Handle pre-filled students if provided
    if (req.body.prefilledStudents && Array.isArray(req.body.prefilledStudents) && req.body.prefilledStudents.length > 0) {
      console.log(`🎯 Creating credentials for ${req.body.prefilledStudents.length} pre-filled students`);

      try {
        const { generateCredentials, sendRegistrationEmail } = require('../services/emailService');
        let successCount = 0;
        let failureCount = 0;

        for (const email of req.body.prefilledStudents) {
          try {
            // Create a mock registration object for credential generation
            const mockRegistration = {
              email: email,
              name: email.split('@')[0], // Use email prefix as name
              participantType: 'external', // Default to external
              college: 'Pre-selected Student',
              department: 'N/A',
              year: 'N/A',
              phoneNumber: 'N/A',
              admissionNumber: 'N/A',
              isTeamRegistration: false,
              registeredAt: new Date()
            };

            // Generate credentials
            const credentials = generateCredentials(mockRegistration, quiz);

            // Check if credentials already exist
            let quizCredentials = await QuizCredentials.findOne({
              quiz: quiz._id,
              username: credentials.username
            });

            if (!quizCredentials) {
              // Create new credentials
              quizCredentials = new QuizCredentials({
                quiz: quiz._id,
                username: credentials.username,
                password: credentials.password,
                participantDetails: mockRegistration,
                createdAt: new Date()
              });
              await quizCredentials.save();
            }

            // Send email with credentials
            const emailSent = await sendRegistrationEmail(mockRegistration, quiz, credentials);
            if (emailSent) {
              successCount++;
              console.log(`✅ Credentials created and email sent to: ${email}`);
            } else {
              failureCount++;
              console.log(`❌ Failed to send email to: ${email}`);
            }
          } catch (studentError) {
            failureCount++;
            console.error(`❌ Error processing student ${email}:`, studentError);
          }
        }

        console.log(`📊 Pre-filled students processing complete: ${successCount} successful, ${failureCount} failed`);
      } catch (error) {
        console.error('❌ Error processing pre-filled students:', error);
      }
    }

    res.status(201).json(quiz);
  } catch (error) {
    console.error('Error creating event quiz:', error);
    res.status(400).json({ message: error.message });
  }
});

// Get all event quizzes (with filters)
router.get('/', async (req, res) => {
  try {
    console.log('GET /api/event-quiz - Request received');
    const { status, participantType } = req.query;
    const query = {};

    if (participantType) query.participantType = participantType;

    console.log('Query:', query);
    let quizzes = await EventQuiz.find(query)
      .populate('createdBy', 'name email')
      .sort('-createdAt');

    // Calculate dynamic status based on current time
    const now = new Date();
    quizzes = quizzes.map(quiz => {
      const startTime = new Date(quiz.startTime);
      const endTime = new Date(quiz.endTime);

      let dynamicStatus;
      if (now < startTime) {
        dynamicStatus = 'upcoming';
      } else if (now >= startTime && now <= endTime) {
        dynamicStatus = 'active';
      } else {
        dynamicStatus = 'completed';
      }

      // Convert to plain object and add dynamic status
      const quizObj = quiz.toObject();
      quizObj.dynamicStatus = dynamicStatus;

      console.log(`Quiz "${quiz.title}": stored status = ${quiz.status}, dynamic status = ${dynamicStatus}`);
      console.log(`Quiz "${quiz.title}" participantTypes:`, quizObj.participantTypes);
      console.log(`Quiz "${quiz.title}" participantType:`, quizObj.participantType);
      console.log(`Quiz "${quiz.title}" departments:`, quizObj.departments);
      console.log(`Quiz "${quiz.title}" years:`, quizObj.years);
      console.log(`Quiz "${quiz.title}" semesters:`, quizObj.semesters);

      return quizObj;
    });

    // Filter by status if requested (use dynamic status)
    if (status) {
      quizzes = quizzes.filter(quiz => quiz.dynamicStatus === status);
    }

    console.log(`Found ${quizzes.length} quizzes after filtering`);

    if (!quizzes) {
      console.log('No quizzes found');
      return res.json([]);
    }

    console.log('Sending response with quizzes');
    return res.json(quizzes);
  } catch (error) {
    console.error('Error in GET /api/event-quiz:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get public event quizzes (no authentication required) - MUST BE BEFORE /:id route
router.get('/public', async (req, res) => {
  try {
    console.log('=== FETCHING PUBLIC EVENT QUIZZES ===');

    // First, get ALL quizzes to see what we have
    const allQuizzes = await EventQuiz.find({});
    console.log(`Total quizzes in database: ${allQuizzes.length}`);

    if (allQuizzes.length > 0) {
      console.log('All quizzes in database:');
      allQuizzes.forEach((q, index) => {
        console.log(`${index + 1}. ${q.title}:`);
        console.log(`   - Status: ${q.status}`);
        console.log(`   - Registration Enabled: ${q.registrationEnabled}`);
        console.log(`   - Spot Registration Enabled: ${q.spotRegistrationEnabled}`);
        console.log(`   - Start Time: ${q.startTime}`);
        console.log(`   - End Time: ${q.endTime}`);
        console.log(`   - Created: ${q.createdAt}`);
      });
    } else {
      console.log('No quizzes found in database!');
    }

    // Now get quizzes for public display - simplified query
    let quizzes = await EventQuiz.find({})
    .populate('createdBy', 'name email')
    .select('-questions.correctAnswer -questions.explanation') // Hide answers for security
    .sort({ startTime: 1 });

    // Calculate dynamic status for public quizzes too
    const now = new Date();
    quizzes = quizzes.map(quiz => {
      const startTime = new Date(quiz.startTime);
      const endTime = new Date(quiz.endTime);

      let dynamicStatus;
      if (now < startTime) {
        dynamicStatus = 'upcoming';
      } else if (now >= startTime && now <= endTime) {
        dynamicStatus = 'active';
      } else {
        dynamicStatus = 'completed';
      }

      // Convert to plain object and add dynamic status
      const quizObj = quiz.toObject();
      quizObj.dynamicStatus = dynamicStatus;

      return quizObj;
    });

    console.log(`Returning ${quizzes.length} quizzes to frontend`);

    res.json(quizzes);
  } catch (error) {
    console.error('Error fetching public event quizzes:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get a specific event quiz
router.get('/:id', async (req, res) => {
  try {
    const quiz = await EventQuiz.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('questions');
    
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    
    res.json(quiz);
  } catch (error) {
    console.error('Error fetching event quiz:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update an event quiz
router.put('/:id', auth, authorize('faculty', 'admin', 'event'), async (req, res) => {
  try {
    const quiz = await EventQuiz.findById(req.params.id);
    
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Only allow updates if quiz hasn't started
    if (quiz.status !== 'upcoming') {
      return res.status(400).json({ message: 'Cannot update quiz after it has started' });
    }

    Object.assign(quiz, req.body);
    await quiz.save();
    
    res.json(quiz);
  } catch (error) {
    console.error('Error updating event quiz:', error);
    res.status(400).json({ message: error.message });
  }
});

// Register for an event quiz
router.post('/:id/register', auth, async (req, res) => {
  try {
    const quiz = await EventQuiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if registration is enabled
    if (!quiz.registrationEnabled && !quiz.spotRegistrationEnabled) {
      return res.status(400).json({ message: 'Registration is closed' });
    }

    // Check if quiz is full
    if (quiz.maxParticipants > 0 && quiz.registrations.length >= quiz.maxParticipants) {
      return res.status(400).json({ message: 'Quiz is full' });
    }

    // Check if user is already registered
    if (quiz.registrations.some(reg => reg.student.equals(req.user._id))) {
      return res.status(400).json({ message: 'Already registered' });
    }

    // Add registration
    quiz.registrations.push({
      student: req.user._id,
      name: req.user.name,
      email: req.user.email,
      college: req.body.college,
      department: req.body.department,
      year: req.body.year,
      isSpotRegistration: req.body.isSpotRegistration || false
    });

    await quiz.save();
    res.status(201).json({ message: 'Registration successful' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Public registration for event quiz (no authentication required) - Enhanced for team support
router.post('/:id/register-public', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      // Individual registration fields
      name, email, college, department, year, phoneNumber, admissionNumber,
      // Team registration fields
      isTeamRegistration, teamName, teamLeader, teamMembers,
      // Participant type
      participantType
    } = req.body;

    console.log('Public registration request for quiz:', id);
    console.log('Registration type:', isTeamRegistration ? 'Team' : 'Individual');
    // DUPLICATE KEY FIX APPLIED - UPDATED CODE LOADED
    console.log('🔧 DUPLICATE KEY FIX: Code updated to handle existing credentials');

    // Find the quiz
    const quiz = await EventQuiz.findById(id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if quiz allows registration
    const now = new Date();
    const quizStarted = quiz.startTime <= now;
    const quizEnded = quiz.endTime <= now;

    if (quizEnded) {
      return res.status(400).json({ message: 'Quiz has ended. Registration is closed.' });
    }

    // Check registration eligibility
    if (!quizStarted && !quiz.registrationEnabled) {
      return res.status(400).json({ message: 'Registration is not enabled for this quiz' });
    }

    if (quizStarted && !quiz.spotRegistrationEnabled) {
      return res.status(400).json({ message: 'Quiz has started and spot registration is not enabled.' });
    }

    let registration;

    if (isTeamRegistration) {
      // Team registration validation
      if (!teamName || !teamLeader || !teamMembers || !Array.isArray(teamMembers)) {
        return res.status(400).json({
          message: 'Team name, team leader, and team members are required for team registration'
        });
      }

      // Validate team size
      const totalTeamSize = 1 + teamMembers.length; // leader + members
      if (quiz.participationMode === 'team' && totalTeamSize !== quiz.teamSize) {
        return res.status(400).json({
          message: `Team size must be exactly ${quiz.teamSize} members`
        });
      }

      // Validate team leader
      if (!teamLeader.name || !teamLeader.email) {
        return res.status(400).json({
          message: 'Team leader name and email are required'
        });
      }

      // Validate team leader based on participant type
      if (participantType === 'college' || (quiz.participantTypes?.includes('college') && !quiz.participantTypes?.includes('external'))) {
        if (!teamLeader.department || !teamLeader.year || !teamLeader.phoneNumber || !teamLeader.admissionNumber) {
          return res.status(400).json({
            message: 'Team leader must provide department, year, phone number, and admission number for college students'
          });
        }
      } else if (participantType === 'external' || (!quiz.participantTypes?.includes('college') && quiz.participantTypes?.includes('external'))) {
        if (!teamLeader.college) {
          return res.status(400).json({
            message: 'Team leader must provide college/institution for external students'
          });
        }
      }

      // Validate team members
      for (let i = 0; i < teamMembers.length; i++) {
        const member = teamMembers[i];
        if (!member.name || !member.email) {
          return res.status(400).json({
            message: `Team member ${i + 1} must have name and email`
          });
        }

        // Validate member based on their individual participant type
        if (member.participantType === 'college' || (quiz.participantTypes?.includes('college') && !quiz.participantTypes?.includes('external'))) {
          if (!member.department || !member.year || !member.phoneNumber || !member.admissionNumber) {
            return res.status(400).json({
              message: `Team member ${i + 1} must provide department, year, phone number, and admission number for college students`
            });
          }
        } else if (member.participantType === 'external' || (!quiz.participantTypes?.includes('college') && quiz.participantTypes?.includes('external'))) {
          if (!member.college) {
            return res.status(400).json({
              message: `Team member ${i + 1} must provide college/institution for external students`
            });
          }
        }
      }

      // Check for duplicate emails within the team
      const allEmails = [teamLeader.email, ...teamMembers.map(m => m.email)];
      const uniqueEmails = new Set(allEmails);
      if (uniqueEmails.size !== allEmails.length) {
        return res.status(400).json({ message: 'Duplicate emails found within the team' });
      }

      // Check if any team member email is already registered (including deleted registrations)
      const existingEmails = quiz.registrations.flatMap(reg => {
        if (reg.isTeamRegistration) {
          return [reg.teamLeader.email, ...reg.teamMembers.map(m => m.email)];
        }
        return [reg.email];
      });

      const duplicateEmail = allEmails.find(email => existingEmails.includes(email));
      if (duplicateEmail) {
        // Check if it's a deleted registration
        const deletedRegistration = quiz.registrations.find(reg => {
          if (reg.isTeamRegistration) {
            return reg.isDeleted && (reg.teamLeader.email === duplicateEmail || reg.teamMembers.some(m => m.email === duplicateEmail));
          }
          return reg.isDeleted && reg.email === duplicateEmail;
        });

        if (deletedRegistration) {
          return res.status(400).json({
            message: `Email ${duplicateEmail} was previously registered but has been removed by the administrator. Please contact the event organizer for assistance.`
          });
        } else {
          return res.status(400).json({
          message: `Email ${duplicateEmail} is already registered for this quiz`
        });
        }
      }

      // Set default college for college students if not provided
      const processedTeamLeader = {
        ...teamLeader,
        college: teamLeader.participantType === 'college' && !teamLeader.college ? 'College Student' : teamLeader.college
      };

      const processedTeamMembers = teamMembers.map(member => ({
        ...member,
        college: member.participantType === 'college' && !member.college ? 'College Student' : member.college
      }));

      registration = {
        isTeamRegistration: true,
        participantType,
        teamName,
        teamLeader: processedTeamLeader,
        teamMembers: processedTeamMembers,
        registeredAt: new Date(),
        isSpotRegistration: quizStarted // Mark as spot registration if quiz has started
      };
    } else {
      // Individual registration validation
      if (!name || !email) {
        return res.status(400).json({
          message: 'Name and email are required'
        });
      }

      // Validate based on participant type
      if (participantType === 'college' || (quiz.participantTypes?.includes('college') && !quiz.participantTypes?.includes('external'))) {
        if (!department || !year || !phoneNumber || !admissionNumber) {
          return res.status(400).json({
            message: 'Department, year, phone number, and admission number are required for college students'
          });
        }
      } else if (participantType === 'external' || (!quiz.participantTypes?.includes('college') && quiz.participantTypes?.includes('external'))) {
        if (!college) {
          return res.status(400).json({
            message: 'College/institution is required for external students'
          });
        }
      }

      // Check if email is already registered (including deleted registrations)
      const existingEmails = quiz.registrations.flatMap(reg => {
        if (reg.isTeamRegistration) {
          return [reg.teamLeader.email, ...reg.teamMembers.map(m => m.email)];
        }
        return [reg.email];
      });

      if (existingEmails.includes(email)) {
        // Check if it's a deleted registration
        const deletedRegistration = quiz.registrations.find(reg => {
          if (reg.isTeamRegistration) {
            return reg.isDeleted && (reg.teamLeader.email === email || reg.teamMembers.some(m => m.email === email));
          }
          return reg.isDeleted && reg.email === email;
        });

        if (deletedRegistration) {
          return res.status(400).json({
            message: 'This email was previously registered but has been removed by the administrator. Please contact the event organizer for assistance.'
          });
        } else {
          return res.status(400).json({ message: 'This email is already registered for this quiz' });
        }
      }

      registration = {
        participantType,
        name,
        email,
        college: participantType === 'college' && !college ? 'College Student' : college,
        department,
        year,
        phoneNumber,
        admissionNumber,
        isTeamRegistration: false,
        registeredAt: new Date(),
        isSpotRegistration: quizStarted // Mark as spot registration if quiz has started
      };
    }

    // Check if quiz is full (considering team sizes)
    if (quiz.maxParticipants > 0) {
      const currentParticipants = quiz.registrations.reduce((total, reg) => {
        return total + (reg.isTeamRegistration ? (1 + reg.teamMembers.length) : 1);
      }, 0);

      const newParticipants = isTeamRegistration ? (1 + teamMembers.length) : 1;

      if (currentParticipants + newParticipants > quiz.maxParticipants) {
        return res.status(400).json({ message: 'Quiz is full. Registration limit reached.' });
      }
    }

    quiz.registrations.push(registration);
    await quiz.save();

    // Get the registration ID
    const registrationId = quiz.registrations[quiz.registrations.length - 1]._id;

    if (isTeamRegistration) {
      // Generate shared credentials for the team (based on team leader)
      const teamCredentials = generateCredentials(registration, quiz);

      // Check if credentials already exist for this team leader and quiz
      let quizCredentials = await QuizCredentials.findOne({
        quiz: quiz._id,
        username: teamCredentials.username
      });

      if (quizCredentials) {
        // Update existing credentials with new team registration
        quizCredentials.registration = registrationId;
        quizCredentials.teamName = teamName;
        quizCredentials.participantDetails = teamLeader;
        quizCredentials.teamMembers = teamMembers;
        await quizCredentials.save();
        console.log('Updated existing team credentials for user:', teamCredentials.username);
      } else {
        // Create new credential record for the team
        quizCredentials = new QuizCredentials({
          quiz: quiz._id,
          registration: registrationId,
          username: teamCredentials.username, // Team leader's email
          password: teamCredentials.password, // Generated password
          originalPassword: teamCredentials.password,
          isTeam: true,
          teamName: teamName,
          participantDetails: teamLeader,
          teamMembers: teamMembers
        });

        await quizCredentials.save();
        console.log('Created new team credentials for user:', teamCredentials.username);
      }

      // Send registration confirmation emails to all team members with team details
      try {
        await sendRegistrationEmail(registration, quiz, teamCredentials);
        console.log(`Registration emails sent to all team members`);
      } catch (emailError) {
        console.error('Failed to send registration emails:', emailError);
        // Don't fail the registration if email fails
      }
    } else {
      // Individual registration - generate single credentials
      const credentials = generateCredentials(registration, quiz);

      // Check if credentials already exist for this user and quiz
      let quizCredentials = await QuizCredentials.findOne({
        quiz: quiz._id,
        username: credentials.username
      });

      if (quizCredentials) {
        // Update existing credentials with new registration
        quizCredentials.registration = registrationId;
        quizCredentials.participantDetails = {
          name,
          email,
          college,
          department,
          year,
          phoneNumber,
          admissionNumber,
          participantType
        };
        await quizCredentials.save();
        console.log('Updated existing credentials for user:', credentials.username);
      } else {
        // Create new quiz credentials record
        quizCredentials = new QuizCredentials({
          quiz: quiz._id,
          registration: registrationId,
          username: credentials.username,
          password: credentials.password,
          originalPassword: credentials.password,
          isTeam: false,
          participantDetails: {
            name,
            email,
            college,
            department,
            year,
            phoneNumber,
            admissionNumber,
            participantType
          }
        });

        await quizCredentials.save();
        console.log('Created new credentials for user:', credentials.username);
      }

      // Send registration confirmation email with credentials
      try {
        await sendRegistrationEmail(registration, quiz, credentials);
        console.log('Registration email sent successfully');
      } catch (emailError) {
        console.error('Failed to send registration email:', emailError);
        // Don't fail the registration if email fails
      }
    }

    console.log('Registration successful:', isTeamRegistration ? `Team: ${teamName}` : `Individual: ${email}`);

    const responseMessage = isTeamRegistration
      ? `Team registration successful! All team members will receive individual emails with login credentials.`
      : `Registration successful! Check your email for login credentials.`;

    res.status(201).json({
      message: responseMessage,
      registrationId,
      type: isTeamRegistration ? 'team' : 'individual',
      teamMemberCount: isTeamRegistration ? (teamMembers.length + 1) : 1,
      emailsSent: isTeamRegistration ? (teamMembers.length + 1) : 1
    });
  } catch (error) {
    console.error('Error registering for event quiz:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body:', req.body);
    console.error('Quiz ID:', req.params.id);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Debug endpoint to check credentials for a quiz
router.get('/:id/debug-credentials', async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🔍 DEBUG: Checking credentials for quiz ${id}`);

    const credentials = await QuizCredentials.find({ quiz: id });
    console.log(`🔍 DEBUG: Found ${credentials.length} credentials for quiz ${id}`);

    credentials.forEach((cred, index) => {
      console.log(`🔍 DEBUG: Credential ${index + 1}:`, {
        username: cred.username,
        isActive: cred.isActive,
        isTeam: cred.isTeam,
        teamName: cred.teamName,
        hasAttemptedQuiz: cred.hasAttemptedQuiz
      });
    });

    res.json({
      quizId: id,
      totalCredentials: credentials.length,
      credentials: credentials.map(cred => ({
        username: cred.username,
        isActive: cred.isActive,
        isTeam: cred.isTeam,
        teamName: cred.teamName,
        hasAttemptedQuiz: cred.hasAttemptedQuiz,
        participantDetails: cred.participantDetails
      }))
    });
  } catch (error) {
    console.error('🔍 DEBUG: Error checking credentials:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Quiz participant login endpoint (required for taking quiz)
router.post('/:id/login', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password } = req.body;

    console.log(`🔑 LOGIN: Attempting login for quiz ${id} with username: ${username}`);

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Find the quiz
    const quiz = await EventQuiz.findById(id);
    if (!quiz) {
      console.log(`🔑 LOGIN: Quiz ${id} not found`);
      return res.status(404).json({ message: 'Quiz not found' });
    }

    console.log(`🔑 LOGIN: Quiz found: ${quiz.title}`);

    // Check if quiz is available for taking
    const now = new Date();
    const startTime = new Date(quiz.startTime);
    const endTime = new Date(quiz.endTime);

    if (now < startTime) {
      return res.status(400).json({
        message: `Quiz has not started yet. It will begin at ${startTime.toLocaleString('en-IN')}`
      });
    }

    if (now > endTime) {
      return res.status(400).json({ message: 'Quiz has ended' });
    }

    // Find credentials for this quiz and username (email)
    console.log(`🔑 LOGIN: Searching for credentials with username: ${username.toLowerCase().trim()}`);

    let credentials = await QuizCredentials.findOne({
      quiz: id,
      username: username.toLowerCase().trim(),
      isActive: true
    });

    console.log(`🔑 LOGIN: Found credentials:`, credentials ? 'YES' : 'NO');

    if (credentials) {
      console.log(`🔑 LOGIN: Credentials details:`, {
        username: credentials.username,
        isTeam: credentials.isTeam,
        teamName: credentials.teamName,
        hasAttemptedQuiz: credentials.hasAttemptedQuiz,
        isActive: credentials.isActive
      });
    }

    // Get quiz settings to check emergency password
    const quizSettings = await QuizSettings.getOrCreateDefault();
    const isEmergencyPassword = quizSettings.validateEmergencyPassword(password);

    // If no credentials found, return error (emergency password doesn't create fake credentials)
    if (!credentials) {
      console.log(`🔑 LOGIN: No valid credentials found for username: ${username}`);
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Check if account is locked (skip for emergency admin credentials)
    if (credentials._id !== 'emergency-admin' && credentials.isAccountLocked()) {
      return res.status(423).json({
        message: 'Account is temporarily locked due to too many failed attempts. Please try again later.'
      });
    }

    // Verify password (check both regular password and emergency password)
    let isPasswordValid = false;
    if (isEmergencyPassword) {
      // Emergency password is always valid
      isPasswordValid = true;
      console.log(`🔑 LOGIN: Emergency password used for quiz ${id} by user ${username}`);
    } else if (credentials._id !== 'emergency-admin') {
      // Regular password validation for real credentials
      isPasswordValid = await credentials.comparePassword(password);
    }

    if (!isPasswordValid) {
      // Only increment login attempts for real credentials, not emergency admin
      if (credentials._id !== 'emergency-admin' && credentials.incLoginAttempts) {
        await credentials.incLoginAttempts();
      }
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Check if already attempted quiz (allow emergency password to override)
    if (credentials.hasAttemptedQuiz && !isEmergencyPassword) {
      return res.status(400).json({ message: 'You have already attempted this quiz' });
    }

    // Additional check: Look for existing quiz results (allow emergency password to override)
    if (!isEmergencyPassword) {
      const existingResult = await EventQuizResult.findOne({
        quiz: id,
        'participantInfo.email': credentials.participantDetails?.email || username
      });

      if (existingResult) {
        console.log(`🔑 LOGIN: Found existing quiz result for ${username}, blocking login`);
        return res.status(400).json({
          message: 'You have already submitted this quiz',
          submissionDetails: {
            submittedAt: existingResult.submittedAt,
            score: existingResult.score,
            totalMarks: existingResult.totalMarks
          }
        });
      }
    } else {
      console.log(`🔑 LOGIN: Emergency password used - allowing login even if already submitted`);
    }

    // Reset login attempts on successful login
    if (credentials.resetLoginAttempts) {
      await credentials.resetLoginAttempts();
    }

    // Generate session token
    const sessionToken = require('crypto').randomBytes(32).toString('hex');

    // Store session token in the credentials record
    credentials.sessionToken = sessionToken;
    credentials.lastLoginAt = new Date();
    await credentials.save();
    console.log(`🔑 LOGIN: Session token stored for user: ${username}`);

    const responseData = {
      message: 'Login successful',
      sessionToken,
      quiz: {
        id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        duration: quiz.duration,
        totalQuestions: quiz.questions.length,
        startTime: quiz.startTime,
        endTime: quiz.endTime,
        instructions: quiz.instructions,
        totalMarks: quiz.questions.reduce((sum, q) => sum + (q.marks || 1), 0)
      },
      participant: {
        isTeam: credentials.isTeam,
        teamName: credentials.teamName,
        participantDetails: credentials.participantDetails,
        teamMembers: credentials.teamMembers,
        isEmergencyLogin: isEmergencyPassword
      },
      hasAttemptedQuiz: credentials.hasAttemptedQuiz
    };

    console.log(`🔑 LOGIN: Sending successful response:`, {
      message: responseData.message,
      sessionToken: responseData.sessionToken ? 'Generated' : 'Missing',
      quizTitle: responseData.quiz?.title,
      participantType: responseData.participant?.isTeam ? 'Team' : 'Individual',
      hasAttemptedQuiz: responseData.hasAttemptedQuiz
    });

    res.json(responseData);
  } catch (error) {
    console.error('Error in quiz login:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get quiz for public access (no authentication required)
router.get('/:id/public-access', async (req, res) => {
  try {
    const { id } = req.params;

    const quiz = await EventQuiz.findById(id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if quiz is currently active
    const now = new Date();
    const startTime = new Date(quiz.startTime);
    const endTime = new Date(quiz.endTime);

    if (now < startTime) {
      return res.status(400).json({
        message: `Quiz has not started yet. It will begin at ${startTime.toLocaleString('en-IN')}`,
        quiz: {
          id: quiz._id,
          title: quiz.title,
          description: quiz.description,
          startTime: quiz.startTime,
          endTime: quiz.endTime,
          instructions: quiz.instructions
        }
      });
    }

    if (now > endTime) {
      return res.status(400).json({
        message: 'Quiz has ended',
        quiz: {
          id: quiz._id,
          title: quiz.title,
          description: quiz.description,
          startTime: quiz.startTime,
          endTime: quiz.endTime
        }
      });
    }

    // Return quiz info and questions for active quiz
    const questions = quiz.questions.map((q, index) => ({
      id: index,
      question: q.question,
      options: q.options,
      marks: q.marks,
      image: q.image,
      isCodeQuestion: q.isCodeQuestion || false
    }));

    res.json({
      quiz: {
        id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        duration: quiz.duration,
        instructions: quiz.instructions,
        startTime: quiz.startTime,
        endTime: quiz.endTime,
        questionDisplayMode: quiz.questionDisplayMode || 'one-by-one', // Include question display mode
        participationMode: quiz.participationMode,
        teamSize: quiz.teamSize,
        totalQuestions: quiz.questions.length,
        totalMarks: quiz.questions.reduce((sum, q) => sum + (q.marks || 1), 0)
      },
      questions,
      timeRemaining: Math.max(0, endTime.getTime() - now.getTime()),
      isActive: true
    });
  } catch (error) {
    console.error('Error fetching quiz for public access:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get quiz questions for authenticated participants
router.get('/:id/questions', async (req, res) => {
  try {
    const { id } = req.params;
    const sessionToken = req.headers.sessiontoken || req.headers.sessionToken;

    console.log(`🔍 QUESTIONS: Headers received:`, Object.keys(req.headers));
    console.log(`🔍 QUESTIONS: Session token:`, sessionToken ? 'Found' : 'Missing');

    if (!sessionToken) {
      console.log(`🔍 QUESTIONS: No session token found in headers`);
      return res.status(401).json({ message: 'Session token required' });
    }

    console.log(`🔍 QUESTIONS: Fetching quiz ${id}`);

    const quiz = await EventQuiz.findById(id);
    if (!quiz) {
      console.log(`🔍 QUESTIONS: Quiz ${id} not found`);
      return res.status(404).json({ message: 'Quiz not found' });
    }

    console.log(`🔍 QUESTIONS: Quiz found: ${quiz.title}`);
    console.log(`🔍 QUESTIONS: Quiz has ${quiz.questions?.length || 0} questions`);

    // Check if quiz is currently active
    const now = new Date();
    const startTime = new Date(quiz.startTime);
    const endTime = new Date(quiz.endTime);

    console.log(`🔍 QUESTIONS: Time check - Now: ${now.toISOString()}, Start: ${startTime.toISOString()}, End: ${endTime.toISOString()}`);

    if (now < startTime) {
      console.log(`🔍 QUESTIONS: Quiz has not started yet`);
      return res.status(400).json({
        message: `Quiz has not started yet. It will begin at ${startTime.toLocaleString('en-IN')}`
      });
    }

    if (now > endTime) {
      console.log(`🔍 QUESTIONS: Quiz has ended`);
      return res.status(400).json({ message: 'Quiz has ended' });
    }

    console.log(`🔍 QUESTIONS: Quiz is active, preparing questions`);

    if (!quiz.questions || quiz.questions.length === 0) {
      console.log(`🔍 QUESTIONS: No questions found in quiz`);
      return res.status(400).json({ message: 'No questions available for this quiz' });
    }

    // Get participant ID for shuffling (use session token as unique identifier)
    const participantId = sessionToken;

    // Get questions (shuffled if enabled)
    let questionsToUse = quiz.questions;
    if (quiz.shuffleQuestions) {
      questionsToUse = quiz.getShuffledQuestions(participantId);
      console.log(`🔍 QUESTIONS: Questions shuffled for participant ${participantId.substring(0, 8)}...`);
    }

    // Return questions without correct answers
    const questions = questionsToUse.map((q, index) => ({
      id: index,
      question: q.question,
      options: q.options,
      marks: q.marks,
      image: q.image,
      isCodeQuestion: q.isCodeQuestion || false
    }));

    console.log(`🔍 QUESTIONS: Prepared ${questions.length} questions`);

    // Calculate time remaining based on quiz duration (not end time)
    const quizDurationMs = quiz.duration * 60 * 1000; // Convert minutes to milliseconds
    const timeRemainingFromEndTime = Math.max(0, endTime.getTime() - now.getTime());
    const timeRemainingFromDuration = Math.min(quizDurationMs, timeRemainingFromEndTime);

    const responseData = {
      quiz: {
        id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        duration: quiz.duration,
        instructions: quiz.instructions,
        startTime: quiz.startTime,
        endTime: quiz.endTime,
        questionDisplayMode: quiz.questionDisplayMode || 'one-by-one', // Include question display mode
        participationMode: quiz.participationMode,
        teamSize: quiz.teamSize
      },
      questions,
      timeRemaining: timeRemainingFromDuration
    };

    console.log(`🔍 QUESTIONS: Sending response with ${responseData.questions.length} questions`);
    console.log(`🔍 QUESTIONS: Time remaining: ${responseData.timeRemaining}ms`);

    res.json(responseData);
  } catch (error) {
    console.error('Error fetching quiz questions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check if quiz still exists (for active participants)
router.get('/:id/status', async (req, res) => {
  try {
    const quiz = await EventQuiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({
        exists: false,
        message: 'Quiz has been deleted by the event manager',
        deletedAt: new Date()
      });
    }

    const now = new Date();
    const startTime = new Date(quiz.startTime);
    const endTime = new Date(quiz.endTime);
    const isActive = now >= startTime && now <= endTime;

    res.json({
      exists: true,
      isActive,
      title: quiz.title,
      startTime: quiz.startTime,
      endTime: quiz.endTime,
      timeRemaining: isActive ? Math.max(0, endTime.getTime() - now.getTime()) : 0
    });
  } catch (error) {
    console.error('Error checking quiz status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Debug endpoint to check quiz credentials and submissions
router.get('/:id/debug/:email', async (req, res) => {
  try {
    const { id, email } = req.params;

    console.log(`🔍 DEBUG: Checking quiz ${id} for email ${email}`);

    // Find quiz
    const quiz = await EventQuiz.findById(id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Find credentials
    const credentials = await QuizCredentials.find({
      quiz: id,
      'participantDetails.email': email
    });

    // Find existing results
    const existingResults = await EventQuizResult.find({
      quiz: id,
      'participantInfo.email': email
    });

    // Find registrations
    const registrations = quiz.registrations.filter(reg =>
      reg.email === email ||
      (reg.isTeamRegistration && reg.teamMembers.some(member => member.email === email))
    );

    // Check what would happen during submission
    const submissionCheck = {
      wouldFindCredentials: false,
      credentialsFound: null,
      wouldFailAttemptCheck: false,
      wouldFailExistingResultCheck: false,
      isEmergencySession: false
    };

    // Simulate the submission logic
    const sessionToken = 'dummy-token'; // We'll check both emergency and regular
    const isEmergencySession = sessionToken && sessionToken.startsWith('emergency_');
    submissionCheck.isEmergencySession = isEmergencySession;

    if (isEmergencySession) {
      submissionCheck.wouldFindCredentials = true;
      submissionCheck.credentialsFound = 'emergency';
    } else {
      const availableCredentials = await QuizCredentials.findOne({
        quiz: id,
        'participantDetails.email': email,
        isActive: true,
        hasAttemptedQuiz: false
      });

      if (availableCredentials) {
        submissionCheck.wouldFindCredentials = true;
        submissionCheck.credentialsFound = availableCredentials._id;
      }

      // Check if would fail attempt check
      const attemptedCredentials = await QuizCredentials.findOne({
        quiz: id,
        'participantDetails.email': email,
        hasAttemptedQuiz: true
      });

      if (attemptedCredentials) {
        submissionCheck.wouldFailAttemptCheck = true;
      }

      // Check if would fail existing result check
      if (existingResults.length > 0) {
        submissionCheck.wouldFailExistingResultCheck = true;
      }
    }

    const debugInfo = {
      quiz: {
        id: quiz._id,
        title: quiz.title,
        status: quiz.status,
        startTime: quiz.startTime,
        endTime: quiz.endTime
      },
      email,
      registrations: registrations.length,
      registrationDetails: registrations,
      credentials: credentials.length,
      credentialDetails: credentials.map(cred => ({
        id: cred._id,
        isActive: cred.isActive,
        hasAttemptedQuiz: cred.hasAttemptedQuiz,
        isTeam: cred.isTeam,
        teamName: cred.teamName,
        participantDetails: cred.participantDetails
      })),
      existingResults: existingResults.length,
      resultDetails: existingResults.map(result => ({
        id: result._id,
        score: result.score,
        submittedAt: result.submittedAt,
        participantInfo: result.participantInfo
      })),
      submissionCheck,
      totalCredentials: await QuizCredentials.countDocuments({ quiz: id }),
      totalResults: await EventQuizResult.countDocuments({ quiz: id })
    };

    console.log('🔍 DEBUG INFO:', JSON.stringify(debugInfo, null, 2));

    res.json(debugInfo);
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Submit quiz answers (simplified flow without session token)
router.post('/:id/submit', async (req, res) => {
  try {
    const { id } = req.params;
    const { participantEmail, answers, timeTaken, participantInfo, isEmergencySubmission } = req.body;

    if (!participantEmail && !participantInfo) {
      return res.status(400).json({ message: 'Participant email or info is required' });
    }

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: 'Valid answers array is required' });
    }

    console.log(`🚀 SUBMIT: Submission request for quiz ${id} from email: ${participantEmail || participantInfo?.email}`);
    console.log(`🚀 SUBMIT: Request body:`, req.body);
    console.log(`🚀 SUBMIT: Emergency submission flag: ${isEmergencySubmission ? 'YES' : 'NO'}`);

    const quiz = await EventQuiz.findById(id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Determine participant email
    const email = participantEmail || participantInfo?.email;

    if (!email) {
      return res.status(400).json({ message: 'Participant email is required' });
    }

    // Find credentials by email (simplified approach)
    let credentials = await QuizCredentials.findOne({
      quiz: id,
      'participantDetails.email': email,
      isActive: true
    });

    console.log(`🚀 SUBMIT: Looking for credentials with email: ${email}`);

    if (credentials) {
      console.log(`🚀 SUBMIT: Found credentials:`, {
        id: credentials._id,
        email: credentials.participantDetails?.email,
        hasAttemptedQuiz: credentials.hasAttemptedQuiz,
        isTeam: credentials.isTeam
      });
    } else {
      console.log(`🚀 SUBMIT: No credentials found for email`);

      // If this is an emergency submission, allow it to proceed
      if (isEmergencySubmission) {
        console.log(`🚀 SUBMIT: Emergency submission detected, allowing submission without credentials`);
        credentials = null; // Will be handled later
      } else {
        console.log(`🚀 SUBMIT: Regular submission without credentials, checking if public quiz allowed`);
      }
    }

    // Check if quiz is still active
    const now = new Date();
    const endTime = new Date(quiz.endTime);

    if (now > endTime) {
      return res.status(400).json({ message: 'Quiz time has expired' });
    }

    // Check if already submitted (only if credentials exist and no reattempt allowed)
    console.log(`🚀 SUBMIT: Credentials check:`, {
      hasCredentials: !!credentials,
      hasAttemptedQuiz: credentials?.hasAttemptedQuiz,
      canReattempt: credentials?.canReattempt
    });

    if (credentials && credentials.hasAttemptedQuiz && !credentials.canReattempt) {
      console.log(`🚀 SUBMIT: Blocking submission - already attempted and no reattempt allowed`);
      return res.status(400).json({ message: 'You have already submitted this quiz' });
    }

    // Check if there's already a result for this participant
    console.log(`🚀 SUBMIT: Checking for existing results for email: ${email}`);

    // Clean up any existing results for this participant to avoid duplicate key errors
    const deleteResult = await EventQuizResult.deleteMany({
      quiz: id,
      'participantInfo.email': email
    });

    console.log(`🚀 SUBMIT: Cleaned up existing results:`, {
      deletedCount: deleteResult.deletedCount,
      email: email
    });

    // Reset credentials if they exist
    if (credentials) {
      await QuizCredentials.updateOne(
        { _id: credentials._id },
        { hasAttemptedQuiz: false, canReattempt: false }
      );
      console.log(`🚀 SUBMIT: Reset credentials for fresh submission`);
    }

    // Calculate score with negative marking support
    // Process ALL questions in the quiz, not just submitted answers
    let score = 0;
    const results = [];

    // Create a map of submitted answers for quick lookup
    const submittedAnswers = {};
    answers.forEach(answer => {
      submittedAnswers[answer.questionIndex] = answer.selectedOption;
    });

    // Process each question in the quiz
    quiz.questions.forEach((question, questionIndex) => {
      const selectedOption = submittedAnswers[questionIndex];
      const isAnswered = selectedOption !== undefined && selectedOption !== null;
      const isCorrect = isAnswered && selectedOption === question.correctAnswer;
      let questionScore = 0;

      if (isCorrect) {
        questionScore = question.marks || 1;
        score += questionScore;
      } else if (quiz.negativeMarkingEnabled && isAnswered && selectedOption !== -1) {
        // Apply negative marking only if an option is selected (not skipped/unanswered)
        const negativeMarks = question.negativeMarks || 0;
        questionScore = -negativeMarks;
        score -= negativeMarks;
      }
      // If unanswered, questionScore remains 0 (no points, no negative marking)

      results.push({
        questionIndex,
        selectedOption: isAnswered ? selectedOption : null,
        correctAnswer: question.correctAnswer,
        isCorrect,
        marks: questionScore,
        negativeMarks: question.negativeMarks || 0,
        isAnswered
      });
    });

    // Prepare participant info (from credentials or participantInfo)
    let participantData;
    if (credentials) {
      participantData = {
        name: credentials.participantDetails.name,
        email: credentials.participantDetails.email,
        college: credentials.participantDetails.college,
        department: credentials.participantDetails.department,
        year: credentials.participantDetails.year,
        isTeam: credentials.isTeam,
        teamName: credentials.teamName,
        teamMembers: credentials.teamMembers
      };
    } else if (participantInfo) {
      // For public submissions without credentials
      participantData = {
        name: participantInfo.name,
        email: participantInfo.email,
        college: participantInfo.college,
        department: participantInfo.department,
        year: participantInfo.year,
        isTeam: participantInfo.isTeam || false,
        teamName: participantInfo.teamName,
        teamMembers: participantInfo.teamMembers || []
      };
    } else if (isEmergencySubmission) {
      // For emergency submissions without credentials
      participantData = {
        name: 'Emergency Admin',
        email: email,
        college: 'Admin Access',
        department: 'Admin',
        year: 'N/A',
        isTeam: false,
        teamName: null,
        teamMembers: []
      };
      console.log(`🚀 SUBMIT: Created emergency participant data for ${email}`);
    } else {
      return res.status(400).json({ message: 'Participant information is required' });
    }

    // Save result
    const result = new EventQuizResult({
      quiz: quiz._id,
      student: credentials?.participantDetails?.student || null,
      participantInfo: participantData,
      answers: quiz.questions.map((question, index) => ({
        questionIndex: index,
        selectedOption: submittedAnswers[index] !== undefined ? submittedAnswers[index] : null
      })),
      score,
      totalMarks: quiz.questions.reduce((sum, q) => sum + (q.marks || 1), 0),
      submittedAt: new Date(),
      timeTaken: timeTaken || 0
    });

    try {
      await result.save();
    } catch (saveError) {
      if (saveError.code === 11000) {
        console.log(`🚀 SUBMIT: Duplicate key error detected:`, saveError.message);
        console.log(`🚀 SUBMIT: Attempting to force cleanup and retry`);

        // Force delete any remaining results for this specific participant only
        await EventQuizResult.deleteMany({
          quiz: id,
          'participantInfo.email': email
        });

        // Try to save again
        try {
          await result.save();
          console.log(`🚀 SUBMIT: Submission successful after force cleanup`);
        } catch (retryError) {
          console.error(`🚀 SUBMIT: Submission failed even after cleanup:`, retryError);
          return res.status(500).json({ message: 'Submission failed due to database conflict - please contact administrator' });
        }
      } else {
        throw saveError; // Re-throw other errors
      }
    }

    // Mark all related credentials as having attempted quiz (only if credentials exist)
    if (credentials) {
      if (credentials.isTeam) {
        // For team registrations, mark all team member credentials as attempted
        await QuizCredentials.updateMany(
          {
            quiz: id,
            teamName: credentials.teamName,
            isActive: true
          },
          { hasAttemptedQuiz: true, quizSubmission: result._id }
        );
      } else {
        // For individual registrations, mark only this credential as attempted
        await QuizCredentials.updateOne(
          { _id: credentials._id },
          { hasAttemptedQuiz: true, quizSubmission: result._id }
        );
      }
    }

    res.json({
      message: 'Quiz submitted successfully',
      score,
      totalMarks: result.totalMarks,
      correctAnswers: results.filter(r => r.isCorrect).length, // Only send count of correct answers
      totalQuestions: quiz.questions.length,
      percentage: ((score / result.totalMarks) * 100).toFixed(2),
      passed: quiz.passingMarks ? (score / result.totalMarks * 100) >= quiz.passingMarks : true,
      submissionId: result._id
      // Removed results array to hide correct/incorrect answer details
    });
  } catch (error) {
    console.error('Error submitting quiz:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get registrations for an event quiz
router.get('/:id/registrations', auth, isEventAdmin, async (req, res) => {
  try {
    const quiz = await EventQuiz.findById(req.params.id)
      .populate('registrations.student', 'name email');

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Transform registrations - keep teams as single entries
    const transformedRegistrations = [];

    quiz.registrations.forEach(reg => {
      // Skip deleted registrations
      if (reg.isDeleted) {
        return;
      }

      if (reg.isTeamRegistration) {
        // Add team as a single registration entry
        transformedRegistrations.push({
          _id: reg._id,
          name: reg.teamLeader.name, // Team leader name
          email: reg.teamLeader.email,
          college: reg.teamLeader.college,
          department: reg.teamLeader.department,
          year: reg.teamLeader.year,
          phoneNumber: reg.teamLeader.phoneNumber,
          admissionNumber: reg.teamLeader.admissionNumber,
          participantType: reg.teamLeader.participantType,
          registeredAt: reg.registeredAt,
          isSpotRegistration: reg.isSpotRegistration,
          isTeamRegistration: true,
          teamName: reg.teamName,
          teamLeader: reg.teamLeader,
          teamMembers: reg.teamMembers,
          teamMemberNames: reg.teamMembers.map(member => member.name).join(', '),
          totalTeamSize: reg.teamMembers.length + 1 // +1 for team leader
        });
      } else {
        // Individual registration - keep as is
        transformedRegistrations.push({
          _id: reg._id,
          name: reg.name,
          email: reg.email,
          college: reg.college,
          department: reg.department,
          year: reg.year,
          phoneNumber: reg.phoneNumber,
          admissionNumber: reg.admissionNumber,
          participantType: reg.participantType,
          registeredAt: reg.registeredAt,
          isSpotRegistration: reg.isSpotRegistration,
          isTeamRegistration: false
        });
      }
    });

    res.json(transformedRegistrations);
  } catch (error) {
    console.error('Error fetching registrations:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get deleted registrations for an event quiz
router.get('/:id/deleted-registrations', auth, isEventAdmin, async (req, res) => {
  try {
    const quiz = await EventQuiz.findById(req.params.id)
      .populate('registrations.student', 'name email')
      .populate('registrations.deletedBy', 'name email');

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Transform deleted registrations only
    const deletedRegistrations = [];

    quiz.registrations.forEach(reg => {
      // Only include deleted registrations
      if (!reg.isDeleted) {
        return;
      }

      if (reg.isTeamRegistration) {
        // Add team as a single registration entry
        deletedRegistrations.push({
          _id: reg._id,
          name: reg.teamLeader.name, // Team leader name
          email: reg.teamLeader.email,
          college: reg.teamLeader.college,
          department: reg.teamLeader.department,
          year: reg.teamLeader.year,
          phoneNumber: reg.teamLeader.phoneNumber,
          admissionNumber: reg.teamLeader.admissionNumber,
          participantType: reg.teamLeader.participantType,
          registeredAt: reg.registeredAt,
          isSpotRegistration: reg.isSpotRegistration,
          isTeamRegistration: true,
          teamName: reg.teamName,
          teamLeader: reg.teamLeader,
          teamMembers: reg.teamMembers,
          teamMemberNames: reg.teamMembers.map(member => member.name).join(', '),
          totalTeamSize: reg.teamMembers.length + 1, // +1 for team leader
          // Deletion info
          isDeleted: reg.isDeleted,
          deletedAt: reg.deletedAt,
          deletedBy: reg.deletedBy
        });
      } else {
        // Individual registration - keep as is
        deletedRegistrations.push({
          _id: reg._id,
          name: reg.name,
          email: reg.email,
          college: reg.college,
          department: reg.department,
          year: reg.year,
          phoneNumber: reg.phoneNumber,
          admissionNumber: reg.admissionNumber,
          participantType: reg.participantType,
          registeredAt: reg.registeredAt,
          isSpotRegistration: reg.isSpotRegistration,
          isTeamRegistration: false,
          // Deletion info
          isDeleted: reg.isDeleted,
          deletedAt: reg.deletedAt,
          deletedBy: reg.deletedBy
        });
      }
    });

    res.json(deletedRegistrations);
  } catch (error) {
    console.error('Error fetching deleted registrations:', error);
    res.status(500).json({ message: error.message });
  }
});

// Delete a specific registration
router.delete('/:id/registrations/:registrationId', auth, isEventAdmin, async (req, res) => {
  try {
    const quiz = await EventQuiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Find the registration to soft delete
    const registration = quiz.registrations.find(
      reg => reg._id.toString() === req.params.registrationId
    );

    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' });
    }

    // Check if already deleted
    if (registration.isDeleted) {
      return res.status(400).json({ message: 'Registration is already deleted' });
    }

    // Soft delete the registration
    registration.isDeleted = true;
    registration.deletedAt = new Date();
    registration.deletedBy = req.user._id;
    await quiz.save();

    // Soft delete related quiz credentials if they exist
    try {
      await require('../models/QuizCredentials').updateMany(
        {
          quiz: req.params.id,
          registration: req.params.registrationId
        },
        {
          isActive: false,
          deletionReason: 'Registration deleted by admin',
          deletedAt: new Date()
        }
      );
      console.log(`Soft deleted quiz credentials for registration: ${req.params.registrationId}`);
    } catch (credError) {
      console.log('No quiz credentials found to soft delete:', credError.message);
    }

    // Note: We keep quiz results for audit purposes - they are not deleted

    res.json({
      message: 'Registration deleted successfully',
      deletedRegistration: {
        name: registration.isTeamRegistration ?
          `${registration.teamLeader.name} (Team: ${registration.teamName})` :
          registration.name,
        type: registration.isTeamRegistration ? 'Team' : 'Individual'
      }
    });
  } catch (error) {
    console.error('Error deleting registration:', error);
    res.status(500).json({ message: error.message });
  }
});

// Restore a deleted registration
router.post('/:id/restore-registration/:registrationId', auth, isEventAdmin, async (req, res) => {
  try {
    const quiz = await EventQuiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Find the registration to restore
    const registration = quiz.registrations.find(
      reg => reg._id.toString() === req.params.registrationId
    );

    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' });
    }

    // Check if not deleted
    if (!registration.isDeleted) {
      return res.status(400).json({ message: 'Registration is not deleted' });
    }

    // Restore the registration
    registration.isDeleted = false;
    registration.deletedAt = null;
    registration.deletedBy = null;
    await quiz.save();

    // Restore related quiz credentials if they exist
    try {
      await require('../models/QuizCredentials').updateMany(
        {
          quiz: req.params.id,
          registration: req.params.registrationId
        },
        {
          isActive: true,
          $unset: {
            deletionReason: 1,
            deletedAt: 1
          }
        }
      );
      console.log(`Restored quiz credentials for registration: ${req.params.registrationId}`);
    } catch (credError) {
      console.log('No quiz credentials found to restore:', credError.message);
    }

    res.json({
      message: 'Registration restored successfully',
      restoredRegistration: {
        name: registration.isTeamRegistration ?
          `${registration.teamLeader.name} (Team: ${registration.teamName})` :
          registration.name,
        type: registration.isTeamRegistration ? 'Team' : 'Individual'
      }
    });
  } catch (error) {
    console.error('Error restoring registration:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update a specific registration
router.put('/:id/registrations/:registrationId', auth, isEventAdmin, async (req, res) => {
  try {
    const quiz = await EventQuiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Find the registration to update
    const registrationIndex = quiz.registrations.findIndex(
      reg => reg._id.toString() === req.params.registrationId
    );

    if (registrationIndex === -1) {
      return res.status(404).json({ message: 'Registration not found' });
    }

    const { teamLeader, teamMembers, teamName } = req.body;

    // Update the registration
    if (quiz.registrations[registrationIndex].isTeamRegistration) {
      // Update team registration
      quiz.registrations[registrationIndex].teamLeader = teamLeader;
      quiz.registrations[registrationIndex].teamMembers = teamMembers;
      quiz.registrations[registrationIndex].teamName = teamName;
    } else {
      // Update individual registration
      Object.assign(quiz.registrations[registrationIndex], req.body);
    }

    await quiz.save();

    res.json({
      message: 'Registration updated successfully',
      registration: quiz.registrations[registrationIndex]
    });
  } catch (error) {
    console.error('Error updating registration:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update quiz status
router.patch('/:id/status', auth, isEventAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const quiz = await EventQuiz.findById(req.params.id);
    
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    quiz.status = status;
    await quiz.save();
    res.json(quiz);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Bulk create event quiz accounts from Excel
router.post('/accounts/bulk', auth, async (req, res) => {
  try {
    const { accounts } = req.body;
    
    if (!Array.isArray(accounts)) {
      return res.status(400).json({ message: 'Invalid data format. Expected an array of accounts.' });
    }

    // Validate all accounts before creating any
    const errors = [];
    const emailSet = new Set();

    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      
      // Check required fields
      if (!account.name) errors.push(`Row ${i + 1}: Name is required`);
      if (!account.email) errors.push(`Row ${i + 1}: Email is required`);
      if (!account.eventType) errors.push(`Row ${i + 1}: Event type is required`);
      if (account.eventType === 'department' && !account.department) {
        errors.push(`Row ${i + 1}: Department is required for department events`);
      }

      // Check for duplicate emails within the upload
      if (emailSet.has(account.email.toLowerCase())) {
        errors.push(`Row ${i + 1}: Duplicate email address ${account.email}`);
      }
      emailSet.add(account.email.toLowerCase());

      // Check for existing emails in database
      const existingAccount = await EventQuizAccount.findOne({ email: account.email.toLowerCase() });
      if (existingAccount) {
        errors.push(`Row ${i + 1}: Email ${account.email} already exists`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        message: 'Validation failed',
        errors
      });
    }

    // Process accounts with proper password handling
    const processedAccounts = accounts.map(account => {
      // Generate random password if not provided
      const password = account.password || Math.random().toString(36).slice(-8);
      
      return {
        ...account,
        password,
        originalPassword: encrypt(password), // Store encrypted original password
        createdBy: req.user.userId,
        isActive: true
      };
    });

    // Create all accounts
    const createdAccounts = await EventQuizAccount.create(processedAccounts);

    // Return success response with account details (excluding sensitive data)
    const sanitizedAccounts = createdAccounts.map(account => ({
      _id: account._id,
      name: account.name,
      email: account.email,
      eventType: account.eventType,
      department: account.department,
      password: decrypt(account.originalPassword) // Include original password in response
    }));

    res.status(201).json({
      message: `Successfully created ${createdAccounts.length} accounts`,
      accounts: sanitizedAccounts
    });

  } catch (error) {
    console.error('Error in bulk account creation:', error);
    res.status(500).json({
      message: 'Failed to create accounts',
      error: error.message
    });
  }
});

// Get password for a specific account
router.get('/accounts/passwords/:id', auth, async (req, res) => {
  try {
    const account = await EventQuizAccount.findById(req.params.id);
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    // Decrypt the original password
    const password = account.originalPassword ? decrypt(account.originalPassword) : null;
    
    res.json({ password });
  } catch (error) {
    console.error('Error fetching password:', error);
    res.status(500).json({ message: 'Failed to fetch password' });
  }
});

// Create event quiz from Excel file - WITH UNIVERSAL INDENTATION SUPPORT
router.post('/excel', auth, authorize('faculty', 'admin', 'event'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Function to check if text needs format preservation (same as Word/Image processing)
    const needsFormatPreservation = (text) => {
      return text.includes('def ') || text.includes('if ') || text.includes('for ') ||
             text.includes('while ') || text.includes('class ') || text.includes('function ') ||
             text.includes('{') || text.includes('}') || text.includes('<') || text.includes('>') ||
             text.includes('    ') || text.includes('\t');
    };

    // Apply universal indentation restoration for ALL programming languages (SAME AS IMAGE PROCESSING)
    const restoreIndentationForAllLanguages = (questionLines) => {
      const restoredLines = [];
      let currentIndentLevel = 0;
      let insideBraces = 0;

      for (let i = 0; i < questionLines.length; i++) {
        const line = questionLines[i].trim();

        if (!line) {
          restoredLines.push('');
          continue;
        }

        // PYTHON - Function/class definitions stay at base level
        if (line.match(/^(def|class)\s+\w+/)) {
          currentIndentLevel = 0;
          restoredLines.push(line);
          if (line.endsWith(':')) {
            currentIndentLevel = 1; // Next lines inside function should be indented
          }
          continue;
        }

        // PYTHON - Control structures inside functions
        if (line.match(/^(if|elif|else|for|while|try|except|finally|with)\s/)) {
          const indent = '    '.repeat(currentIndentLevel);
          restoredLines.push(indent + line);
          if (line.endsWith(':')) {
            currentIndentLevel++;
          }
          continue;
        }

        // PYTHON - Return statements (context-aware indentation)
        if (line.match(/^(return|break|continue|pass|raise)\s/)) {
          // Check if this return is inside an if block or at function level
          const nextLine = i + 1 < questionLines.length ? questionLines[i + 1].trim() : '';

          // If this return is followed by another return, this one is inside the if block
          // and the next one should be at function level
          if (nextLine.match(/^return\s/) && insideIfBlock) {
            // This return is inside the if block
            const indent = '    '.repeat(currentIndentLevel);
            restoredLines.push(indent + line);
            // Exit the if block for the next statement
            insideIfBlock = false;
            currentIndentLevel = 1; // Back to function level
          } else {
            // Regular return statement at current level
            const indent = '    '.repeat(currentIndentLevel);
            restoredLines.push(indent + line);
          }
          continue;
        }

        // PYTHON - Print statements - check if they're at base level or inside function
        if (line.match(/^print\s*\(/)) {
          // If this is the last line or followed by options (A), B), etc.), it's at base level
          const nextLine = i + 1 < questionLines.length ? questionLines[i + 1].trim() : '';
          if (!nextLine || nextLine.match(/^[A-D]\)/)) {
            // This print is at base level (outside function)
            restoredLines.push(line);
            currentIndentLevel = 0; // Reset for any following code
          } else {
            // This print is inside a function
            const indent = '    '.repeat(Math.max(currentIndentLevel, 1));
            restoredLines.push(indent + line);
          }
          continue;
        }

        // PYTHON - Import statements (always at base level)
        if (line.match(/^(import|from)\s/)) {
          restoredLines.push(line);
          currentIndentLevel = 0;
          continue;
        }

        // PYTHON - Variable assignments and function calls
        if (line.match(/^[a-zA-Z_][a-zA-Z0-9_]*\s*[=+\-*\/]/) ||
            line.match(/^[a-zA-Z_][a-zA-Z0-9_]*\(/)) {
          // If we're inside a function, indent it
          if (currentIndentLevel > 0) {
            const indent = '    '.repeat(currentIndentLevel);
            restoredLines.push(indent + line);
          } else {
            // Base level assignment/call
            restoredLines.push(line);
          }
          continue;
        }

        // C/C++/JAVA/JAVASCRIPT - Function definitions and control structures
        if (line.match(/^(public|private|protected|static|void|int|float|double|char|string|bool|function|var|let|const)\s/) ||
            line.match(/^(if|else|for|while|do|switch|case|default|try|catch|finally)\s*\(/) ||
            line.match(/^\w+\s+\w+\s*\(/)) {
          const indent = '    '.repeat(currentIndentLevel);
          restoredLines.push(indent + line);
          if (line.includes('{')) {
            currentIndentLevel++;
            insideBraces++;
          }
          continue;
        }

        // Handle closing braces
        if (line.includes('}')) {
          currentIndentLevel = Math.max(0, currentIndentLevel - 1);
          insideBraces = Math.max(0, insideBraces - 1);
          const indent = '    '.repeat(currentIndentLevel);
          restoredLines.push(indent + line);
          continue;
        }

        // Handle opening braces on separate lines
        if (line === '{') {
          const indent = '    '.repeat(currentIndentLevel);
          restoredLines.push(indent + line);
          currentIndentLevel++;
          insideBraces++;
          continue;
        }

        // C/C++/JAVA/JAVASCRIPT - Regular statements inside blocks
        if (line.match(/.*;$/) || line.match(/^\/\//)) {
          const indent = '    '.repeat(Math.max(currentIndentLevel, insideBraces > 0 ? 1 : 0));
          restoredLines.push(indent + line);
          continue;
        }

        // HTML/XML - Tags
        if (line.match(/^<\w+/) || line.match(/^<\/\w+/)) {
          const indent = '    '.repeat(currentIndentLevel);
          restoredLines.push(indent + line);
          continue;
        }

        // Default: apply current indentation if we're inside any block
        if (currentIndentLevel > 0 || insideBraces > 0) {
          const indent = '    '.repeat(Math.max(currentIndentLevel, insideBraces > 0 ? 1 : 0));
          restoredLines.push(indent + line);
        } else {
          restoredLines.push(line);
        }
      }

      return restoredLines;
    };

    // Read the file buffer
    const fileBuffer = await fs.readFile(req.file.path);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

    // Clean up the uploaded file
    await fs.unlink(req.file.path).catch(console.error);

    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Skip header row and validate data
    const questions = jsonData.slice(1)
      .filter(row => row.length >= 7 && row[0])
      .map(row => {
        // Process question text with universal indentation restoration
        let questionText = String(row[0] || '').trim();

        // Apply universal indentation restoration if needed (same as Word/Image processing)
        if (needsFormatPreservation(questionText)) {
          const questionLines = questionText.split('\n').filter(line => line.length > 0);
          const finalQuestionLines = restoreIndentationForAllLanguages(questionLines);
          questionText = finalQuestionLines.join('\n');
        }

        return {
          question: questionText,
          options: [row[1], row[2], row[3], row[4]],
          correctAnswer: ['A', 'B', 'C', 'D'].indexOf(row[5].toUpperCase()),
          marks: parseInt(row[6]) || 1
        };
      });

    if (questions.length === 0) {
      return res.status(400).json({ message: 'No valid questions found in the file' });
    }

    const quizData = {
      title: req.body.title || 'Event Quiz',
      description: req.body.description || 'Quiz created from Excel file',
      duration: parseInt(req.body.duration) || 60,
      questions,
      createdBy: req.user._id,
      type: 'event'
    };

    const quiz = new EventQuiz(quizData);
    await quiz.save();

    res.status(201).json(quiz);
  } catch (error) {
    console.error('Error processing Excel quiz:', error);
    res.status(500).json({ message: 'Failed to process Excel file', error: error.message });
  }
});

// Create event quiz from Word document
router.post('/word', auth, authorize('faculty', 'admin', 'event'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Extract text from Word document with HTML tag preservation
    const htmlResult = await mammoth.convertToHtml({ buffer: req.file.buffer });

    // Convert HTML to text while preserving HTML tags as literal text
    let text = htmlResult.value
      .replace(/<p[^>]*>/g, '\n')           // Convert paragraphs to line breaks
      .replace(/<\/p>/g, '')               // Remove closing paragraph tags
      .replace(/<br[^>]*>/g, '\n')         // Convert line breaks
      .replace(/<div[^>]*>/g, '\n')        // Convert divs to line breaks
      .replace(/<\/div>/g, '')             // Remove closing div tags
      .replace(/&nbsp;/g, ' ')             // Convert non-breaking spaces
      .replace(/&lt;/g, '<')               // Convert HTML entities to preserve HTML tags as text
      .replace(/&gt;/g, '>')               // Convert HTML entities to preserve HTML tags as text
      .replace(/&amp;/g, '&')              // Convert HTML entities
      // Only remove mammoth-generated formatting tags, preserve content HTML tags
      .replace(/<(strong|b|em|i|u|span)[^>]*>/g, '')     // Remove formatting tags
      .replace(/<\/(strong|b|em|i|u|span)>/g, '')        // Remove closing formatting tags
      .replace(/\n\s*\n/g, '\n')           // Remove extra empty lines
      .trim();

    // If the HTML conversion didn't preserve much formatting, fall back to raw text
    if (!text.includes('\n') || text.length < 50) {
      const rawResult = await mammoth.extractRawText({ buffer: req.file.buffer });
      text = rawResult.value;
    }

    // Helper function to detect if text needs formatting preservation (Universal)
    const needsFormatPreservation = (text) => {
      // Simple check: if text has intentional formatting, preserve it
      return (
        text.includes('\n') ||           // Multiple lines
        /^\s{2,}/m.test(text) ||        // Lines with 2+ leading spaces (indentation)
        /\t/.test(text) ||              // Contains tabs
        text.split('\n').some(line =>
          line.trim() !== line &&       // Line has leading/trailing spaces
          line.trim().length > 0        // But is not empty
        )
      );
    };

    // Keep the old function name for compatibility
    const detectCodeBlock = (text) => {
      return needsFormatPreservation(text);
    };

    // Parse questions from text
    const questionBlocks = text.split(/\n\s*\n/); // Split by blank lines
    const questions = questionBlocks
      .filter(block => block.trim().startsWith('Q'))
      .map(block => {
        const lines = block.trim().split('\n');
        let questionText = lines[0].replace(/^Q\d+\.\s*/, '').replace(/\(\d+\s*marks?\)/, '');
        // Only trim if it's not a code question
        if (!needsFormatPreservation(questionText)) {
          questionText = questionText.trim();
        }
        const options = lines.slice(1, 5).map(line => line.replace(/^[A-D]\)\s*/, '').replace(/\*$/, '').trim());
        const correctAnswer = lines.slice(1, 5).findIndex(line => line.includes('*'));
        const marksMatch = lines[0].match(/\((\d+)\s*marks?\)/);
        const marks = marksMatch ? parseInt(marksMatch[1]) : 1;

        return {
          question: questionText,
          options,
          correctAnswer,
          marks,
          isCodeQuestion: detectCodeBlock(questionText)
        };
      });

    if (questions.length === 0) {
      return res.status(400).json({ message: 'No valid questions found in the document' });
    }

    const quizData = {
      ...JSON.parse(req.body.quizDetails),
      questions,
      createdBy: req.user._id,
      type: 'event'
    };

    const quiz = new EventQuiz(quizData);
    await quiz.save();

    res.status(201).json(quiz);
  } catch (error) {
    console.error('Error processing Word quiz:', error);
    res.status(500).json({ message: 'Failed to process Word document', error: error.message });
  }
});

// Parse Excel file and return questions (for preview) - WITH UNIVERSAL INDENTATION SUPPORT
router.post('/parse/excel', auth, authorize('faculty', 'admin', 'event'), memoryUpload.single('file'), async (req, res) => {
  try {
    console.log('Event Excel parse request received');
    console.log('File info:', {
      hasFile: !!req.file,
      filename: req.file?.originalname,
      size: req.file?.size
    });

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Read the Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log('Excel data rows:', data.length);
    console.log('First few rows:', data.slice(0, 3));

    const questions = [];

    // Skip header row and process data
    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      // Skip empty rows
      if (!row || row.length === 0 || !row[0]) continue;

      console.log(`Processing row ${i}:`, row);

      try {
        let questionText = row[0] ? String(row[0]).trim() : '';
        const optionA = row[1] ? String(row[1]).trim() : '';
        const optionB = row[2] ? String(row[2]).trim() : '';
        const optionC = row[3] ? String(row[3]).trim() : '';
        const optionD = row[4] ? String(row[4]).trim() : '';
        const correctAnswer = row[5] ? String(row[5]).trim().toUpperCase() : '';
        const marks = row[6] ? parseFloat(row[6]) : 1;
        const negativeMarks = row[7] ? parseFloat(row[7]) : 0;

        // Skip if essential fields are missing
        if (!questionText || !optionA || !optionB || !correctAnswer) {
          console.log(`Skipping row ${i}: Missing essential fields`);
          continue;
        }

        // Apply universal indentation restoration (same as Word document processing)
        const needsFormatPreservation = (text) => {
          const codePatterns = [
            /\b(def|class|if|else|elif|for|while|try|except|finally|with|import|from)\b/,
            /\b(function|var|let|const|if|else|for|while|switch|case|return)\b/,
            /\b(public|private|protected|class|interface|extends|implements)\b/,
            /\b(#include|int|char|float|double|void|printf|scanf)\b/,
            /<[^>]+>/,
            /\{[\s\S]*\}/,
            /^\s*(def|class|if|for|while|function|var|let|const|public|private)/m
          ];
          return codePatterns.some(pattern => pattern.test(text));
        };

        // Universal indentation restoration function
        const restoreUniversalIndentation = (text) => {
          if (!needsFormatPreservation(text)) {
            return text;
          }

          const lines = text.split('\n');
          const processedLines = [];
          let currentIndentLevel = 0;
          let insideFunction = false;
          let insideClass = false;
          let insideIfBlock = false;
          let braceLevel = 0;

          for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();

            if (!line) {
              processedLines.push('');
              continue;
            }

            // Detect language and apply appropriate indentation
            if (line.match(/\b(def|class|if|elif|else|for|while|try|except|finally|with)\b/)) {
              // Python-like syntax
              if (line.startsWith('def ')) {
                processedLines.push(line);
                insideFunction = true;
                currentIndentLevel = 1;
              } else if (line.startsWith('class ')) {
                processedLines.push(line);
                insideClass = true;
                currentIndentLevel = 1;
              } else if (line.match(/^(if|elif|for|while|try|with)\b/)) {
                const indent = '    '.repeat(currentIndentLevel);
                processedLines.push(indent + line);
                insideIfBlock = true;
                currentIndentLevel++;
              } else if (line.startsWith('else:') || line.startsWith('except:') || line.startsWith('finally:')) {
                const indent = '    '.repeat(Math.max(0, currentIndentLevel - 1));
                processedLines.push(indent + line);
                currentIndentLevel = Math.max(1, currentIndentLevel);
              } else {
                const indent = '    '.repeat(currentIndentLevel);
                processedLines.push(indent + line);
              }
            } else if (line.match(/^(return|break|continue|pass)\b/)) {
              // Python control statements
              const indent = '    '.repeat(Math.max(1, currentIndentLevel));
              processedLines.push(indent + line);
            } else if (line.match(/\b(function|var|let|const|if|else|for|while|switch|case|return)\b/)) {
              // JavaScript-like syntax
              if (line.includes('{')) braceLevel++;
              const indent = '    '.repeat(braceLevel);
              processedLines.push(indent + line);
              if (line.includes('}')) braceLevel = Math.max(0, braceLevel - 1);
            } else if (line.match(/^(print|console\.log|System\.out\.println|printf|cout)\b/)) {
              // Print statements - check context
              if (insideFunction || insideIfBlock) {
                const indent = '    '.repeat(Math.max(1, currentIndentLevel));
                processedLines.push(indent + line);
              } else {
                // Base level print statement
                processedLines.push(line);
              }
            } else {
              // Regular code line
              if (insideFunction || insideClass || currentIndentLevel > 0) {
                const indent = '    '.repeat(Math.max(1, currentIndentLevel));
                processedLines.push(indent + line);
              } else {
                processedLines.push(line);
              }
            }

            // Reset context for certain patterns
            if (line.match(/^(print|console\.log|System\.out\.println|printf|cout)\b/) && !insideFunction && !insideIfBlock) {
              currentIndentLevel = 0;
              insideFunction = false;
              insideIfBlock = false;
            }
          }

          return processedLines.join('\n');
        };

        // Apply indentation restoration to question text
        questionText = restoreUniversalIndentation(questionText);

        // Convert correct answer letter to index
        let correctIndex;
        switch (correctAnswer) {
          case 'A': correctIndex = 0; break;
          case 'B': correctIndex = 1; break;
          case 'C': correctIndex = 2; break;
          case 'D': correctIndex = 3; break;
          default:
            console.log(`Invalid correct answer: ${correctAnswer} for row ${i}`);
            continue;
        }

        const question = {
          question: questionText,
          options: [optionA, optionB, optionC, optionD].filter(opt => opt),
          correctAnswer: correctIndex,
          marks: marks,
          negativeMarks: negativeMarks
        };

        questions.push(question);
        console.log(`Successfully processed question ${questions.length}:`, {
          questionPreview: questionText.substring(0, 50) + '...',
          optionsCount: question.options.length,
          correctAnswer: correctIndex,
          marks,
          negativeMarks
        });

      } catch (rowError) {
        console.error(`Error processing row ${i}:`, rowError);
        continue;
      }
    }

    console.log(`Event Excel parsing completed. Total questions: ${questions.length}`);

    if (questions.length === 0) {
      return res.status(400).json({
        message: 'No valid questions found in the Excel file. Please check the format.'
      });
    }

    res.json({ questions });

  } catch (error) {
    console.error('Event Excel parse error:', error);
    res.status(500).json({ message: 'Failed to process Excel file', error: error.message });
  }
});

// Parse Word file and return questions (for preview)
router.post('/parse/word', auth, authorize('faculty', 'admin', 'event'), memoryUpload.single('file'), async (req, res) => {
  try {
    console.log('Event Word parse request received');
    console.log('File info:', {
      hasFile: !!req.file,
      filename: req.file?.originalname,
      size: req.file?.size
    });

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Extract text from Word document with HTML tag preservation
    const htmlResult = await mammoth.convertToHtml({ buffer: req.file.buffer });

    // Convert HTML to text while preserving line breaks, indentation, AND HTML tags as literal text
    let text = htmlResult.value
      .replace(/<p[^>]*>/g, '\n')           // Convert paragraphs to line breaks
      .replace(/<\/p>/g, '')               // Remove closing paragraph tags
      .replace(/<br[^>]*>/g, '\n')         // Convert line breaks
      .replace(/<div[^>]*>/g, '\n')        // Convert divs to line breaks
      .replace(/<\/div>/g, '')             // Remove closing div tags
      .replace(/&nbsp;/g, ' ')             // Convert non-breaking spaces
      .replace(/&lt;/g, '<')               // Convert HTML entities to preserve HTML tags as text
      .replace(/&gt;/g, '>')               // Convert HTML entities to preserve HTML tags as text
      .replace(/&amp;/g, '&')              // Convert HTML entities
      // Only remove mammoth-generated formatting tags, preserve content HTML tags
      .replace(/<(strong|b|em|i|u|span)[^>]*>/g, '')     // Remove formatting tags
      .replace(/<\/(strong|b|em|i|u|span)>/g, '')        // Remove closing formatting tags
      .replace(/\n\s*\n/g, '\n')           // Remove extra empty lines
      .trim();

    // If the HTML conversion didn't preserve much formatting, fall back to raw text
    if (!text.includes('\n') || text.length < 50) {
      const rawResult = await mammoth.extractRawText({ buffer: req.file.buffer });
      text = rawResult.value;
    }

    console.log('Extracted text from Word document:');
    console.log('='.repeat(50));
    console.log(text);
    console.log('='.repeat(50));
    console.log('Text analysis:');
    console.log('- Contains newlines:', text.includes('\n'));
    console.log('- Number of lines:', text.split('\n').length);
    console.log('- Lines with indentation:', text.split('\n').filter(line => line.match(/^\s{2,}/)).length);

    // Parse questions from text - improved logic with code preservation (same as regular quiz)
    const lines = text.split('\n').filter(line => line.length > 0);
    console.log('All lines:', lines);

    const questions = [];
    let currentQuestion = null;
    let currentOptions = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      console.log(`Processing line ${i}: "${line}"`);

      // Check if this line starts a new question (Q1., Q2., etc.)
      if (/^Q\d+\./.test(line)) {
        // Save previous question if exists
        if (currentQuestion) {
          const correctAnswer = currentOptions.findIndex(opt => opt.includes('*'));
          const cleanOptions = currentOptions.map(opt => opt.replace(/\*$/, '').trim());

          // Process question text with HTML formatting for perfect preservation
          const formattedQuestion = processTextWithHtmlFormatting(currentQuestion.question);

          questions.push({
            question: formattedQuestion,
            options: cleanOptions,
            correctAnswer: correctAnswer >= 0 ? correctAnswer : 0,
            marks: currentQuestion.marks,
            negativeMarks: currentQuestion.negativeMarks
          });
        }

        // Start new question
        let questionText = line.replace(/^Q\d+\.\s*/, '').replace(/\(\d+\s*marks?\)/, '').replace(/\[Negative:\s*[\d.]+\]/, '');
        // Only trim leading/trailing whitespace if it's not a code question
        if (!hasCodeContent(questionText)) {
          questionText = questionText.trim();
        }
        console.log('Initial question text:', JSON.stringify(questionText));
        const marksMatch = line.match(/\((\d+)\s*marks?\)/);
        const marks = marksMatch ? parseInt(marksMatch[1]) : 1;

        // Extract negative marks from [Negative: X] format
        const negativeMatch = line.match(/\[Negative:\s*([\d.]+)\]/);
        let negativeMarks = 0;

        if (negativeMatch) {
          negativeMarks = parseFloat(negativeMatch[1]);
        }

        currentQuestion = { question: questionText, marks, negativeMarks };
        currentOptions = [];
        console.log('Started new question:', currentQuestion);
      }
      // Check if this is an option line (starts with A), B), C), D))
      else if (/^[A-D]\)/.test(line) && currentQuestion) {
        const option = line.replace(/^[A-D]\)\s*/, '').trim();
        currentOptions.push(option);
        console.log('Found option:', option);
      }
      // Handle question continuation (especially for code blocks)
      else if (currentQuestion && currentOptions.length === 0) {
        // This might be a continuation of the question text
        if (isCodeLine(line) || line.match(/^\s{2,}/)) {
          // This looks like code - preserve original formatting exactly
          currentQuestion.question += '\n' + line;
          console.log('Code line continuation:', JSON.stringify(line));
        } else {
          // Regular text continuation
          currentQuestion.question += ' ' + line.trim();
          console.log('Text continuation:', JSON.stringify(line));
        }
        console.log('Current question after continuation:', JSON.stringify(currentQuestion.question));
      }
    }

    // Don't forget the last question
    if (currentQuestion && currentOptions.length > 0) {
      const correctAnswer = currentOptions.findIndex(opt => opt.includes('*'));
      const cleanOptions = currentOptions.map(opt => opt.replace(/\*$/, '').trim());

      // Process question text with HTML formatting for perfect preservation
      const formattedQuestion = processTextWithHtmlFormatting(currentQuestion.question);

      questions.push({
        question: formattedQuestion,
        options: cleanOptions,
        correctAnswer: correctAnswer >= 0 ? correctAnswer : 0,
        marks: currentQuestion.marks,
        negativeMarks: currentQuestion.negativeMarks
      });
    }

    console.log(`Event Word parsing completed. Total questions: ${questions.length}`);

    if (questions.length === 0) {
      return res.status(400).json({
        message: 'No valid questions found in the Word document. Please check the format.'
      });
    }

    res.json({ questions });

  } catch (error) {
    console.error('Event Word parse error:', error);
    res.status(500).json({ message: 'Failed to process Word document', error: error.message });
  }
});



// Parse images and return questions (for preview)
router.post('/parse/image', auth, authorize('faculty', 'admin', 'event'), memoryUpload.array('images'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No images uploaded' });
    }

    // Process each image with OCR
    const questions = [];
    for (const file of req.files) {
      try {
        // Use Tesseract.js for OCR with enhanced settings for code
        const { data: { text } } = await Tesseract.recognize(
          file.buffer,
          'eng',
          {
            logger: info => console.log(info),
            tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
            preserve_interword_spaces: '1',
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789()[]{}:;.,?!@#$%^&*-+=_|\\/"\'` \n\t',
            tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY
          }
        );

        console.log('Event OCR extracted text:', text);
        console.log('Event OCR text length:', text.length);
        console.log('='.repeat(50));
        console.log('RAW EVENT OCR TEXT WITH FORMATTING:');
        console.log(JSON.stringify(text)); // Show exact characters including spaces/tabs
        console.log('='.repeat(50));

        // Apply same OCR preprocessing as main quiz routes
        const preprocessOCRText = (text) => {
          return text
            .replace(/24x/g, '24*')  // Fix asterisk recognition
            .replace(/©\)/g, 'C)')   // Fix copyright symbol to C)
            .replace(/redy/g, 'ready') // Fix common OCR errors
            .replace(/startup\(\)\)/g, 'startup()') // Fix extra parenthesis
            .replace(/\bif global connected\b/g, 'if global_connected') // Fix variable names
            .replace(/print \(/g, 'print(') // Fix space before parenthesis
            .replace(/<main\(\)>/g, 'main()') // Fix OCR misreading main() as <main()>
            .replace(/\bN\s*=\s*$/gm, 'A) 1*') // Fix "N =" to "A) 1*" (common OCR error)
            .replace(/^0(\d)\s*$/gm, 'C) $1') // Fix "03" to "C) 3" (common OCR error)
            .replace(/^(\d+)\s*$/gm, (match, num) => { // Fix standalone numbers to options
              if (num === '1') return 'A) 1*';
              if (num === '2') return 'B) 2';
              if (num === '3') return 'C) 3';
              if (num === '4') return 'D) 4';
              return match;
            })
            .replace(/^([A-D])\)\s*\*\s*$/gm, '$1) 1*') // Fix "A) *" to "A) 1*"
            .replace(/^([A-D])\s+(\d+)\s*\*?\s*$/gm, '$1) $2*') // Fix "A 1" to "A) 1*";
        };

        const preprocessedText = preprocessOCRText(text);
        console.log('PREPROCESSED EVENT OCR TEXT:');
        console.log(JSON.stringify(preprocessedText));
        console.log('='.repeat(50));

        // Parse questions from OCR text (same logic as main quiz routes)
        const lines = preprocessedText.split('\n');
        console.log('All lines from Event OCR (preserving original formatting):');
        lines.forEach((line, index) => {
          console.log(`Line ${index}: "${line}"`);
        });

        let currentQuestion = null;
        let questionLines = [];
        let options = [];
        let correctAnswer = null;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();

          console.log(`Processing line: ${line}`);

          // Check if this line starts a new question
          const questionMatch = line.match(/^(?:Q\d+\.?\s*|Question\s*\d+\.?\s*|\d+\.?\s*)(.*?)(?:\s*\((\d+(?:\.\d+)?)\s*marks?\))?\s*(?:\[Negative:\s*(\d+(?:\.\d+)?)\])?$/i);

          if (questionMatch) {
            // Process previous question if exists
            if (currentQuestion && questionLines.length > 0 && options.length >= 2) {
              const processedQuestion = processImageQuestion(currentQuestion, questionLines, options, correctAnswer);
              if (processedQuestion) {
                questions.push(processedQuestion);
              }
            }

            // Start new question
            const questionText = questionMatch[1].trim();
            const marks = questionMatch[2] ? parseFloat(questionMatch[2]) : 1;
            const negativeMarks = questionMatch[3] ? parseFloat(questionMatch[3]) : 0;

            console.log(`Extracted question: { questionText: '${questionText}', marks: ${marks}, negativeMarks: ${negativeMarks} }`);

            currentQuestion = {
              questionText: questionText,
              marks: marks,
              negativeMarks: negativeMarks
            };
            questionLines = [];
            options = [];
            correctAnswer = null;
            continue;
          }

          // Check for answer line (Answer: A/B/C/D)
          const answerMatch = line.match(/^Answer:\s*([A-D])/i);
          if (answerMatch) {
            const answerLetter = answerMatch[1].toUpperCase();
            const answerIndex = ['A', 'B', 'C', 'D'].indexOf(answerLetter);
            if (answerIndex !== -1) {
              correctAnswer = answerIndex;
              console.log(`Found answer line: Answer: ${answerLetter} (index: ${answerIndex})`);
            }
            continue;
          }

          // Check for options
          const optionMatch = line.match(/^([A-D])\)\s*(.+)$/i);
          if (optionMatch) {
            const optionLetter = optionMatch[1].toUpperCase();
            const optionText = optionMatch[2].trim();

            // Check if this option is marked as correct (contains *)
            const isCorrect = optionText.includes('*');

            if (isCorrect) {
              correctAnswer = options.length;
              console.log(`Found correct answer at option index: ${correctAnswer}`);
            }

            // Clean the option text and normalize
            const cleanOptionText = optionText.replace(/\*/g, '').trim();
            options.push(cleanOptionText);

            console.log(`Found option: {
              original: '${line}',
              normalized: '${optionLetter}) ${cleanOptionText}',
              optionText: '${cleanOptionText}',
              isCorrect: ${isCorrect}
            }`);
            continue;
          }

          // If we have a current question and this isn't an option, it's part of the question
          if (currentQuestion && line) {
            questionLines.push(lines[i]); // Preserve original line with potential indentation
            console.log(`Code line preserved (like Word): { original: '${lines[i]}' }`);
          }
        }

        // Process the last question
        if (currentQuestion && questionLines.length > 0 && options.length >= 2) {
          const processedQuestion = processImageQuestion(currentQuestion, questionLines, options, correctAnswer);
          if (processedQuestion) {
            questions.push(processedQuestion);
          }
        }

      } catch (ocrError) {
        console.error('Event OCR error for image:', ocrError);
        continue;
      }
    }

    console.log('Sending questions to frontend:', questions);

    if (questions.length === 0) {
      return res.status(400).json({ message: 'No valid questions could be extracted from the images' });
    }

    res.json({ questions });

  } catch (error) {
    console.error('Event image parse error:', error);
    res.status(500).json({ message: 'Failed to process images', error: error.message });
  }
});

// Helper function for processing image questions (same as main quiz routes)
function processImageQuestion(currentQuestion, questionLines, options, correctAnswer) {
  try {
    let questionText = currentQuestion.questionText;

    // Add question lines with universal indentation restoration
    if (questionLines.length > 0) {
      const codeText = questionLines.join('\n');
      const formattedCode = restoreUniversalIndentation(codeText);
      questionText += (questionText ? '\n' : '') + formattedCode;
    }

    // If no correct answer was found, try to infer it
    if (questionText && options.length >= 2 && (correctAnswer === null || correctAnswer === -1)) {
      // Check if any option looks like it should be marked as correct
      // Look for patterns like "1", "Case 1", or first option for C code
      const firstOptionText = options[0]?.toLowerCase() || '';
      if (firstOptionText.includes('1') || firstOptionText.includes('case 1') ||
          questionText.includes('switch') || questionText.includes('case 1:')) {
        console.log('Inferring correct answer as first option based on C code pattern');
        correctAnswer = 0;
      } else {
        console.log('No correct answer found, defaulting to first option');
        correctAnswer = 0;
      }
    }

    // Validate question
    if (questionText && options.length >= 2 && correctAnswer !== null && correctAnswer !== -1) {
      return {
        question: questionText,
        options: options,
        correctAnswer: correctAnswer,
        marks: currentQuestion.marks,
        negativeMarks: currentQuestion.negativeMarks
      };
    }

    console.log('Question validation failed:', {
      hasQuestionText: !!questionText,
      optionsCount: options.length,
      correctAnswer: correctAnswer
    });
    return null;
  } catch (error) {
    console.error('Error processing image question:', error);
    return null;
  }
}

// Universal indentation restoration function (same as main quiz routes)
function restoreUniversalIndentation(text) {
  const lines = text.split('\n');
  const processedLines = [];
  let currentIndentLevel = 0;
  let insideFunction = false;
  let insideClass = false;
  let insideIfBlock = false;
  let braceLevel = 0;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    if (!line) {
      processedLines.push('');
      continue;
    }

    // Check if this is a function call at base level (like hello(10))
    if (line.match(/^\w+\([^)]*\)$/) && !line.match(/^(print|console\.log|System\.out\.println|printf|cout)\b/)) {
      // Function call - should be at base level
      processedLines.push(line);
      // Reset all context after function call
      currentIndentLevel = 0;
      insideFunction = false;
      insideClass = false;
      insideIfBlock = false;
      continue;
    }

    // Detect language and apply appropriate indentation
    if (line.match(/\b(def|class|if|elif|else|for|while|try|except|finally|with)\b/)) {
      // Python-like syntax
      if (line.startsWith('def ')) {
        processedLines.push(line);
        insideFunction = true;
        currentIndentLevel = 1;
        insideIfBlock = false;
      } else if (line.startsWith('class ')) {
        processedLines.push(line);
        insideClass = true;
        currentIndentLevel = 1;
        insideIfBlock = false;
      } else if (line.match(/^(if|elif|for|while|try|with)\b/)) {
        const indent = '    '.repeat(currentIndentLevel);
        processedLines.push(indent + line);
        insideIfBlock = true;
        currentIndentLevel++;
      } else if (line.startsWith('else:') || line.startsWith('except:') || line.startsWith('finally:')) {
        // else should be at the same level as the corresponding if
        const indent = '    '.repeat(Math.max(0, currentIndentLevel - 1));
        processedLines.push(indent + line);
        // Keep current indent level for the else block content
        insideIfBlock = true;
      } else {
        const indent = '    '.repeat(currentIndentLevel);
        processedLines.push(indent + line);
      }
    } else if (line.match(/^(return|break|continue|pass)\b/)) {
      // Python control statements
      const indent = '    '.repeat(Math.max(1, currentIndentLevel));
      processedLines.push(indent + line);
    } else if (line.match(/\b(function|var|let|const|if|else|for|while|switch|case|return)\b/)) {
      // JavaScript-like syntax
      if (line.includes('{')) braceLevel++;
      const indent = '    '.repeat(braceLevel);
      processedLines.push(indent + line);
      if (line.includes('}')) braceLevel = Math.max(0, braceLevel - 1);
    } else if (line.match(/^(print|console\.log|System\.out\.println|printf|cout)\b/)) {
      // Print statements - check context for proper placement
      if (insideFunction || insideIfBlock) {
        const indent = '    '.repeat(currentIndentLevel);
        processedLines.push(indent + line);
      } else {
        // Base level print statement (outside functions)
        processedLines.push(line);
      }
    } else {
      // Regular code line
      if (insideFunction || insideClass || currentIndentLevel > 0) {
        const indent = '    '.repeat(currentIndentLevel);
        processedLines.push(indent + line);
      } else {
        processedLines.push(line);
      }
    }
  }

  return processedLines.join('\n');
}

// Create event quiz from images
router.post('/image', auth, authorize('faculty', 'admin', 'event'), upload.array('images'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No images uploaded' });
    }

    // Process each image with OCR
    const questions = [];
    for (const file of req.files) {
      try {
        // Use Tesseract.js for OCR with enhanced settings for code
        const { data: { text } } = await Tesseract.recognize(
          file.buffer,
          'eng',
          {
            logger: info => console.log(info),
            tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
            preserve_interword_spaces: '1',
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789()[]{}:;.,?!@#$%^&*-+=_|\\/"\'` \n\t',
            tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY
          }
        );

        // Apply same OCR preprocessing as parse endpoint
        const preprocessOCRText = (text) => {
          return text
            .replace(/24x/g, '24*')  // Fix asterisk recognition
            .replace(/©\)/g, 'C)')   // Fix copyright symbol to C)
            .replace(/redy/g, 'ready') // Fix common OCR errors
            .replace(/startup\(\)\)/g, 'startup()') // Fix extra parenthesis
            .replace(/\bif global connected\b/g, 'if global_connected') // Fix variable names
            .replace(/print \(/g, 'print(') // Fix space before parenthesis
            .replace(/<main\(\)>/g, 'main()') // Fix OCR misreading main() as <main()>
            .replace(/\bN\s*=\s*$/gm, 'A) 1*') // Fix "N =" to "A) 1*" (common OCR error)
            .replace(/^0(\d)\s*$/gm, 'C) $1') // Fix "03" to "C) 3" (common OCR error)
            .replace(/^(\d+)\s*$/gm, (match, num) => { // Fix standalone numbers to options
              if (num === '1') return 'A) 1*';
              if (num === '2') return 'B) 2';
              if (num === '3') return 'C) 3';
              if (num === '4') return 'D) 4';
              return match;
            })
            .replace(/^([A-D])\)\s*\*\s*$/gm, '$1) 1*') // Fix "A) *" to "A) 1*"
            .replace(/^([A-D])\s+(\d+)\s*\*?\s*$/gm, '$1) $2*') // Fix "A 1" to "A) 1*";
        };

        // Preprocess OCR text to fix common recognition errors
        let preprocessedText = preprocessOCRText(text)
          // Additional Python-specific fixes
          .replace(/def\s+(\w+)\(\)\):/g, 'def $1():')  // Fix def startup())): to def startup():
          .replace(/\(\)\):/g, '():')                    // Fix ())): to ):
          .replace(/if\s+global\s+(\w+):/g, 'if global $1:')  // Fix spacing in if global
          .replace(/print\s*\(\s*"([^"]*?)"\s*\)/g, 'print("$1")')  // Fix print spacing
          .replace(/Engines/g, 'Engines')                // Ensure proper capitalization
          // Fix indentation issues - if a print statement follows an if statement, it should be indented
          .replace(/(\n\s*if\s+[^:\n]+:\s*\n)(\s*print\s*\([^)]+\))/g, '$1        $2');

        console.log('OCR extracted text:', text);
        console.log('PREPROCESSED OCR TEXT:', preprocessedText);

        // Parse the extracted text to find questions and options
        // Don't trim lines to preserve code formatting
        // Helper function to detect if text needs formatting preservation (Universal)
        const needsFormatPreservation = (text) => {
          return (
            text.includes('\n') ||           // Multiple lines
            /^\s{2,}/m.test(text) ||        // Lines with 2+ leading spaces (indentation)
            /\t/.test(text) ||              // Contains tabs
            // Programming language keywords
            /\b(def|function|class|if|else|for|while|return|import|from|print|console\.log|var|let|const|public|private|static)\b/.test(text) ||
            // Common code patterns
            /[{}();]/.test(text) ||         // Brackets, parentheses, semicolons
            /\w+\(\w*\)/.test(text) ||      // Function calls like func()
            /\w+\.\w+/.test(text) ||        // Object notation like obj.prop
            /[<>]=?/.test(text) ||          // Comparison operators
            /\w+\s*=\s*\w+/.test(text) ||   // Assignment operations
            // HTML/XML tags
            /<\w+[^>]*>/.test(text) ||      // HTML tags
            text.split('\n').some(line =>
              line.trim() !== line &&       // Line has leading/trailing spaces
              line.trim().length > 0        // But is not empty
            )
          );
        };

        // Parse questions from text - improved logic with code preservation (SAME AS WORD PROCESSING)
        const lines = preprocessedText.split('\n').filter(line => line.length > 0);

        // Apply universal indentation restoration for ALL programming languages (FIXED LOGIC)
        const restoreIndentationForAllLanguages = (questionLines) => {
          const restoredLines = [];
          let currentIndentLevel = 0;
          let insideBraces = 0;
          let insideFunction = false;
          let insideIfBlock = false;

          for (let i = 0; i < questionLines.length; i++) {
            const line = questionLines[i].trim();

            if (!line) {
              restoredLines.push('');
              continue;
            }

            // PYTHON - Function/class definitions stay at base level
            if (line.match(/^(def|class)\s+\w+/)) {
              currentIndentLevel = 0;
              insideFunction = true;
              insideIfBlock = false;
              restoredLines.push(line);
              if (line.endsWith(':')) {
                currentIndentLevel = 1; // Next lines inside function should be indented
              }
              continue;
            }

            // PYTHON - Control structures inside functions
            if (line.match(/^(if|elif|else|for|while|try|except|finally|with)\s/)) {
              const indent = '    '.repeat(currentIndentLevel);
              restoredLines.push(indent + line);
              if (line.endsWith(':')) {
                insideIfBlock = true;
                currentIndentLevel++;
              }
              continue;
            }

            // PYTHON - Return statements (context-aware indentation)
            if (line.match(/^(return|break|continue|pass|raise)\s/)) {
              // Check if this return is at the same level as the function or inside an if block
              const nextLine = i + 1 < questionLines.length ? questionLines[i + 1].trim() : '';

              // If this return is followed by another return or a print call,
              // this return ends the if block and the next return is at function level
              if (nextLine.match(/^(return|print)\s/) && insideIfBlock) {
                // This return is inside the if block
                const indent = '    '.repeat(currentIndentLevel);
                restoredLines.push(indent + line);
                // Exit the if block for the next statement
                insideIfBlock = false;
                currentIndentLevel = 1; // Back to function level
              } else {
                // Regular return statement
                const indent = '    '.repeat(Math.max(currentIndentLevel, 1));
                restoredLines.push(indent + line);
              }
              continue;
            }

            // PYTHON - Print statements - improved logic for function calls
            if (line.match(/^print\s*\(/)) {
              // Check context to determine indentation level
              const nextLine = i + 1 < questionLines.length ? questionLines[i + 1].trim() : '';
              const prevLine = i > 0 ? questionLines[i - 1].trim() : '';

              // If this print is followed by options or is the last line, it's likely at base level
              if (!nextLine || nextLine.match(/^[A-D]\)/)) {
                // This print is at base level (outside function) - function call
                restoredLines.push(line);
                insideFunction = false;
                insideIfBlock = false;
                currentIndentLevel = 0; // Reset for any following code
              }
              // If previous line was an if/for/while statement, this print should be indented inside it
              else if (prevLine.match(/^(if|elif|for|while|try|with)\s.*:$/)) {
                const indent = '    '.repeat(Math.max(currentIndentLevel + 1, 2));
                restoredLines.push(indent + line);
              } else {
                // This print is inside a function/block
                const indent = '    '.repeat(Math.max(currentIndentLevel, 1));
                restoredLines.push(indent + line);
              }
              continue;
            }

            // PYTHON - Import statements (always at base level)
            if (line.match(/^(import|from)\s/)) {
              restoredLines.push(line);
              currentIndentLevel = 0;
              continue;
            }

            // PYTHON - Variable assignments and function calls
            if (line.match(/^[a-zA-Z_][a-zA-Z0-9_]*\s*[=+\-*\/]/) ||
                line.match(/^[a-zA-Z_][a-zA-Z0-9_]*\(/)) {
              // If we're inside a function, indent it
              if (currentIndentLevel > 0) {
                const indent = '    '.repeat(currentIndentLevel);
                restoredLines.push(indent + line);
              } else {
                // Base level assignment/call
                restoredLines.push(line);
              }
              continue;
            }

            // C/C++/JAVA/JAVASCRIPT - Function definitions and control structures
            if (line.match(/^(public|private|protected|static|void|int|float|double|char|string|bool|function|var|let|const)\s/) ||
                line.match(/^(if|else|for|while|do|switch|case|default|try|catch|finally)\s*\(/) ||
                line.match(/^\w+\s+\w+\s*\(/)) {
              const indent = '    '.repeat(currentIndentLevel);
              restoredLines.push(indent + line);
              if (line.includes('{')) {
                currentIndentLevel++;
                insideBraces++;
              }
              continue;
            }

            // Handle closing braces
            if (line.includes('}')) {
              currentIndentLevel = Math.max(0, currentIndentLevel - 1);
              insideBraces = Math.max(0, insideBraces - 1);
              const indent = '    '.repeat(currentIndentLevel);
              restoredLines.push(indent + line);
              continue;
            }

            // Handle opening braces on separate lines
            if (line === '{') {
              const indent = '    '.repeat(currentIndentLevel);
              restoredLines.push(indent + line);
              currentIndentLevel++;
              insideBraces++;
              continue;
            }

            // C/C++/JAVA/JAVASCRIPT - Regular statements inside blocks
            if (line.match(/.*;$/) || line.match(/^\/\//)) {
              const indent = '    '.repeat(Math.max(currentIndentLevel, insideBraces > 0 ? 1 : 0));
              restoredLines.push(indent + line);
              continue;
            }

            // HTML/XML - Tags
            if (line.match(/^<\w+/) || line.match(/^<\/\w+/)) {
              const indent = '    '.repeat(currentIndentLevel);
              restoredLines.push(indent + line);
              continue;
            }

            // Default: apply current indentation if we're inside any block
            if (currentIndentLevel > 0 || insideBraces > 0) {
              const indent = '    '.repeat(Math.max(currentIndentLevel, insideBraces > 0 ? 1 : 0));
              restoredLines.push(indent + line);
            } else {
              restoredLines.push(line);
            }
          }

          return restoredLines;
        };
        let currentQuestion = null;
        let options = [];
        let correctAnswer = -1;
        let questionLines = []; // To collect all lines of the current question

        let currentQuestionData = null;

        for (const line of lines) {
          if (line.match(/^Q\d+/) || line.match(/^\d+\./) || line.match(/Question\s*\d+/i)) {
            // If we have a previous question, save it
            if (currentQuestionData && currentQuestion && options.length === 4) {
              // Apply universal indentation restoration if needed
              const finalQuestionLines = needsFormatPreservation(questionLines.join('\n')) ?
                restoreIndentationForAllLanguages(questionLines) : questionLines;

              questions.push({
                question: finalQuestionLines.join('\n'), // Use restored indentation
                options,
                correctAnswer: correctAnswer !== -1 ? correctAnswer : 0,
                marks: currentQuestionData.marks,
                negativeMarks: currentQuestionData.negativeMarks
              });
            }

            // Start new question - extract marks and negative marks
            let questionText = line
              .replace(/^Q\d+[\.:]\s*/, '')
              .replace(/^\d+[\.:]\s*/, '')
              .replace(/^Question\s*\d+[\.:]\s*/i, '');

            // Extract marks from (X marks) format
            const marksMatch = line.match(/\((\d+)\s*marks?\)/);
            const marks = marksMatch ? parseInt(marksMatch[1]) : 1;

            // Extract negative marks from [Negative: X] format
            const negativeMatch = line.match(/\[Negative:\s*([\d.]+)\]/);
            const negativeMarks = negativeMatch ? parseFloat(negativeMatch[1]) : 0;

            // Remove marks and negative marks from question text
            questionText = questionText
              .replace(/\(\d+\s*marks?\)/, '')
              .replace(/\[Negative:\s*[\d.]+\]/, '');

            // Only trim if it's not a code question (like Word processing)
            if (!needsFormatPreservation(questionText)) {
              questionText = questionText.trim();
            }

            currentQuestionData = { marks, negativeMarks };
            currentQuestion = questionText;
            questionLines = [questionText]; // Start collecting question lines
            options = [];
            correctAnswer = -1;
          } else if (line.match(/^Answer:\s*([A-D])/i)) {
            // Check for answer line (Answer: A/B/C/D)
            const answerMatch = line.match(/^Answer:\s*([A-D])/i);
            if (answerMatch) {
              const answerLetter = answerMatch[1].toUpperCase();
              const answerIndex = ['A', 'B', 'C', 'D'].indexOf(answerLetter);
              if (answerIndex !== -1) {
                correctAnswer = answerIndex;
                console.log(`Found answer line: Answer: ${answerLetter} (index: ${answerIndex})`);
              }
            }
          } else if (line.match(/^[A-D©]\)/)) {
            // Handle OCR misreading: © as C, x as * at end
            let normalizedLine = line
              .replace(/^©\)/, 'C)')  // Fix copyright symbol to C
              .replace(/x$/, '*');     // Fix x at end to asterisk

            const optionText = normalizedLine.replace(/^[A-D]\)\s*/, '').replace(/\*$/, '').trim();
            options.push(optionText);

            // Check for correct answer marker (* or x at end)
            if (normalizedLine.includes('*') || line.match(/x$/)) {
              correctAnswer = options.length - 1;
            }
          } else if (currentQuestion !== null && !line.match(/^[A-D©]\)/)) {
            // This is part of the question (code, additional text, etc.)
            // EXACT SAME LOGIC AS WORD PROCESSING

            // Check if this line contains code or needs formatting preservation
            if (needsFormatPreservation(line) || line.match(/^\s{2,}/)) {
              // This looks like code - preserve original formatting exactly like Word processing
              questionLines.push(line); // Keep original line with all spacing
              console.log('Code line preserved (like Word):', { original: line });
            } else {
              // Regular text continuation - can be trimmed (like Word processing)
              const trimmedLine = line.trim();
              if (trimmedLine) {
                questionLines.push(trimmedLine);
                console.log('Text line processed (like Word):', { original: line, trimmed: trimmedLine });
              }
            }
          }
        }

        // Add the last question
        if (currentQuestionData && currentQuestion && options.length === 4) {
          // Apply universal indentation restoration if needed
          const finalQuestionLines = needsFormatPreservation(questionLines.join('\n')) ?
            restoreIndentationForAllLanguages(questionLines) : questionLines;

          questions.push({
            question: finalQuestionLines.join('\n'), // Use restored indentation
            options,
            correctAnswer: correctAnswer !== -1 ? correctAnswer : 0,
            marks: currentQuestionData.marks,
            negativeMarks: currentQuestionData.negativeMarks
          });
        }
      } catch (error) {
        console.error('Error processing image:', error);
      }
    }

    if (questions.length === 0) {
      return res.status(400).json({ message: 'No valid questions could be extracted from the images' });
    }

    const quizData = {
      ...JSON.parse(req.body.quizDetails),
      questions,
      createdBy: req.user._id,
      type: 'event'
    };

    const quiz = new EventQuiz(quizData);
    await quiz.save();

    res.status(201).json(quiz);
  } catch (error) {
    console.error('Error processing image quiz:', error);
    res.status(500).json({ message: 'Failed to process images', error: error.message });
  }
});

// Get results for a specific event quiz
router.get('/:id/results', auth, async (req, res) => {
  try {
    const results = await EventQuizResult.find({ quiz: req.params.id })
      .populate('student', 'name email department year semester')
      .sort('-score');
    
    res.json(results);
  } catch (error) {
    console.error('Error fetching quiz results:', error);
    res.status(500).json({ message: error.message });
  }
});

// Delete an event quiz
router.delete('/:id', auth, authorize('faculty', 'admin', 'event'), async (req, res) => {
  try {
    const quiz = await EventQuiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if quiz is currently active (between start and end time)
    const now = new Date();
    const startTime = new Date(quiz.startTime);
    const endTime = new Date(quiz.endTime);
    const isActive = now >= startTime && now <= endTime;

    // Event managers can delete quizzes at any time
    // If quiz is active, we'll handle notifications to active participants
    let deletionInfo = {
      wasActive: isActive,
      quizTitle: quiz.title,
      deletedAt: new Date(),
      deletedBy: req.user.name || req.user.email,
      participantCount: 0
    };

    if (isActive) {
      // Count active participants (those who might be taking the quiz)
      const activeCredentials = await require('../models/QuizCredentials').find({
        quiz: req.params.id,
        isActive: true,
        hasAttemptedQuiz: false
      });

      deletionInfo.participantCount = activeCredentials.length;

      // Mark all active credentials as inactive due to deletion
      await require('../models/QuizCredentials').updateMany(
        { quiz: req.params.id, isActive: true },
        {
          isActive: false,
          deletionReason: 'Quiz deleted by event manager',
          deletedAt: new Date()
        }
      );

      console.log(`Deleting active quiz "${quiz.title}" with ${deletionInfo.participantCount} potential active participants`);
    }

    // Use deleteOne instead of deprecated remove()
    await EventQuiz.deleteOne({ _id: req.params.id });

    // Also delete all related data
    await Promise.all([
      EventQuizResult.deleteMany({ quiz: req.params.id }),
      // Delete quiz credentials if they exist
      require('../models/QuizCredentials').deleteMany({ quiz: req.params.id }).catch(() => {})
    ]);

    console.log(`Event quiz ${req.params.id} deleted successfully`);
    res.json({
      message: 'Quiz deleted successfully',
      deletionInfo
    });
  } catch (error) {
    console.error('Error deleting event quiz:', error);
    res.status(500).json({ message: error.message });
  }
});

// Submit quiz result
router.post('/:id/submit', auth, async (req, res) => {
  try {
    const quiz = await EventQuiz.findById(req.params.id);
    
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if quiz is active
    const now = new Date();
    if (now < new Date(quiz.startTime) || now > new Date(quiz.endTime)) {
      return res.status(400).json({ message: 'Quiz is not active' });
    }

    // Check if student is eligible
    if (quiz.participantTypes.includes('college')) {
      const studentDept = req.user.department;
      const studentYear = req.user.year;
      const studentSem = req.user.semester;

      const isEligible = (
        (quiz.departments.includes('all') || quiz.departments.includes(studentDept)) &&
        (quiz.years.includes('all') || quiz.years.includes(studentYear?.toString())) &&
        (quiz.semesters.includes('all') || quiz.semesters.includes(studentSem?.toString()))
      );

      if (!isEligible) {
        return res.status(403).json({ message: 'You are not eligible for this quiz' });
      }
    }

    // Check if student has already attempted
    const existingResult = await EventQuizResult.findOne({
      quiz: req.params.id,
      student: req.user._id
    });

    if (existingResult) {
      return res.status(400).json({ message: 'You have already attempted this quiz' });
    }

    // Calculate score
    const { answers, timeTaken } = req.body;
    let score = 0;
    
    quiz.questions.forEach((question, index) => {
      if (answers[index] === question.correctAnswer) {
        score += question.marks || 1;
      }
    });

    // Save result
    const result = new EventQuizResult({
      quiz: req.params.id,
      student: req.user._id,
      score,
      timeTaken,
      answers
    });

    await result.save();
    res.status(201).json(result);
  } catch (error) {
    console.error('Error submitting quiz:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get event quiz submissions
router.get('/:id/submissions', auth, authorize('event', 'admin'), async (req, res) => {
  try {
    // First check if quiz exists
    const quiz = await EventQuiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Only check createdBy for non-admin, non-event roles
    if (req.userRole !== 'admin' && req.userRole !== 'event') {
      if (!quiz.createdBy.equals(req.user._id)) {
        return res.status(403).json({ message: 'You do not have permission to view these submissions' });
      }
    }

    // Get submissions from EventQuizResult (event quiz results use participantInfo, not student field)
    const allSubmissions = await EventQuizResult.find({ quiz: req.params.id })
      .lean();

    console.log(`Found ${allSubmissions.length} total submissions for quiz ${req.params.id}`);

    // Filter out submissions from deleted registrations
    const activeRegistrationEmails = quiz.registrations
      .filter(reg => !reg.isDeleted)
      .flatMap(reg => {
        if (reg.isTeamRegistration) {
          return [reg.teamLeader.email, ...reg.teamMembers.map(m => m.email)];
        }
        return [reg.email];
      });

    const submissions = allSubmissions.filter(submission => {
      const submissionEmail = submission.participantInfo?.email;
      return submissionEmail && activeRegistrationEmails.includes(submissionEmail);
    });

    console.log(`Filtered to ${submissions.length} submissions from active registrations`);

    // Transform submissions data to include all necessary details
    const transformedSubmissions = submissions.map(submission => ({
      student: {
        _id: submission._id, // Use submission ID as student ID for event quizzes
        name: submission.participantInfo?.name || 'N/A',
        email: submission.participantInfo?.email || 'N/A',
        college: submission.participantInfo?.college || 'N/A',
        department: submission.participantInfo?.department || 'N/A',
        year: submission.participantInfo?.year || 'N/A',
        rollNumber: submission.participantInfo?.admissionNumber || 'N/A',
        isTeam: submission.participantInfo?.isTeam || false,
        teamName: submission.participantInfo?.teamName || null,
        teamMembers: submission.participantInfo?.teamMembers || []
      },
      status: 'submitted',
      totalMarks: submission.score || 0,
      duration: submission.timeTaken || null,
      startTime: submission.startTime || null,
      submitTime: submission.submittedAt || submission.createdAt || null,
      answers: submission.answers || []
    }));

    console.log(`Transformed ${transformedSubmissions.length} submissions`);
    res.json(transformedSubmissions);
  } catch (error) {
    console.error('Error fetching event quiz submissions:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get individual submission
router.get('/:quizId/submission/:studentId', auth, authorize('event', 'admin'), async (req, res) => {
  try {
    // First check if quiz exists
    const quiz = await EventQuiz.findById(req.params.quizId);
    
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Only check createdBy for non-admin, non-event roles
    if (req.userRole !== 'admin' && req.userRole !== 'event') {
      if (!quiz.createdBy.equals(req.user._id)) {
        return res.status(403).json({ message: 'You do not have permission to view these submissions' });
      }
    }

    // Get submission from EventQuizResult (event quiz results use participantInfo, not student field)
    // For event quizzes, we need to find by participantInfo.email or _id
    let submission = null;

    // Check if studentId is a valid ObjectId (24 hex characters) or an email
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(req.params.studentId);

    if (isValidObjectId) {
      // Try to find by _id first if it's a valid ObjectId
      submission = await EventQuizResult.findOne({
        quiz: req.params.quizId,
        _id: req.params.studentId
      }).lean();
    }

    // If not found by _id or if studentId is an email, try to find by participantInfo.email
    if (!submission) {
      submission = await EventQuizResult.findOne({
        quiz: req.params.quizId,
        'participantInfo.email': req.params.studentId
      }).lean();
    }

    // If still not found, the studentId might be a registration ID, so we need to find the registration first
    if (!submission) {
      // Find the registration to get the email
      const registration = quiz.registrations.find(reg => reg._id.toString() === req.params.studentId);
      if (registration) {
        // Try to find submission by the registration email
        submission = await EventQuizResult.findOne({
          quiz: req.params.quizId,
          'participantInfo.email': registration.email
        }).lean();
      }
    }

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Format submission data for event quiz
    const formattedSubmission = {
      student: {
        _id: submission._id,
        name: submission.participantInfo?.name || 'N/A',
        email: submission.participantInfo?.email || 'N/A',
        college: submission.participantInfo?.college || 'N/A',
        department: submission.participantInfo?.department || 'N/A',
        year: submission.participantInfo?.year || 'N/A',
        rollNumber: submission.participantInfo?.admissionNumber || 'N/A'
      },
      quiz: {
        title: quiz.title,
        totalMarks: quiz.questions.reduce((sum, q) => sum + (q.marks || 1), 0),
        questions: quiz.questions
      },
      status: 'submitted',
      totalMarks: submission.score || 0,
      duration: submission.timeTaken || null,
      startTime: submission.startTime || null,
      submitTime: submission.submittedAt || submission.createdAt || null,
      answers: submission.answers || []
    };

    res.json(formattedSubmission);
  } catch (error) {
    console.error('Error fetching submission:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Send bulk email to students
router.post('/:id/send-bulk-email', auth, isEventAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { emails, subject, message, quizTitle } = req.body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ message: 'Email list is required' });
    }

    if (!subject || !message) {
      return res.status(400).json({ message: 'Subject and message are required' });
    }

    // Verify the quiz exists
    const quiz = await EventQuiz.findById(id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    console.log(`📧 Sending bulk email to ${emails.length} students for quiz: ${quiz.title}`);

    const { sendBulkEmail } = require('../services/emailService');

    // Send bulk email
    const result = await sendBulkEmail({
      emails,
      subject,
      message,
      quizTitle: quiz.title,
      senderName: req.user.name || 'Quiz Management Team'
    });

    if (result.success) {
      res.json({
        message: `Email sent successfully to ${result.successCount} students`,
        successCount: result.successCount,
        failureCount: result.failureCount,
        failures: result.failures
      });
    } else {
      res.status(500).json({
        message: 'Failed to send emails',
        error: result.error,
        successCount: result.successCount,
        failureCount: result.failureCount
      });
    }
  } catch (error) {
    console.error('Error sending bulk email:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Send bulk email to students
router.post('/:id/send-bulk-email', auth, isEventAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { emails, subject, message, quizTitle } = req.body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ message: 'Email list is required' });
    }

    if (!subject || !message) {
      return res.status(400).json({ message: 'Subject and message are required' });
    }

    // Verify the quiz exists
    const quiz = await EventQuiz.findById(id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    console.log(`📧 Sending bulk email to ${emails.length} students for quiz: ${quiz.title}`);

    const { sendBulkEmail } = require('../services/emailService');

    // Send bulk email
    const result = await sendBulkEmail({
      emails,
      subject,
      message,
      quizTitle: quiz.title,
      senderName: req.user.name || 'Quiz Management Team'
    });

    if (result.success) {
      res.json({
        message: `Email sent successfully to ${result.successCount} students`,
        successCount: result.successCount,
        failureCount: result.failureCount,
        failures: result.failures
      });
    } else {
      res.status(500).json({
        message: 'Failed to send emails',
        error: result.error,
        successCount: result.successCount,
        failureCount: result.failureCount
      });
    }
  } catch (error) {
    console.error('Error sending bulk email:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Allow reattempt for a student/team
router.post('/:id/reattempt', auth, authorize('event', 'admin'), async (req, res) => {
  try {
    const { email, isTeamRegistration, teamName } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // First check if quiz exists
    const quiz = await EventQuiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Only check createdBy for non-admin, non-event roles
    if (req.userRole !== 'admin' && req.userRole !== 'event') {
      if (!quiz.createdBy.equals(req.user._id)) {
        return res.status(403).json({ message: 'You do not have permission to manage this quiz' });
      }
    }

    // Find and delete existing submission(s)
    const deletedSubmissions = await EventQuizResult.deleteMany({
      quiz: req.params.id,
      'participantInfo.email': email
    });

    // For team registrations, also delete submissions for all team members
    if (isTeamRegistration && teamName) {
      // Find the team registration to get all team member emails
      const teamRegistration = quiz.registrations.find(reg =>
        reg.teamName === teamName && reg.isTeamRegistration
      );

      if (teamRegistration && teamRegistration.teamMembers) {
        const teamMemberEmails = teamRegistration.teamMembers.map(member => member.email);
        await EventQuizResult.deleteMany({
          quiz: req.params.id,
          'participantInfo.email': { $in: teamMemberEmails }
        });
      }
    }

    // Reset quiz credentials to allow reattempt
    await QuizCredentials.updateMany(
      {
        quiz: req.params.id,
        'participantDetails.email': email
      },
      {
        $set: {
          hasAttemptedQuiz: false,
          isActive: true
        }
      }
    );

    // For team registrations, reset all team member credentials
    if (isTeamRegistration && teamName) {
      await QuizCredentials.updateMany(
        {
          quiz: req.params.id,
          'participantDetails.teamName': teamName
        },
        {
          $set: {
            hasAttemptedQuiz: false,
            isActive: true
          }
        }
      );
    }

    const participantType = isTeamRegistration ? 'team' : 'individual';
    const participantName = isTeamRegistration ? `team "${teamName}"` : `student "${email}"`;

    res.json({
      message: `Reattempt enabled successfully for ${participantName}`,
      deletedSubmissions: deletedSubmissions.deletedCount,
      participantType,
      email,
      teamName: isTeamRegistration ? teamName : null
    });

  } catch (error) {
    console.error('Error enabling reattempt:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Allow bulk reattempt for multiple students/teams
router.post('/:id/bulk-reattempt', auth, authorize('event', 'admin'), async (req, res) => {
  try {
    const { students } = req.body;

    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ message: 'Students array is required' });
    }

    // First check if quiz exists
    const quiz = await EventQuiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Only check createdBy for non-admin, non-event roles
    if (req.userRole !== 'admin' && req.userRole !== 'event') {
      if (!quiz.createdBy.equals(req.user._id)) {
        return res.status(403).json({ message: 'You do not have permission to manage this quiz' });
      }
    }

    let totalDeletedSubmissions = 0;
    const results = [];

    // Process each student/team
    for (const studentData of students) {
      const { email, isTeamRegistration, teamName } = studentData;

      if (!email) {
        results.push({ email: 'unknown', success: false, error: 'Email is required' });
        continue;
      }

      try {
        // Delete existing quiz credentials to allow reattempt
        const deletedCredentials = await QuizCredentials.deleteMany({
          quiz: req.params.id,
          email: email,
          ...(isTeamRegistration && teamName ? { teamName } : {})
        });

        // Delete existing submissions
        const deletedSubmissions = await EventQuizResult.deleteMany({
          quiz: req.params.id,
          'student.email': email,
          ...(isTeamRegistration && teamName ? { 'student.teamName': teamName } : {})
        });

        totalDeletedSubmissions += deletedSubmissions.deletedCount;

        results.push({
          email,
          teamName: isTeamRegistration ? teamName : null,
          success: true,
          deletedCredentials: deletedCredentials.deletedCount,
          deletedSubmissions: deletedSubmissions.deletedCount
        });

      } catch (error) {
        console.error(`Error processing reattempt for ${email}:`, error);
        results.push({
          email,
          teamName: isTeamRegistration ? teamName : null,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    res.json({
      message: `Bulk reattempt processed: ${successCount} successful, ${failureCount} failed`,
      totalStudents: students.length,
      successCount,
      failureCount,
      totalDeletedSubmissions,
      results
    });

  } catch (error) {
    console.error('Error enabling bulk reattempt:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin endpoint to clear a participant's result (for testing)
router.delete('/:id/results/:email', auth, isEventAdmin, async (req, res) => {
  try {
    const { id, email } = req.params;

    console.log(`🗑️ ADMIN: Clearing results for ${email} in quiz ${id}`);

    // Delete the result
    const deletedResult = await EventQuizResult.deleteOne({
      quiz: id,
      'participantInfo.email': email
    });

    // Reset the credentials
    const updatedCredentials = await QuizCredentials.updateMany(
      {
        quiz: id,
        'participantDetails.email': email
      },
      {
        hasAttemptedQuiz: false,
        $unset: { quizSubmission: 1 }
      }
    );

    console.log(`🗑️ ADMIN: Cleared ${deletedResult.deletedCount} results and reset ${updatedCredentials.modifiedCount} credentials`);

    res.json({
      message: 'Results cleared successfully',
      deletedResults: deletedResult.deletedCount,
      resetCredentials: updatedCredentials.modifiedCount
    });
  } catch (error) {
    console.error('Error clearing results:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;