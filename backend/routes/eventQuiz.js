const express = require('express');
const router = express.Router();
const EventQuiz = require('../models/EventQuiz');
const { auth, isEventAdmin, authorize } = require('../middleware/auth');
const EventQuizAccount = require('../models/EventQuizAccount');
const EventQuizResult = require('../models/EventQuizResult');
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

    // Extract eligibility fields from the request body
    const { eligibility = {} } = req.body;
    
    // Transform eligibility fields
    const quizData = {
      ...req.body,
      departments: eligibility.departments || ['all'],
      years: eligibility.years || ['all'],
      semesters: eligibility.semesters || ['all'],
      sections: eligibility.sections || ['all'],
      createdBy: req.user._id,
      totalMarks: req.body.questions.reduce((sum, q) => sum + (q.marks || 1), 0),
      status: 'upcoming'
    };

    // Remove the eligibility object since we've extracted its fields
    delete quizData.eligibility;

    console.log('Creating quiz with data:', quizData);

    const quiz = new EventQuiz(quizData);
    await quiz.save();
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
    
    if (status) query.status = status;
    if (participantType) query.participantType = participantType;

    console.log('Query:', query);
    const quizzes = await EventQuiz.find(query)
      .populate('createdBy', 'name email')
      .sort('-createdAt');
    
    console.log('Found quizzes:', quizzes);
    
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

// Get registrations for an event quiz
router.get('/:id/registrations', auth, isEventAdmin, async (req, res) => {
  try {
    const quiz = await EventQuiz.findById(req.params.id)
      .populate('registrations.student', 'name email');
    
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    res.json(quiz.registrations);
  } catch (error) {
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

    // Only allow deletion if quiz hasn't started
    if (quiz.status !== 'upcoming') {
      return res.status(400).json({ message: 'Cannot delete quiz after it has started' });
    }

    await quiz.remove();
    // Also delete all results associated with this quiz
    await EventQuizResult.deleteMany({ quiz: req.params.id });
    
    res.json({ message: 'Quiz deleted successfully' });
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

    // Get submissions from EventQuizResult
    const submissions = await EventQuizResult.find({ quiz: req.params.id })
      .populate('student', 'name email college department year rollNumber')
      .lean();

    // Transform submissions data to include all necessary details
    const transformedSubmissions = submissions.map(submission => ({
      student: {
        _id: submission.student?._id,
        name: submission.student?.name || 'N/A',
        email: submission.student?.email || 'N/A',
        college: submission.student?.college || 'N/A',
        department: submission.student?.department || 'N/A',
        year: submission.student?.year || 'N/A',
        rollNumber: submission.student?.rollNumber || 'N/A'
      },
      status: 'submitted',
      totalMarks: submission.score || 0,
      duration: submission.timeTaken || null,
      startTime: submission.startTime || null,
      submitTime: submission.createdAt || null,
      answers: submission.answers || []
    }));

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

    // Get submission from EventQuizResult
    const submission = await EventQuizResult.findOne({
      quiz: req.params.quizId,
      student: req.params.studentId
    }).populate('student', 'name email college department year rollNumber');

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Format submission data
    const formattedSubmission = {
      student: {
        _id: submission.student._id,
        name: submission.student.name || 'N/A',
        email: submission.student.email || 'N/A',
        college: submission.student.college || 'N/A',
        department: submission.student.department || 'N/A',
        year: submission.student.year || 'N/A',
        rollNumber: submission.student.rollNumber || 'N/A'
      },
      quiz: {
        title: quiz.title,
        totalMarks: quiz.totalMarks,
        questions: quiz.questions
      },
      status: 'submitted',
      totalMarks: submission.score || 0,
      duration: submission.timeTaken || null,
      startTime: submission.startTime || null,
      submitTime: submission.createdAt || null,
      answers: submission.answers || []
    };

    res.json(formattedSubmission);
  } catch (error) {
    console.error('Error fetching submission:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 