const express = require('express');
const router = express.Router();
const EventQuiz = require('../models/EventQuiz');
const { auth, isEventAdmin, authorize } = require('../middleware/auth');
const EventQuizAccount = require('../models/EventQuizAccount');
const EventQuizResult = require('../models/EventQuizResult');
const QuizCredentials = require('../models/QuizCredentials');
const { generateCredentials, sendRegistrationEmail } = require('../services/emailService');
const { encrypt, decrypt } = require('../utils/encryption');
const multer = require('multer');
const XLSX = require('xlsx');
const mammoth = require('mammoth');
const Tesseract = require('node-tesseract');
const path = require('path');
const fs = require('fs').promises;
const User = require('../models/User');

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

// Create a new event quiz
router.post('/', auth, isEventAdmin, async (req, res) => {
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
router.put('/:id', auth, isEventAdmin, async (req, res) => {
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

      // Check if any team member email is already registered
      const existingEmails = quiz.registrations.flatMap(reg => {
        if (reg.isTeamRegistration) {
          return [reg.teamLeader.email, ...reg.teamMembers.map(m => m.email)];
        }
        return [reg.email];
      });

      const duplicateEmail = allEmails.find(email => existingEmails.includes(email));
      if (duplicateEmail) {
        return res.status(400).json({
          message: `Email ${duplicateEmail} is already registered for this quiz`
        });
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

      // Check if email is already registered
      const existingEmails = quiz.registrations.flatMap(reg => {
        if (reg.isTeamRegistration) {
          return [reg.teamLeader.email, ...reg.teamMembers.map(m => m.email)];
        }
        return [reg.email];
      });

      if (existingEmails.includes(email)) {
        return res.status(400).json({ message: 'This email is already registered for this quiz' });
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

    // If no credentials found and password is emergency password, try to find any active credentials for this quiz
    if (!credentials && password === 'Quiz@123') {
      console.log(`🔑 LOGIN: No credentials found, trying emergency password`);
      credentials = await QuizCredentials.findOne({
        quiz: id,
        isActive: true
      });

      if (credentials) {
        console.log(`🔑 LOGIN: Emergency password used for quiz ${id} by user ${username}`);
        console.log(`🔑 LOGIN: Using emergency credentials:`, {
          username: credentials.username,
          isTeam: credentials.isTeam,
          teamName: credentials.teamName
        });
      } else {
        console.log(`🔑 LOGIN: No active credentials found for emergency password`);
      }
    }

    if (!credentials) {
      console.log(`🔑 LOGIN: No valid credentials found for username: ${username}`);
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Check if account is locked
    if (credentials.isAccountLocked()) {
      return res.status(423).json({
        message: 'Account is temporarily locked due to too many failed attempts. Please try again later.'
      });
    }

    // Verify password (check both regular password and emergency password)
    const isPasswordValid = await credentials.comparePassword(password) || password === 'Quiz@123';
    if (!isPasswordValid) {
      await credentials.incLoginAttempts();
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Log if emergency password was used
    if (password === 'Quiz@123') {
      console.log(`Emergency password used for quiz ${id} by user ${username}`);
    }

    // Check if already attempted quiz
    if (credentials.hasAttemptedQuiz) {
      return res.status(400).json({ message: 'You have already attempted this quiz' });
    }

    // Reset login attempts on successful login
    await credentials.resetLoginAttempts();

    // Generate session token
    const sessionToken = require('crypto').randomBytes(32).toString('hex');

    // Store session (in production, use Redis or database)
    // For now, we'll just return it

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
        teamMembers: credentials.teamMembers
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
      image: q.image
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

    // Return questions without correct answers
    const questions = quiz.questions.map((q, index) => ({
      id: index,
      question: q.question,
      options: q.options,
      marks: q.marks,
      image: q.image
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

// Submit quiz answers (authenticated participants)
router.post('/:id/submit', async (req, res) => {
  try {
    const { id } = req.params;
    const { sessionToken, answers, timeTaken } = req.body;

    if (!sessionToken) {
      return res.status(401).json({ message: 'Session token required' });
    }

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: 'Valid answers array is required' });
    }

    const quiz = await EventQuiz.findById(id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Find the credentials associated with this session
    // In production, you'd validate the session token properly
    // For team registrations, any team member's credentials can be used
    const credentials = await QuizCredentials.findOne({
      quiz: id,
      isActive: true,
      hasAttemptedQuiz: false // Ensure quiz hasn't been attempted yet
    });

    if (!credentials) {
      return res.status(401).json({ message: 'Invalid session' });
    }

    // Check if quiz is still active
    const now = new Date();
    const endTime = new Date(quiz.endTime);

    if (now > endTime) {
      return res.status(400).json({ message: 'Quiz time has expired' });
    }

    // Check if already submitted
    if (credentials.hasAttemptedQuiz) {
      return res.status(400).json({ message: 'You have already submitted this quiz' });
    }

    // Calculate score
    let score = 0;
    const results = answers.map((answer, index) => {
      const question = quiz.questions[index];
      const isCorrect = question && answer.selectedOption === question.correctAnswer;
      if (isCorrect) {
        score += question.marks || 1;
      }
      return {
        questionIndex: index,
        selectedOption: answer.selectedOption,
        correctAnswer: question.correctAnswer,
        isCorrect,
        marks: isCorrect ? (question.marks || 1) : 0
      };
    });

    // Check if this participant has already submitted
    const existingResult = await EventQuizResult.findOne({
      quiz: quiz._id,
      'participantInfo.email': credentials.participantDetails.email
    });

    if (existingResult) {
      return res.status(400).json({ message: 'You have already submitted this quiz' });
    }

    // Save result
    const result = new EventQuizResult({
      quiz: quiz._id,
      participantInfo: {
        name: credentials.participantDetails.name,
        email: credentials.participantDetails.email,
        college: credentials.participantDetails.college,
        department: credentials.participantDetails.department,
        year: credentials.participantDetails.year,
        isTeam: credentials.isTeam,
        teamName: credentials.teamName,
        teamMembers: credentials.teamMembers
      },
      answers: answers.map(a => ({
        questionIndex: a.questionIndex,
        selectedOption: a.selectedOption
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
        // Duplicate key error - participant already submitted
        return res.status(400).json({ message: 'You have already submitted this quiz' });
      }
      throw saveError; // Re-throw other errors
    }

    // Mark all related credentials as having attempted quiz
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

// Delete a specific registration
router.delete('/:id/registrations/:registrationId', auth, isEventAdmin, async (req, res) => {
  try {
    const quiz = await EventQuiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Find and remove the registration
    const registrationIndex = quiz.registrations.findIndex(
      reg => reg._id.toString() === req.params.registrationId
    );

    if (registrationIndex === -1) {
      return res.status(404).json({ message: 'Registration not found' });
    }

    const deletedRegistration = quiz.registrations[registrationIndex];
    quiz.registrations.splice(registrationIndex, 1);
    await quiz.save();

    // Also delete related quiz credentials if they exist
    try {
      await require('../models/QuizCredentials').deleteMany({
        quiz: req.params.id,
        registration: req.params.registrationId
      });
    } catch (credError) {
      console.log('No quiz credentials found to delete:', credError.message);
    }

    // Also delete related quiz results if they exist
    try {
      const EventQuizResult = require('../models/EventQuizResult');

      // For team registrations, delete by team name
      if (deletedRegistration.isTeamRegistration) {
        await EventQuizResult.deleteMany({
          quiz: req.params.id,
          'participantInfo.teamName': deletedRegistration.teamName
        });
        console.log(`Deleted quiz results for team: ${deletedRegistration.teamName}`);
      } else {
        // For individual registrations, delete by email
        await EventQuizResult.deleteMany({
          quiz: req.params.id,
          'participantInfo.email': deletedRegistration.email
        });
        console.log(`Deleted quiz results for email: ${deletedRegistration.email}`);
      }
    } catch (resultError) {
      console.log('No quiz results found to delete:', resultError.message);
    }

    res.json({
      message: 'Registration deleted successfully',
      deletedRegistration: {
        name: deletedRegistration.isTeamRegistration ?
          `${deletedRegistration.teamLeader.name} (Team: ${deletedRegistration.teamName})` :
          deletedRegistration.name,
        type: deletedRegistration.isTeamRegistration ? 'Team' : 'Individual'
      }
    });
  } catch (error) {
    console.error('Error deleting registration:', error);
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

// Create event quiz from Excel file
router.post('/excel', auth, authorize(['event']), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

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
      .map(row => ({
        question: row[0],
        options: [row[1], row[2], row[3], row[4]],
        correctAnswer: ['A', 'B', 'C', 'D'].indexOf(row[5].toUpperCase()),
        marks: parseInt(row[6]) || 1
      }));

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
router.post('/word', auth, authorize(['event']), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Extract text from Word document
    const result = await mammoth.extractRawText({ buffer: req.file.buffer });
    const text = result.value;

    // Parse questions from text
    const questionBlocks = text.split(/\n\s*\n/); // Split by blank lines
    const questions = questionBlocks
      .filter(block => block.trim().startsWith('Q'))
      .map(block => {
        const lines = block.trim().split('\n');
        const questionText = lines[0].replace(/^Q\d+\.\s*/, '').replace(/\(\d+\s*marks?\)/, '').trim();
        const options = lines.slice(1, 5).map(line => line.replace(/^[A-D]\)\s*/, '').replace(/\*$/, '').trim());
        const correctAnswer = lines.slice(1, 5).findIndex(line => line.includes('*'));
        const marksMatch = lines[0].match(/\((\d+)\s*marks?\)/);
        const marks = marksMatch ? parseInt(marksMatch[1]) : 1;

        return {
          question: questionText,
          options,
          correctAnswer,
          marks
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

// Create event quiz from images
router.post('/image', auth, authorize(['event']), upload.array('images'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No images uploaded' });
    }

    // Process each image with OCR
    const questions = [];
    for (const file of req.files) {
      try {
        // Use Tesseract.js for OCR
        const { data: { text } } = await Tesseract.recognize(
          file.buffer,
          'eng',
          { logger: info => console.log(info) }
        );

        // Parse the extracted text to find questions and options
        const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
        let currentQuestion = null;
        let options = [];
        let correctAnswer = -1;

        for (const line of lines) {
          if (line.match(/^Q\d+/)) {
            // If we have a previous question, save it
            if (currentQuestion && options.length === 4) {
              questions.push({
                question: currentQuestion,
                options,
                correctAnswer: correctAnswer !== -1 ? correctAnswer : 0,
                marks: 1
              });
            }
            // Start new question
            currentQuestion = line.replace(/^Q\d+[\.:]\s*/, '');
            options = [];
            correctAnswer = -1;
          } else if (line.match(/^[A-D]\)/)) {
            options.push(line.replace(/^[A-D]\)\s*/, '').replace(/\*$/, '').trim());
            if (line.includes('*')) {
              correctAnswer = options.length - 1;
            }
          }
        }

        // Add the last question
        if (currentQuestion && options.length === 4) {
          questions.push({
            question: currentQuestion,
            options,
            correctAnswer: correctAnswer !== -1 ? correctAnswer : 0,
            marks: 1
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
router.delete('/:id', auth, isEventAdmin, async (req, res) => {
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
    const submissions = await EventQuizResult.find({ quiz: req.params.id })
      .lean();

    console.log(`Found ${submissions.length} submissions for quiz ${req.params.id}`);

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

module.exports = router;