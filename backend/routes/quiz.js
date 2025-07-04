const express = require('express');
const User = require('../models/User');
const AcademicDetail = require('../models/AcademicDetail');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const { auth, authorize } = require('../middleware/auth');
const Quiz = require('../models/Quiz');
const QuizSubmission = require('../models/QuizSubmission');
const path = require('path');
const imageProcessor = require('../services/imageProcessing');
const fs = require('fs').promises;
const mammoth = require('mammoth');
const Tesseract = require('tesseract.js');

// Universal code detection and HTML formatting functions
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
    /\{[\s\S]*\}/, // Code blocks with braces
    /<[^>]+>/, // HTML tags
    /^\s*[#\/\/]\s*/, // Comments
    /import\s+/, // Import statements
    /from\s+\w+\s+import/, // Python imports
    /include\s*</, // C++ includes
    /using\s+namespace/, // C++ using
    /public\s+static/, // Java public static
    /private\s+/, // Access modifiers
    /protected\s+/, // Access modifiers
    /int\s+main\s*\(/, // C/C++ main function
    /void\s+\w+\s*\(/, // Void functions
    /String\s+\w+/, // String declarations
    /var\s+\w+\s*=/, // Variable declarations
    /let\s+\w+\s*=/, // Let declarations
    /const\s+\w+\s*=/, // Const declarations
    /\w+\s*=\s*\w+\s*\(/, // Function calls with assignment
  ];

  return codePatterns.some(pattern => pattern.test(trimmed));
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
        .replace(/'/g, '&#39;');  // Escape single quotes

      return '<pre>' + processedText + '</pre>';
    } else {
      // For C/C++/Python/etc. code, preserve angle brackets completely
      // Only escape ampersands that aren't part of HTML entities
      let processedText = text.replace(/&(?![a-zA-Z0-9#]+;)/g, '&amp;');

      return '<pre>' + processedText + '</pre>';
    }
  }

  return text;
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept excel, word documents, and images
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
    cb(new Error('Invalid file type. Only Excel files, Word documents, and images (JPEG, PNG, GIF) are allowed.'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Memory storage for parsing endpoints (to get buffer)
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Create a new quiz (faculty only)
router.post('/', auth, authorize('faculty', 'admin'), async (req, res) => {
  try {
    console.log('Creating quiz with data:', {
      title: req.body.title,
      subject: req.body.subject,
      duration: req.body.duration,
      allowedGroups: req.body.allowedGroups,
      questionCount: req.body.questions?.length
    });

    // Validate required fields
    const requiredFields = ['title', 'subject', 'duration', 'startTime', 'endTime', 'allowedGroups', 'questions'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      console.log('Missing required fields:', missingFields);
      return res.status(400).json({ 
        success: false,
        message: 'Missing required fields', 
        fields: missingFields 
      });
    }

    // Validate subject structure
    if (typeof req.body.subject === 'string') {
      // If subject is a string (legacy format), convert it to object format
      req.body.subject = {
        code: req.body.subject,
        name: req.body.subject // Use code as name for backward compatibility
      };
    } else if (!req.body.subject.code || !req.body.subject.name) {
      return res.status(400).json({
        success: false,
        message: 'Subject must include both code and name'
      });
    }

    // Log authentication info
    console.log('User info:', {
      id: req.user._id,
      role: req.user.role,
      assignments: req.user.assignments
    });

    // For faculty, enforce department restriction
    if (req.user.role === 'faculty') {
      // Check if any group has a different department than the faculty's assignments
      const hasInvalidDepartment = req.body.allowedGroups.some(
        group => !req.user.assignments.some(
          assignment => assignment.department === group.department
        )
      );

      if (hasInvalidDepartment) {
        console.log('Faculty department restriction failed:', {
          allowedGroups: req.body.allowedGroups,
          facultyAssignments: req.user.assignments
        });
        return res.status(403).json({
          success: false,
          message: 'Faculty can only create quizzes for their assigned departments'
        });
      }
    }

    // Validate each allowed group
    for (let i = 0; i < req.body.allowedGroups.length; i++) {
      const group = req.body.allowedGroups[i];
      if (!group.year || !group.department || !group.section || !group.semester ||
          typeof group.year !== 'number' || group.year < 1 ||
          typeof group.semester !== 'number' || group.semester < 1 || group.semester > 8) {
        console.log('Invalid group format:', {
          groupIndex: i,
          group: group,
          validationErrors: {
            year: !group.year || typeof group.year !== 'number' || group.year < 1,
            semester: !group.semester || typeof group.semester !== 'number' || group.semester < 1 || group.semester > 8,
            department: !group.department,
            section: !group.section
          }
        });
        return res.status(400).json({
          success: false,
          message: 'Invalid allowed group format',
          groupIndex: i,
          expected: {
            year: 'number (positive)',
            department: 'string',
            section: 'string',
            semester: 'number (1-8)'
          },
          received: group
        });
      }

      // Convert year and semester to numbers if they're strings
      group.year = Number(group.year);
      group.semester = Number(group.semester);
    }

    // Validate questions array
    if (!Array.isArray(req.body.questions) || req.body.questions.length === 0) {
      console.log('Invalid questions array:', req.body.questions);
      return res.status(400).json({ 
        message: 'Quiz must have at least one question'
      });
    }

    // Process and validate each question
    const processedQuestions = [];
    for (let i = 0; i < req.body.questions.length; i++) {
      const q = req.body.questions[i];
      if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 ||
          typeof q.correctAnswer !== 'number' || typeof q.marks !== 'number') {
        console.log('Invalid question format:', {
          questionIndex: i,
          question: q
        });
        return res.status(400).json({
          message: 'Invalid question format',
          questionIndex: i,
          expected: {
            question: 'string',
            options: 'array of 4 strings',
            correctAnswer: 'number',
            marks: 'number'
          },
          received: q
        });
      }

      // Process question text with HTML formatting for perfect preservation
      const processedQuestion = {
        ...q,
        question: processTextWithHtmlFormatting(q.question)
      };

      processedQuestions.push(processedQuestion);
    }

    console.log('Creating new Quiz document...');
    const quiz = new Quiz({
      ...req.body,
      questions: processedQuestions, // Use processed questions with HTML formatting
      type: 'academic', // Set type for faculty quizzes
      createdBy: req.user._id
    });

    console.log('Saving quiz...');
    await quiz.save();
    console.log('Quiz saved successfully');

    // Send success response
    return res.status(201).json({
      success: true,
      message: 'Quiz created successfully'
    });
  } catch (error) {
    console.error('Error creating quiz:', error);
    return res.status(500).json({ 
      success: false,
      message: error.message || 'Failed to create quiz'
    });
  }
});

// Get all quizzes (faculty) or available quizzes (student)
router.get('/', auth, async (req, res) => {
  try {
    const { department, year, section, subjectCode } = req.query;
    let query = {};
    
    if (req.user.role === 'student') {
      console.log('Fetching quizzes for student:', {
        id: req.user._id,
        name: req.user.name,
        year: req.user.year,
        department: req.user.department,
        section: req.user.section,
        semester: req.user.semester
      });

      // For students, show available and upcoming quizzes for their year and department
      query = {
        type: 'academic',
        isActive: true,
        endTime: { $gte: new Date() }, // End time must be in the future
        allowedGroups: {
          $elemMatch: {
            year: Number(req.user.year),
            department: req.user.department,
            section: req.user.section
          }
        }
      };
    } else {
      // For faculty/admin, apply filters if provided
      query.type = 'academic'; // Only show academic quizzes for faculty
      
      if (department && department !== 'all') {
        query['allowedGroups.department'] = department;
      }
      if (year && year !== 'all') {
        query['allowedGroups.year'] = parseInt(year);
      }
      if (section && section !== 'all') {
        query['allowedGroups.section'] = section;
      }
      if (subjectCode && subjectCode !== 'all') {
        query['subject.code'] = subjectCode;
      }
      
      // If faculty, only show their quizzes
      if (req.user.role === 'faculty') {
        query.createdBy = req.user._id;
      }
    }
    
    console.log('Query:', query);

    const quizzes = await Quiz.find(query)
      .populate('createdBy', 'name email department')
      .sort({ createdAt: -1 })
      .lean();

    console.log('🔍 QUIZ ENDPOINT: Found quizzes:', {
      totalQuizzes: quizzes.length,
      quizTitles: quizzes.map(q => ({ id: q._id, title: q.title, type: q.type })),
      hasHiQuiz: quizzes.some(q => q.title === 'hi')
    });

    // Transform the data to ensure proper subject format
    const transformedQuizzes = quizzes.map(quiz => {
      // Handle legacy subject format
      if (typeof quiz.subject === 'string') {
        quiz.subject = {
          code: quiz.subject,
          name: quiz.subject
        };
      }
      return quiz;
    });

    res.json(transformedQuizzes);
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all quizzes (admin)
router.get('/all', auth, authorize('admin'), async (req, res) => {
  try {
    console.log('Fetching all quizzes for admin...');
    console.log('User role:', req.user.role);
    console.log('Query params:', req.query);

    const query = {};
    const { department, year, section, subject, faculty } = req.query;

    // Add filters only if they are not 'all'
    if (department && department !== 'all') {
      query['allowedGroups.department'] = department;
    }
    if (year && year !== 'all') {
      query['allowedGroups.year'] = parseInt(year);
    }
    if (section && section !== 'all') {
      query['allowedGroups.section'] = section;
    }
    if (subject && subject !== 'all') {
      query.subject = subject;
    }
    if (faculty && faculty !== 'all') {
      query.createdBy = faculty;
    }

    console.log('MongoDB query:', query);

    const quizzes = await Quiz.find(query)
      .populate('subject', 'name code')
      .populate('createdBy', 'name email department')
      .sort({ createdAt: -1 })
      .lean();
    
    // Transform the data to match the frontend expectations
    const transformedQuizzes = quizzes.map(quiz => ({
      ...quiz,
      department: quiz.allowedGroups?.[0]?.department || '',
      status: getQuizStatus(quiz),
      submissionCount: 0 // You might want to fetch this from QuizSubmission model
    }));
    
    console.log('Successfully fetched quizzes:', transformedQuizzes.length);
    res.json(transformedQuizzes);
  } catch (error) {
    console.error('Error fetching all quizzes:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      stack: error.stack 
    });
  }
});

// Get quiz statistics (MUST be before ID-based routes)
router.get('/statistics', auth, authorize('faculty', 'admin'), async (req, res) => {
  try {
    console.log('Fetching quiz statistics with query:', req.query);
    
    const { department, year, section, subject } = req.query;
    const now = new Date();
    
    // Build the query based on filters
    const query = {};
    
    // Add filters only if they are not 'all'
    if (department && department !== 'all') {
      query['allowedGroups.department'] = department;
    }
    if (year && year !== 'all') {
      query['allowedGroups.year'] = parseInt(year);
    }
    if (section && section !== 'all') {
      query['allowedGroups.section'] = section;
    }
    if (subject && subject !== 'all') {
      query['subject'] = subject;
    }

    console.log('Constructed MongoDB query:', query);

    // Get all quizzes matching the query
    const quizzes = await Quiz.find(query)
      .populate('subject', 'name code')
      .populate('createdBy', 'name email department')
      .sort({ createdAt: -1 })
      .lean();

    // Initialize statistics object
    const statistics = {
      totalQuizzes: quizzes.length,
      activeQuizzes: 0,
      completedQuizzes: 0,
      totalStudents: 0,
      totalSubmissions: 0,
      averageScore: 0,
      scoreDistribution: {
        excellent: 0, // > 90%
        good: 0,     // 70-90%
        average: 0,  // 50-70%
        poor: 0      // < 50%
      },
      departmentWiseStats: []
    };

    // Initialize department stats object
    const departmentStats = {};

    // Process each quiz
    for (const quiz of quizzes) {
      try {
        // Count active and completed quizzes
        if (new Date(quiz.endTime) < now) {
          statistics.completedQuizzes++;
        } else if (new Date(quiz.startTime) <= now && new Date(quiz.endTime) >= now) {
          statistics.activeQuizzes++;
        }

        // Get actual authorized students for this quiz
        const authorizedStudents = await User.find({
          role: 'student',
          department: { $in: quiz.allowedGroups.map(group => group.department) },
          year: { $in: quiz.allowedGroups.map(group => group.year) },
          section: { $in: quiz.allowedGroups.map(group => group.section) }
        }).countDocuments();

        statistics.totalStudents += authorizedStudents;

        // Initialize department stats for each department in this quiz
        quiz.allowedGroups.forEach(group => {
          if (!departmentStats[group.department]) {
            departmentStats[group.department] = {
              totalStudents: 0,
              totalSubmissions: 0,
              totalScore: 0
            };
          }
          // Add authorized students to department stats
          departmentStats[group.department].totalStudents += authorizedStudents / quiz.allowedGroups.length;
        });

        // Get submissions for this quiz
        const submissions = await QuizSubmission.find({ 
          quiz: quiz._id,
          status: 'evaluated'
        }).populate('student', 'department year').lean();

        statistics.totalSubmissions += submissions.length;

        // Process submissions for this quiz
        let quizTotalScore = 0;
        submissions.forEach(submission => {
          if (!submission.answers || !quiz.totalMarks) return;

          // Calculate total marks for this submission
          const totalMarks = submission.answers.reduce((sum, ans) => sum + (ans.marks || 0), 0);
          const scorePercentage = (totalMarks / quiz.totalMarks) * 100;
          quizTotalScore += scorePercentage;

          // Update score distribution
          if (scorePercentage > 90) statistics.scoreDistribution.excellent++;
          else if (scorePercentage > 70) statistics.scoreDistribution.good++;
          else if (scorePercentage > 50) statistics.scoreDistribution.average++;
          else statistics.scoreDistribution.poor++;

          // Update department stats
          if (submission.student?.department && departmentStats[submission.student.department]) {
            departmentStats[submission.student.department].totalSubmissions++;
            departmentStats[submission.student.department].totalScore += scorePercentage;
          }
        });

        // Update average score
        if (submissions.length > 0) {
          statistics.averageScore += quizTotalScore / submissions.length;
        }
      } catch (error) {
        console.error(`Error processing quiz ${quiz._id}:`, error);
        // Continue with next quiz
        continue;
      }
    }

    // Calculate final average score
    if (statistics.totalSubmissions > 0) {
      statistics.averageScore = statistics.averageScore / quizzes.length;
    }

    // Format department stats
    statistics.departmentWiseStats = Object.entries(departmentStats).map(([dept, stats]) => ({
      name: dept,
      submissionCount: stats.totalSubmissions,
      averageScore: stats.totalSubmissions > 0 ? stats.totalScore / stats.totalSubmissions : 0,
      submissionRate: stats.totalStudents > 0 ? (stats.totalSubmissions / stats.totalStudents) * 100 : 0
    }));

    console.log('Sending statistics:', statistics);
    res.json(statistics);
  } catch (error) {
    console.error('Error fetching quiz statistics:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all submissions for the current student (MUST be before ID-based routes)
router.get('/my-submissions', auth, async (req, res) => {
  try {
    // Debug: Uncomment for troubleshooting
    // console.log('MY-SUBMISSIONS ENDPOINT HIT:', {
    //   userId: req.user._id,
    //   userRole: req.user.role,
    //   timestamp: new Date()
    // });

    if (req.user.role !== 'student') {
      console.log('Access denied - not a student:', req.user.role);
      return res.status(403).json({ message: 'Access denied. Students only.' });
    }

    const submissions = await QuizSubmission.find({
      student: req.user._id,
      isDeleted: false  // Only fetch non-deleted submissions
    }).populate('quiz', 'title totalMarks duration questions allowedGroups subject startTime endTime');

    // Filter out submissions where quiz was deleted (quiz is null)
    const validSubmissions = submissions.filter(s => s.quiz !== null);

    console.log('Fetched student submissions:', {
      studentId: req.user._id,
      totalSubmissions: submissions.length,
      validSubmissions: validSubmissions.length,
      deletedQuizSubmissions: submissions.length - validSubmissions.length,
      submissions: validSubmissions.map(s => ({
        quizId: s.quiz._id,
        quizTitle: s.quiz.title,
        status: s.status,
        submitTime: s.submitTime
      }))
    });

    // For QuizList component (filtering), return simplified data
    // For ReviewQuizzes component, return complete data
    if (req.query.simple === 'true') {
      // Return simplified data for quiz filtering
      const simplifiedSubmissions = validSubmissions.map(submission => ({
        quizId: submission.quiz._id,
        quizTitle: submission.quiz.title,
        status: submission.status,
        submitTime: submission.submitTime
      }));

      console.log('🔍 SIMPLIFIED SUBMISSIONS RESPONSE:', {
        requestQuery: req.query,
        simplifiedSubmissions: simplifiedSubmissions,
        count: simplifiedSubmissions.length
      });

      res.json(simplifiedSubmissions);
    } else {
      // Return complete submission objects for ReviewQuizzes
      console.log('🔍 COMPLETE SUBMISSIONS RESPONSE:', {
        requestQuery: req.query,
        validSubmissions: validSubmissions.length,
        firstSubmission: validSubmissions[0] ? {
          id: validSubmissions[0]._id,
          quizTitle: validSubmissions[0].quiz?.title,
          status: validSubmissions[0].status
        } : null
      });

      res.json(validSubmissions);
    }
  } catch (error) {
    console.error('Error fetching student submissions:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get a specific quiz
router.get('/:id', auth, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate('subject', 'name code')
      .populate('createdBy', 'name email');
    
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // For students, check if quiz is available or already attempted
    if (req.user.role === 'student') {
      const hasAttempted = await QuizSubmission.findOne({
        quiz: quiz._id,
        student: req.user._id,
        isDeleted: false  // Only check non-deleted submissions
      });

      const isAvailable = quiz.isActive &&
        quiz.startTime <= new Date() &&
        quiz.endTime >= new Date() &&
        quiz.allowedGroups.some(group =>
          group.year === req.user.year &&
          group.department === req.user.department &&
          group.section === req.user.section
        );

      if (!isAvailable && !hasAttempted) {
        return res.status(403).json({ message: 'Quiz not available' });
      }

      // If shuffle is enabled, return shuffled questions for this student
      if (quiz.shuffleQuestions) {
        const shuffledQuestions = quiz.getShuffledQuestions(req.user._id);
        const quizWithShuffledQuestions = quiz.toObject();
        quizWithShuffledQuestions.questions = shuffledQuestions;
        return res.json(quizWithShuffledQuestions);
      }
    }

    res.json(quiz);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Start a quiz attempt
router.post('/:id/start', auth, authorize('student'), async (req, res) => {
  try {
    console.log('Starting quiz attempt:', {
      quizId: req.params.id,
      studentId: req.user._id,
      studentDetails: {
        department: req.user.department,
        year: req.user.year,
        section: req.user.section
      }
    });

    const quiz = await Quiz.findById(req.params.id);
    
    if (!quiz) {
      console.log('Quiz not found:', req.params.id);
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if quiz is available
    const now = new Date();
    const isAvailable = quiz.isActive &&
      new Date(quiz.startTime) <= now &&
      new Date(quiz.endTime) >= now &&
      quiz.allowedGroups.some(group =>
        group.year === req.user.year &&
        group.department === req.user.department &&
        group.section === req.user.section
      );

    console.log('Quiz availability check:', {
      quizId: quiz._id,
      title: quiz.title,
      isActive: quiz.isActive,
      startTime: quiz.startTime,
      endTime: quiz.endTime,
      now: now,
      userYear: req.user.year,
      userDepartment: req.user.department,
      userSection: req.user.section,
      allowedGroups: quiz.allowedGroups,
      isAvailable: isAvailable
    });

    if (!isAvailable) {
      return res.status(403).json({ 
        message: 'Quiz not available',
        details: {
          isActive: quiz.isActive,
          startTime: quiz.startTime,
          endTime: quiz.endTime,
          allowedGroups: quiz.allowedGroups
        }
      });
    }

    // Check if student has already attempted the quiz (only non-deleted submissions)
    const existingAttempt = await QuizSubmission.findOne({
      quiz: quiz._id,
      student: req.user._id,
      isDeleted: false  // Only check non-deleted submissions
    });

    if (existingAttempt) {
      console.log('Existing attempt found:', {
        submissionId: existingAttempt._id,
        status: existingAttempt.status,
        isDeleted: existingAttempt.isDeleted,
        startTime: existingAttempt.startTime
      });

      if (existingAttempt.isDeleted) {
        return res.status(400).json({
          message: 'Your previous submission was removed by the instructor. Please contact your instructor for assistance.',
          submissionId: existingAttempt._id,
          status: 'deleted'
        });
      } else {
        return res.status(400).json({
          message: 'Quiz already attempted',
          submissionId: existingAttempt._id,
          status: existingAttempt.status
        });
      }
    }

    // Create new quiz submission
    const submission = new QuizSubmission({
      quiz: quiz._id,
      student: req.user._id,
      startTime: new Date(),
      status: 'started'
    });

    await submission.save();
    console.log('New submission created:', {
      submissionId: submission._id,
      quizId: quiz._id,
      studentId: req.user._id,
      startTime: submission.startTime
    });

    res.status(201).json(submission);
  } catch (error) {
    console.error('Error in quiz start:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Submit quiz answers
router.post('/:id/submit', auth, authorize('student'), async (req, res) => {
  try {
    const submission = await QuizSubmission.findOne({
      quiz: req.params.id,
      student: req.user._id,
      status: 'started',
      isDeleted: false  // Only look for non-deleted submissions
    });

    if (!submission) {
      return res.status(404).json({ message: 'Quiz submission not found' });
    }

    const quiz = await Quiz.findById(req.params.id);
    
    // Calculate duration in minutes
    const startTime = new Date(submission.startTime);
    const submitTime = new Date();
    const durationInMinutes = Math.ceil((submitTime - startTime) / (1000 * 60));

    // Evaluate answers and calculate total marks with negative marking support
    const answers = req.body.answers.map(answer => {
      const question = quiz.questions.id(answer.questionId);
      const isCorrect = question.correctAnswer === answer.selectedOption;
      let questionScore = 0;

      if (isCorrect) {
        questionScore = question.marks;
      } else if (quiz.negativeMarkingEnabled && answer.selectedOption !== -1) {
        // Apply negative marking only if an option is selected (not skipped)
        const negativeMarks = question.negativeMarks || 0;
        questionScore = -negativeMarks;
      }

      return {
        questionId: answer.questionId,
        selectedOption: answer.selectedOption,
        isCorrect: isCorrect,
        marks: questionScore,
        negativeMarks: question.negativeMarks || 0
      };
    });

    const totalMarks = answers.reduce((sum, ans) => sum + ans.marks, 0);

    // Update submission with duration and other details
    submission.answers = answers;
    submission.submitTime = submitTime;
    submission.duration = durationInMinutes;
    submission.totalMarks = totalMarks;
    submission.status = 'evaluated';
    
    await submission.save();
    console.log('Submission saved with duration:', durationInMinutes, 'minutes');

    res.json(submission);
  } catch (error) {
    console.error('Error submitting quiz:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update quiz (faculty only)
router.put('/:id', auth, authorize('faculty', 'admin'), async (req, res) => {
  try {
    // Validate dates first
    try {
      Quiz.validateDates(req.body.startTime, req.body.endTime);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }

    // Convert date strings to Date objects
    const updateData = {
      ...req.body,
      startTime: new Date(req.body.startTime),
      endTime: new Date(req.body.endTime)
    };

    const quiz = await Quiz.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      updateData,
      { 
        new: true, 
        runValidators: true
      }
    ).populate('subject', 'name code');

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    res.json(quiz);
  } catch (error) {
    console.error('Error updating quiz:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      details: error.errors ? Object.keys(error.errors).reduce((acc, key) => {
        acc[key] = error.errors[key].message;
        return acc;
      }, {}) : undefined
    });
  }
});

// Get all authorized students with submission status for a quiz
router.get('/:id/authorized-students', auth, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if faculty owns this quiz
    if (quiz.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Not your quiz.' });
    }

    // Get all students who are authorized to take this quiz
    const authorizedStudents = await User.find({
      role: 'student',
      department: { $in: quiz.allowedGroups.map(group => group.department) },
      year: { $in: quiz.allowedGroups.map(group => group.year) },
      section: { $in: quiz.allowedGroups.map(group => group.section) }
    }).select('name admissionNumber department year section');
    
    // Get all submissions for this quiz (exclude deleted)
    const submissions = await QuizSubmission.find({
      quiz: req.params.id,
      isDeleted: false
    })
      .select('student status submitTime totalMarks startTime duration answers')
      .lean();

    // Create a map of student IDs to their submission status
    const submissionMap = {};
    submissions.forEach(sub => {
      // Calculate total marks if not already calculated
      const totalMarks = sub.answers ? sub.answers.reduce((sum, ans) => sum + (ans.marks || 0), 0) : 0;
      
      submissionMap[sub.student.toString()] = {
        status: sub.status,
        submitTime: sub.submitTime,
        totalMarks: totalMarks,
        startTime: sub.startTime,
        duration: sub.duration // Duration in minutes
      };
    });

    // Combine student data with submission status
    const result = authorizedStudents.map(student => {
      const submission = submissionMap[student._id.toString()] || null;
      return {
        student: {
          _id: student._id,
          name: student.name,
          admissionNumber: student.admissionNumber,
          department: student.department,
          year: student.year,
          section: student.section
        },
        hasSubmitted: !!submission && submission.status === 'evaluated',
        submissionStatus: submission?.status || 'not attempted',
        submitTime: submission?.submitTime || null,
        totalMarks: submission?.totalMarks || null,
        startTime: submission?.startTime || null,
        duration: submission?.duration || null // Duration in minutes
      };
    });

    res.json({
      quiz: {
        _id: quiz._id,
        title: quiz.title,
        allowedGroups: quiz.allowedGroups,
        totalMarks: quiz.totalMarks
      },
      students: result
    });

  } catch (error) {
    console.error('Error fetching authorized students:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message
    });
  }
});

// Delete quiz (faculty and admin)
router.delete('/:id', auth, authorize('faculty', 'admin'), async (req, res) => {
  try {
    console.log(`🗑️ Delete request for quiz ${req.params.id} by user ${req.user._id} (role: ${req.user.role})`);

    // Build query based on user role
    const query = { _id: req.params.id };

    // If faculty, only allow deleting their own quizzes
    if (req.user.role === 'faculty') {
      query.createdBy = req.user._id;
    }
    // Admin can delete any quiz (no createdBy restriction)

    console.log('Delete query:', query);

    const quiz = await Quiz.findOneAndDelete(query);

    if (!quiz) {
      console.log('❌ Quiz not found or access denied');
      return res.status(404).json({ message: 'Quiz not found' });
    }

    console.log('✅ Quiz deleted successfully:', quiz.title);
    res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting quiz:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create quiz from image
router.post('/upload/image', auth, authorize('faculty'), upload.single('file'), async (req, res) => {
  try {
    // Check if file exists
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Check if the file is an image
    if (!req.file.mimetype.startsWith('image/')) {
      await fs.unlink(req.file.path);
      return res.status(400).json({ message: 'Please upload an image file' });
    }

    // Validate required fields
    const requiredFields = ['title', 'subjectCode', 'duration', 'startTime', 'endTime', 'allowedGroups'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      await fs.unlink(req.file.path);
      return res.status(400).json({ 
        message: `Missing required fields: ${missingFields.join(', ')}` 
      });
    }

    try {
      // Extract questions from image
      console.log('Processing image:', req.file.path);
      const extractedData = await imageProcessor.extractTextFromImage(req.file.path);

      if (!extractedData || !extractedData.questions || extractedData.questions.length === 0) {
        throw new Error('No questions could be extracted from the image');
      }

      console.log('Extracted questions:', extractedData);

      // Create quiz with extracted questions
      const quiz = new Quiz({
        title: req.body.title,
        subject: req.body.subjectCode,
        duration: parseInt(req.body.duration),
        startTime: new Date(req.body.startTime),
        endTime: new Date(req.body.endTime),
        createdBy: req.user._id,
        questions: extractedData.questions,
        totalMarks: extractedData.totalMarks,
        allowedGroups: JSON.parse(req.body.allowedGroups)
      });

      await quiz.save();

      // Clean up uploaded file
      await fs.unlink(req.file.path);

      res.status(201).json({
        quiz,
        message: `Successfully extracted ${extractedData.questions.length} questions from image`
      });
    } catch (error) {
      // Clean up uploaded file
      await fs.unlink(req.file.path);
      throw error;
    }
  } catch (error) {
    console.error('Error creating quiz from image:', error);

    // Handle different types of errors
    if (error instanceof SyntaxError) {
      return res.status(400).json({ message: 'Invalid JSON format in request body' });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error',
        details: Object.keys(error.errors).reduce((acc, key) => {
          acc[key] = error.errors[key].message;
          return acc;
        }, {})
      });
    }

    res.status(400).json({ 
      message: error.message || 'Error creating quiz'
    });
  } finally {
    // Clean up OCR worker
    await imageProcessor.cleanup();
  }
});

// Create quiz from Excel file
router.post('/upload/excel', auth, authorize('faculty'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const questions = data.map(row => ({
      question: row.Question,
      options: [row.Option1, row.Option2, row.Option3, row.Option4],
      correctAnswer: parseInt(row.CorrectAnswer) - 1,
      marks: row.Marks || 1,
      explanation: row.Explanation || ''
    }));

    const quiz = new Quiz({
      title: req.body.title,
      subject: req.body.subjectCode,
      duration: req.body.duration,
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      createdBy: req.user._id,
      questions: questions
    });

    await quiz.save();

    // Clean up uploaded file
    await fs.unlink(req.file.path);

    res.status(201).json(quiz);
  } catch (error) {
    console.error('Error creating quiz from Excel:', error);
    res.status(500).json({ message: 'Error creating quiz', error: error.message });
  }
});



// Get quiz submission
router.get('/:id/submission', auth, async (req, res) => {
  try {
    const submission = await QuizSubmission.findOne({
      quiz: req.params.id,
      student: req.user._id,
      isDeleted: false  // Only fetch non-deleted submissions
    }).populate('quiz');

    if (!submission) {
      return res.status(404).json({ message: 'Quiz submission not found' });
    }

    // If submission is still in progress and the quiz time has expired
    if (submission.status === 'started') {
      const quiz = await Quiz.findById(req.params.id);
      const endTime = new Date(submission.startTime.getTime() + quiz.duration * 60000);
      if (new Date() > endTime) {
        // Auto-submit with current answers
        submission.status = 'evaluated';
        submission.submitTime = new Date();
        await submission.save();
      }
    }

    res.json(submission);
  } catch (error) {
    console.error('Error fetching quiz submission:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all submissions for a quiz (faculty only)
router.get('/:id/submissions', auth, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if faculty owns this quiz (skip check for admin)
    if (req.user.role === 'faculty' && quiz.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied. Not your quiz.' });
    }

    // Get all submissions for this quiz with student details (exclude deleted)
    const submissions = await QuizSubmission.find({
      quiz: req.params.id,
      isDeleted: false
    })
      .populate('student', 'name admissionNumber department year section')
      .select('answers startTime submitTime duration totalMarks status')
      .sort({ submitTime: -1 });

    // Add quiz details to the response
    const response = {
      quiz: {
        title: quiz.title,
        totalMarks: quiz.totalMarks,
        duration: quiz.duration,
        questions: quiz.questions
      },
      submissions: submissions
    };

    res.json(response);
  } catch (error) {
    console.error('Get quiz submissions error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get deleted submissions for a quiz (faculty only)
router.get('/:id/deleted-submissions', auth, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if faculty owns this quiz (skip check for admin)
    if (req.user.role === 'faculty' && quiz.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied. Not your quiz.' });
    }

    // Get all deleted submissions for this quiz with student details
    const deletedSubmissions = await QuizSubmission.find({
      quiz: req.params.id,
      isDeleted: true
    })
      .populate('student', 'name admissionNumber department year section')
      .populate('deletedBy', 'name email')
      .select('answers startTime submitTime duration totalMarks status isDeleted deletedAt deletedBy deletionReason')
      .sort({ deletedAt: -1 });

    // Add quiz details to the response
    const response = {
      quiz: {
        title: quiz.title,
        totalMarks: quiz.totalMarks,
        duration: quiz.duration,
        questions: quiz.questions
      },
      deletedSubmissions: deletedSubmissions
    };

    res.json(response);
  } catch (error) {
    console.error('Get deleted quiz submissions error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Restore a deleted submission (faculty only)
router.post('/:quizId/restore-submission/:studentId', auth, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if faculty owns this quiz (skip check for admin)
    if (req.user.role === 'faculty' && quiz.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied. Not your quiz.' });
    }

    const submission = await QuizSubmission.findOne({
      quiz: req.params.quizId,
      student: req.params.studentId,
      isDeleted: true
    });

    if (!submission) {
      return res.status(404).json({ message: 'Deleted submission not found' });
    }

    // Restore the submission
    submission.isDeleted = false;
    submission.deletedAt = null;
    submission.deletedBy = null;
    submission.deletionReason = null;
    await submission.save();

    res.json({
      message: 'Submission restored successfully',
      restoredSubmission: {
        studentId: req.params.studentId,
        quizId: req.params.quizId,
        score: submission.totalMarks
      }
    });
  } catch (error) {
    console.error('Error restoring submission:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all submissions (admin)
router.get('/all-submissions', auth, authorize('admin'), async (req, res) => {
  try {
    // Get all submissions with populated references
    const submissions = await QuizSubmission.find()
      .populate('student', 'name admissionNumber department year section')
      .populate({
        path: 'quiz',
        select: 'title totalMarks questions createdBy',
        populate: {
          path: 'createdBy',
          select: 'name email department'
        }
      })
      .sort({ submitTime: -1 });

    if (!submissions) {
      return res.status(404).json({ message: 'No submissions found' });
    }

    // Group submissions by quiz
    const submissionsByQuiz = submissions.reduce((acc, submission) => {
      if (!acc[submission.quiz._id]) {
        acc[submission.quiz._id] = [];
      }
      acc[submission.quiz._id].push(submission);
      return acc;
    }, {});
    
    res.json(submissionsByQuiz);
  } catch (error) {
    console.error('Error fetching all submissions:', error);
    res.status(500).json({ 
      message: 'Server error while fetching submissions',
      error: error.message 
    });
  }
});

// Get individual student submission (faculty only)
router.get('/:quizId/submissions/:studentId', auth, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if faculty owns this quiz
    if (quiz.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Not your quiz.' });
    }

    const submission = await QuizSubmission.findOne({
      quiz: req.params.quizId,
      student: req.params.studentId
    })
    .populate('student', 'name admissionNumber department year section')
    .populate('quiz', 'title totalMarks questions');

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    res.json(submission);
  } catch (error) {
    console.error('Error fetching student submission:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get quiz details for faculty view
router.get('/:id/details', auth, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate('subject', 'name code')
      .populate('createdBy', 'name email');

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if faculty owns this quiz
    if (quiz.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Not your quiz.' });
    }

    res.json(quiz);
  } catch (error) {
    console.error('Error fetching quiz details:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get event quizzes
router.get('/event', auth, async (req, res) => {
  try {
    const quizzes = await Quiz.find({ type: 'event' })
      .populate('createdBy', 'name email department')
      .sort({ createdAt: -1 })
      .lean();

    res.json(quizzes);
  } catch (error) {
    console.error('Error fetching event quizzes:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Helper function to determine quiz status
const getQuizStatus = (quiz) => {
  const now = new Date();
  if (!quiz.isActive) return 'inactive';
  if (now < new Date(quiz.startTime)) return 'upcoming';
  if (now > new Date(quiz.endTime)) return 'completed';
  return 'active';
};


// Parse Excel file and return questions (for preview) - WITH UNIVERSAL INDENTATION SUPPORT
router.post('/parse/excel', auth, authorize('faculty', 'admin', 'event'), memoryUpload.single('file'), async (req, res) => {
  try {
    console.log('Excel parse request received');
    console.log('File info:', {
      hasFile: !!req.file,
      filename: req.file?.originalname,
      size: req.file?.size,
      mimetype: req.file?.mimetype,
      hasBuffer: !!req.file?.buffer,
      bufferLength: req.file?.buffer?.length
    });

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    if (!req.file.buffer) {
      return res.status(400).json({ message: 'File buffer is empty' });
    }

    // Function to check if text needs format preservation (same as Word/Image processing)
    const needsFormatPreservation = (text) => {
      return text.includes('def ') || text.includes('if ') || text.includes('for ') ||
             text.includes('while ') || text.includes('class ') || text.includes('function ') ||
             text.includes('{') || text.includes('}') || text.includes('<') || text.includes('>') ||
             text.includes('    ') || text.includes('\t');
    };

    // Apply simple universal indentation restoration - No language detection
    const restoreIndentationForAllLanguages = (questionLines) => {
      const restoredLines = [];
      let currentIndentLevel = 0;

      for (let i = 0; i < questionLines.length; i++) {
        const line = questionLines[i].trim();

        if (!line) {
          restoredLines.push('');
          continue;
        }

        // Simple pattern-based indentation - no language detection

        // Lines ending with : or { increase indentation for next lines
        if (line.endsWith(':') || line.endsWith('{')) {
          const indent = '    '.repeat(currentIndentLevel);
          restoredLines.push(indent + line);
          currentIndentLevel++;
          continue;
        }

        // Closing braces decrease indentation
        if (line === '}' || line.startsWith('}')) {
          currentIndentLevel = Math.max(0, currentIndentLevel - 1);
          const indent = '    '.repeat(currentIndentLevel);
          restoredLines.push(indent + line);
          continue;
        }

        // else statements align with previous if
        if (line.startsWith('else')) {
          currentIndentLevel = Math.max(0, currentIndentLevel - 1);
          const indent = '    '.repeat(currentIndentLevel);
          restoredLines.push(indent + line);
          if (line.endsWith(':') || line.endsWith('{')) {
            currentIndentLevel++;
          }
          continue;
        }

        // Default: apply current indentation to all other lines
        const indent = '    '.repeat(currentIndentLevel);
        restoredLines.push(indent + line);

      }

      return restoredLines;
    };



    console.log('Attempting to read Excel file...');
    let workbook;
    try {
      workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    } catch (xlsxError) {
      console.error('XLSX read error:', xlsxError);
      return res.status(400).json({ message: 'Invalid Excel file format', error: xlsxError.message });
    }

    console.log('Workbook sheets:', workbook.SheetNames);

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return res.status(400).json({ message: 'No sheets found in Excel file' });
    }

    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log('Excel parsing - Raw data:', jsonData);
    console.log('Excel parsing - First few rows:', jsonData.slice(0, 3));

    // Skip header row and validate data
    const questions = jsonData.slice(1)
      .filter(row => {
        console.log('Filtering row:', row, 'Length:', row.length, 'Has question:', !!row[0]);
        return row.length >= 6 && row[0]; // At least 6 columns required
      })
      .map((row, index) => {
        console.log(`Processing row ${index + 1}:`, row);
        const marks = parseInt(row[6]) || 1;
        const providedNegativeMarks = row[7] ? parseFloat(row[7]) : null;

        // Use provided negative marks, or default to 0 for parsing
        let negativeMarks = 0;
        if (providedNegativeMarks !== null) {
          negativeMarks = providedNegativeMarks;
        }
        // Note: Default negative marking will be set when creating the actual quiz

        // Process question text with HTML formatting for perfect preservation
        let questionText = String(row[0] || '').trim();

        // Apply HTML formatting if the text contains code
        if (hasCodeContent(questionText)) {
          questionText = processTextWithHtmlFormatting(questionText);
        }

        const question = {
          question: questionText,
          options: [
            String(row[1] || '').trim(),
            String(row[2] || '').trim(),
            String(row[3] || '').trim(),
            String(row[4] || '').trim()
          ],
          correctAnswer: row[5] ? ['A', 'B', 'C', 'D'].indexOf(String(row[5]).toUpperCase().trim()) : 0,
          marks: marks,
          negativeMarks: negativeMarks
        };
        console.log(`Processed question ${index + 1}:`, question);
        return question;
      });

    console.log('Excel parsing - Final questions:', questions);

    if (questions.length === 0) {
      return res.status(400).json({ message: 'No valid questions found in the file' });
    }

    console.log('Sending response with questions:', { questions });
    const responseData = { questions };
    console.log('Response data being sent:', responseData);

    res.json(responseData);
  } catch (error) {
    console.error('Error parsing Excel quiz:', error);
    res.status(500).json({ message: 'Failed to parse Excel file', error: error.message });
  }
});

// Handle Excel quiz upload - WITH UNIVERSAL INDENTATION SUPPORT
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

    // Apply simple universal indentation restoration - No language detection
    const restoreIndentationForAllLanguages = (questionLines) => {
      const restoredLines = [];
      let currentIndentLevel = 0;

      for (let i = 0; i < questionLines.length; i++) {
        const line = questionLines[i].trim();

        if (!line) {
          restoredLines.push('');
          continue;
        }

        // Simple pattern-based indentation - no language detection

        // Lines ending with : or { increase indentation for next lines
        if (line.endsWith(':') || line.endsWith('{')) {
          const indent = '    '.repeat(currentIndentLevel);
          restoredLines.push(indent + line);
          currentIndentLevel++;
          continue;
        }

        // Closing braces decrease indentation
        if (line === '}' || line.startsWith('}')) {
          currentIndentLevel = Math.max(0, currentIndentLevel - 1);
          const indent = '    '.repeat(currentIndentLevel);
          restoredLines.push(indent + line);
          continue;
        }

        // else statements align with previous if
        if (line.startsWith('else')) {
          currentIndentLevel = Math.max(0, currentIndentLevel - 1);
          const indent = '    '.repeat(currentIndentLevel);
          restoredLines.push(indent + line);
          if (line.endsWith(':') || line.endsWith('{')) {
            currentIndentLevel++;
          }
          continue;
        }

        // Default: apply current indentation to all other lines
        const indent = '    '.repeat(currentIndentLevel);
        restoredLines.push(indent + line);

      }

      return restoredLines;
    };

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Skip header row and validate data
    const questions = jsonData.slice(1)
      .filter(row => row.length >= 7 && row[0])
      .map(row => {
        // Process question text with HTML formatting for perfect preservation
        let questionText = String(row[0] || '').trim();

        // Apply HTML formatting if the text contains code
        if (hasCodeContent(questionText)) {
          questionText = processTextWithHtmlFormatting(questionText);
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
      ...JSON.parse(req.body.quizDetails),
      questions,
      createdBy: req.user._id,
      type: req.user.role === 'faculty' ? 'academic' : 'event'
    };

    const quiz = new Quiz(quizData);
    await quiz.save();

    res.status(201).json(quiz);
  } catch (error) {
    console.error('Error processing Excel quiz:', error);
    res.status(500).json({ message: 'Failed to process Excel file', error: error.message });
  }
});

// Parse Word file and return questions (for preview)
router.post('/parse/word', auth, authorize('faculty', 'admin', 'event'), memoryUpload.single('file'), async (req, res) => {
  try {
    console.log('Word parse request received');
    console.log('File info:', {
      hasFile: !!req.file,
      filename: req.file?.originalname,
      size: req.file?.size,
      mimetype: req.file?.mimetype
    });

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Extract text from Word document with better formatting preservation
    // Use convertToHtml first to preserve structure, then convert to text
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

    // Helper function to detect if text needs formatting preservation (Universal)
    const needsFormatPreservation = (text) => {
      // Enhanced check for code-like content
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

    // Keep the old function name for compatibility
    const detectCodeBlock = (text) => {
      return needsFormatPreservation(text);
    };

    // Parse questions from text - improved logic with code preservation
    const lines = text.split('\n').filter(line => line.length > 0);
    console.log('All lines:', lines);

    const questions = [];
    let currentQuestion = null;
    let currentOptions = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      console.log(`Processing line ${i}: "${line}"`);

      // Check if this is a question line (starts with Q1., Q2., etc.)
      if (/^Q\d+\./.test(line)) {
        // Save previous question if exists
        if (currentQuestion) {
          const correctAnswer = currentOptions.findIndex(opt => opt.includes('*'));
          const cleanOptions = currentOptions.map(opt => opt.replace(/\*$/, '').trim());

          questions.push({
            question: currentQuestion.question,
            options: cleanOptions,
            correctAnswer: correctAnswer >= 0 ? correctAnswer : 0,
            marks: currentQuestion.marks,
            negativeMarks: currentQuestion.negativeMarks || 0,
            isCodeQuestion: detectCodeBlock(currentQuestion.question)
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
        // Note: Default negative marking will be set when creating the actual quiz

        currentQuestion = { question: questionText, marks, negativeMarks };
        currentOptions = [];
        console.log('Found question:', currentQuestion);
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
      console.log('Final formatted question:', JSON.stringify(formattedQuestion));

      questions.push({
        question: formattedQuestion,
        options: cleanOptions,
        correctAnswer: correctAnswer >= 0 ? correctAnswer : 0,
        marks: currentQuestion.marks,
        negativeMarks: currentQuestion.negativeMarks || 0,
        isCodeQuestion: hasCodeContent(currentQuestion.question)
      });
    }

    console.log('Final parsed questions:', questions);

    if (questions.length === 0) {
      return res.status(400).json({ message: 'No valid questions found in the document. Please ensure your document follows the correct format.' });
    }

    res.json({ questions });
  } catch (error) {
    console.error('Error parsing Word quiz:', error);
    res.status(500).json({ message: 'Failed to parse Word document', error: error.message });
  }
});

// Handle Word quiz upload
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
      createdBy: req.user._id
    };

    const quiz = new Quiz(quizData);
    await quiz.save();

    res.status(201).json(quiz);
  } catch (error) {
    console.error('Error processing Word quiz:', error);
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

        console.log('OCR extracted text:', text);
        console.log('OCR text length:', text.length);
        console.log('='.repeat(50));
        console.log('RAW OCR TEXT WITH FORMATTING:');
        console.log(JSON.stringify(text)); // Show exact characters including spaces/tabs
        console.log('='.repeat(50));

        // Preprocess OCR text to fix common recognition errors
        let preprocessedText = text
          // Fix common OCR errors in Python code
          .replace(/def\s+(\w+)\(\)\):/g, 'def $1():')  // Fix def startup())): to def startup():
          .replace(/\(\)\):/g, '():')                    // Fix ())): to ):
          .replace(/if\s+global\s+(\w+):/g, 'if global $1:')  // Fix spacing in if global
          .replace(/print\s*\(\s*"([^"]*?)"\s*\)/g, 'print("$1")')  // Fix print spacing
          .replace(/redy/g, 'ready')                     // Fix common typo
          .replace(/Engines/g, 'Engines')                // Ensure proper capitalization
          // Fix indentation issues - if a print statement follows an if statement, it should be indented
          .replace(/(\n\s*if\s+[^:\n]+:\s*\n)(\s*print\s*\([^)]+\))/g, '$1        $2');

        console.log('PREPROCESSED OCR TEXT:');
        console.log(JSON.stringify(preprocessedText));
        console.log('='.repeat(50));

        // Parse the extracted text to find questions and options
        // Helper function to detect if text needs formatting preservation (Universal)
        const needsFormatPreservation = (text) => {
          return (
            text.includes('\n') ||           // Multiple lines
            /^\s{2,}/m.test(text) ||        // Lines with 2+ leading spaces (indentation)
            /\t/.test(text) ||              // Contains tabs
            // Programming language keywords (Python, JavaScript, Java, C/C++)
            /\b(def|function|class|if|else|for|while|return|import|from|print|console\.log|var|let|const|public|private|static)\b/.test(text) ||
            // C/C++ specific keywords and patterns
            /\b(case|default|break|continue|switch|include|stdio|main|int|char|float|double|void|struct|typedef|enum)\b/.test(text) ||
            /\#include\s*</.test(text) ||   // #include <stdio.h>
            /printf\s*\(/.test(text) ||     // printf() calls
            /scanf\s*\(/.test(text) ||      // scanf() calls
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

        // Apply simple universal indentation restoration - No language detection
        const restoreIndentationForAllLanguages = (questionLines) => {
          const restoredLines = [];
          let currentIndentLevel = 0;
          let blockStack = []; // Track nested blocks

          for (let i = 0; i < questionLines.length; i++) {
            const line = questionLines[i].trim();

            if (!line) {
              restoredLines.push('');
              continue;
            }

            // Handle function definitions, class definitions
            if (line.match(/^(def|class|function)\s+/)) {
              currentIndentLevel = 0; // Reset to base level for new function/class
              blockStack = [];
              const indent = '    '.repeat(currentIndentLevel);
              restoredLines.push(indent + line);
              if (line.endsWith(':')) {
                currentIndentLevel++;
                blockStack.push('def');
              }
              continue;
            }

            // Handle control structures that should align with previous level
            if (line.match(/^(else|elif|except|finally|catch)\b/)) {
              // These should align with the corresponding if/try/for/while
              if (blockStack.length > 0) {
                currentIndentLevel = Math.max(0, currentIndentLevel - 1);
              }
              const indent = '    '.repeat(currentIndentLevel);
              restoredLines.push(indent + line);
              if (line.endsWith(':')) {
                currentIndentLevel++;
                blockStack.push('control');
              }
              continue;
            }

            // Handle lines that start new blocks
            if (line.match(/^(if|for|while|try|with)\b/) && line.endsWith(':')) {
              const indent = '    '.repeat(currentIndentLevel);
              restoredLines.push(indent + line);
              currentIndentLevel++;
              blockStack.push('control');
              continue;
            }

            // Handle other lines ending with : (like function calls, etc.)
            if (line.endsWith(':') && !line.match(/^(if|for|while|try|with|else|elif|except|finally|def|class)\b/)) {
              const indent = '    '.repeat(currentIndentLevel);
              restoredLines.push(indent + line);
              currentIndentLevel++;
              blockStack.push('other');
              continue;
            }

            // Handle closing braces for languages like JavaScript, C++, etc.
            if (line === '}' || line.startsWith('}')) {
              if (blockStack.length > 0) {
                blockStack.pop();
                currentIndentLevel = Math.max(0, currentIndentLevel - 1);
              }
              const indent = '    '.repeat(currentIndentLevel);
              restoredLines.push(indent + line);
              continue;
            }

            // Handle function calls at top level (like hello(10))
            if (line.match(/^\w+\s*\([^)]*\)\s*$/) && currentIndentLevel > 0) {
              // Check if this looks like a standalone function call
              // If we're in a function and this is a simple function call, it might be top-level
              const nextLine = i + 1 < questionLines.length ? questionLines[i + 1].trim() : '';
              if (!nextLine || nextLine.match(/^(def|class|if|for|while|$)/)) {
                // This looks like a top-level function call
                restoredLines.push(line); // No indentation
                currentIndentLevel = 0;
                blockStack = [];
                continue;
              }
            }

            // Default: apply current indentation to all other lines
            const indent = '    '.repeat(currentIndentLevel);
            restoredLines.push(indent + line);
          }

          return restoredLines;
        };

        // Parse questions from text - improved logic with code preservation (SAME AS WORD PROCESSING)
        const lines = preprocessedText.split('\n');
        console.log('All lines from OCR (preserving original formatting):');
        lines.forEach((line, i) => {
          console.log(`Line ${i}: "${line}"`);
        });

        // Process OCR text with HTML formatting for perfect preservation

        let currentQuestion = null;
        let options = [];
        let correctAnswer = -1;
        let questionLines = []; // To collect all lines of the current question

        let currentQuestionData = null;

        for (const line of lines) {
          console.log('Processing line:', line);
          if (line.match(/^Q\d+/) || line.match(/^\d+[\.\)]/) || line.match(/Question\s*\d+/i)) {
            // If we have a previous question, save it
            if (currentQuestionData && currentQuestion && options.length === 4) {
              // Apply indentation restoration for code questions (same as Excel/Word processing)
              let questionText;
              if (needsFormatPreservation(questionLines.join('\n'))) {
                const restoredLines = restoreIndentationForAllLanguages(questionLines);
                questionText = restoredLines.join('\n');
              } else {
                questionText = questionLines.join('\n');
              }

              // Process question text with HTML formatting for perfect preservation
              const formattedQuestion = processTextWithHtmlFormatting(questionText);

              questions.push({
                question: formattedQuestion,
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

            console.log('Extracted question:', { questionText, marks, negativeMarks });

            currentQuestionData = { marks, negativeMarks };
            currentQuestion = questionText;
            questionLines = [questionText]; // Start collecting question lines
            options = [];
            correctAnswer = -1;
          } else if (line.match(/^[A-D©]\)/) ||
                     line.match(/^[|l]\s*[A-D]/) ||  // Handle | A, l A (OCR errors)
                     line.match(/^[A-D]\)\s*/) ||     // Standard A) format
                     line.match(/^o[A-D]/) ||         // Handle oA, oB, oC, oD (OCR errors)
                     line.match(/^[A-D]\s/) ||        // Handle A B, B B, etc.
                     line.match(/^[|l]\s*A/) ||       // Specifically handle | A, l A
                     line.match(/^oC/) ||             // Specifically handle oC (often oD is misread C)
                     line.match(/^oD/) ||             // Specifically handle oD
                     (line.length <= 3 && line.match(/^[A-D|ol]/))) { // Short lines starting with A-D or OCR errors

            // Handle various OCR misreadings and normalize to proper format
            let normalizedLine = line;
            let optionLetter = '';
            let optionText = '';

            // Handle specific OCR patterns
            if (line.match(/^[|l]\s*A/)) {
              // | A or l A -> A)
              optionLetter = 'A';
              optionText = line.replace(/^[|l]\s*A\s*/, '').trim() || 'A'; // Default to 'A' if no text
            } else if (line.match(/^oD/)) {
              // oD -> C) (assuming this is option C since we're missing C)
              optionLetter = 'C';
              optionText = line.replace(/^oD\s*/, '').trim() || 'C'; // Default to 'C' if no text
            } else if (line.match(/^oC/)) {
              // oC -> C)
              optionLetter = 'C';
              optionText = line.replace(/^oC\s*/, '').trim() || 'C';
            } else if (line.match(/^©\)/)) {
              // © -> C)
              optionLetter = 'C';
              optionText = line.replace(/^©\)\s*/, '').trim();
            } else if (line.match(/^[A-D]\)/)) {
              // Standard format A), B), C), D)
              optionLetter = line.charAt(0);
              optionText = line.replace(/^[A-D]\)\s*/, '').replace(/\*$/, '').trim();
            } else if (line.match(/^([A-D])\s+(.+)/)) {
              // A B, B B format
              const match = line.match(/^([A-D])\s+(.+)/);
              optionLetter = match[1];
              optionText = match[2].trim();
            } else {
              // Fallback: try to extract any A-D letter
              const match = line.match(/([A-D])/);
              if (match) {
                optionLetter = match[1];
                optionText = line.replace(/^[^A-D]*[A-D][^\w]*/, '').replace(/\*$/, '').trim();
                if (!optionText) {
                  optionText = optionLetter; // Default to the letter itself
                }
              }
            }

            if (optionLetter && optionText) {
              options.push(optionText);

              // Check for correct answer marker (* or x at end)
              if (line.includes('*') || line.match(/\*$/) || line.match(/x$/)) {
                correctAnswer = options.length - 1;
                console.log('Found correct answer at option index:', correctAnswer);
              }
              console.log('Found option:', {
                original: line,
                optionLetter,
                optionText,
                isCorrect: line.includes('*') || line.match(/x$/)
              });
            } else {
              // If we can't parse it as an option, treat it as question text
              console.log('Could not parse as option, treating as question text:', line);
              if (currentQuestion !== null) {
                questionLines.push(line.trim());
              }
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
          // Apply indentation restoration for code questions (same as Excel/Word processing)
          let questionText;
          if (needsFormatPreservation(questionLines.join('\n'))) {
            const restoredLines = restoreIndentationForAllLanguages(questionLines);
            questionText = restoredLines.join('\n');
          } else {
            questionText = questionLines.join('\n');
          }

          // Process question text with HTML formatting for perfect preservation
          const formattedQuestion = processTextWithHtmlFormatting(questionText);

          questions.push({
            question: formattedQuestion,
            options,
            correctAnswer: correctAnswer !== -1 ? correctAnswer : 0,
            marks: currentQuestionData.marks,
            negativeMarks: currentQuestionData.negativeMarks
          });
        }
      } catch (ocrError) {
        console.error('OCR error for image:', ocrError);
        // Continue with next image
      }
    }

    if (questions.length === 0) {
      return res.status(400).json({ message: 'No valid questions could be extracted from the images' });
    }

    console.log('Sending questions to frontend:', questions);
    res.json({ questions });
  } catch (error) {
    console.error('Error parsing image quiz:', error);
    res.status(500).json({ message: 'Failed to process images', error: error.message });
  }
});

// Handle Image quiz upload
router.post('/image', auth, authorize('faculty', 'admin', 'event'), upload.array('images'), async (req, res) => {
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
      } catch (ocrError) {
        console.error('OCR error for image:', ocrError);
        // Continue with next image
      }
    }

    if (questions.length === 0) {
      return res.status(400).json({ message: 'No valid questions could be extracted from the images' });
    }

    const quizData = {
      ...JSON.parse(req.body.quizDetails),
      questions,
      createdBy: req.user._id
    };

    const quiz = new Quiz(quizData);
    await quiz.save();

    res.status(201).json(quiz);
  } catch (error) {
    console.error('Error processing image quiz:', error);
    res.status(500).json({ message: 'Failed to process images', error: error.message });
  }
});

// Delete a student's quiz submission (faculty only)
router.delete('/:quizId/submissions/:studentId', auth, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if faculty owns this quiz (skip check for admin)
    if (req.user.role === 'faculty' && quiz.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied. Not your quiz.' });
    }

    const submission = await QuizSubmission.findOne({
      quiz: req.params.quizId,
      student: req.params.studentId,
      isDeleted: false
    });

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Check if already deleted
    if (submission.isDeleted) {
      return res.status(400).json({ message: 'Submission is already deleted' });
    }

    // Soft delete the submission
    submission.isDeleted = true;
    submission.deletedAt = new Date();
    submission.deletedBy = req.user._id;
    submission.deletionReason = 'Submission deleted by faculty';
    await submission.save();

    res.json({
      message: 'Submission deleted successfully',
      deletedSubmission: {
        studentId: req.params.studentId,
        quizId: req.params.quizId,
        score: submission.totalMarks
      }
    });
  } catch (error) {
    console.error('Error deleting submission:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Allow reattempt for a student (faculty only)
router.post('/:quizId/reattempt', auth, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const { studentId, email } = req.body;

    if (!studentId) {
      return res.status(400).json({ message: 'Student ID is required' });
    }

    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if faculty owns this quiz (skip check for admin)
    if (req.user.role === 'faculty' && quiz.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied. Not your quiz.' });
    }

    // Soft delete existing submission to allow reattempt
    const existingSubmission = await QuizSubmission.findOne({
      quiz: req.params.quizId,
      student: studentId,
      isDeleted: false
    });

    if (!existingSubmission) {
      return res.status(404).json({ message: 'No submission found to reset' });
    }

    // Soft delete the submission
    existingSubmission.isDeleted = true;
    existingSubmission.deletedAt = new Date();
    existingSubmission.deletedBy = req.user._id;
    existingSubmission.deletionReason = 'Submission deleted by faculty';
    await existingSubmission.save();

    res.json({
      message: 'Reattempt enabled successfully',
      studentId,
      quizId: req.params.quizId,
      previousScore: existingSubmission.totalMarks
    });

  } catch (error) {
    console.error('Error enabling reattempt:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Allow bulk reattempt for multiple students (faculty only)
router.post('/:quizId/bulk-reattempt', auth, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const { studentIds, emails } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: 'Student IDs array is required' });
    }

    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if faculty owns this quiz (skip check for admin)
    if (req.user.role === 'faculty' && quiz.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied. Not your quiz.' });
    }

    // Soft delete existing submissions for all selected students
    const deletedSubmissions = await QuizSubmission.updateMany(
      {
        quiz: req.params.quizId,
        student: { $in: studentIds },
        isDeleted: false
      },
      {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: req.user._id,
        deletionReason: 'Submission deleted by faculty'
      }
    );

    res.json({
      message: `Bulk reattempt enabled successfully for ${studentIds.length} students`,
      studentsCount: studentIds.length,
      deletedSubmissions: deletedSubmissions.modifiedCount,
      quizId: req.params.quizId
    });

  } catch (error) {
    console.error('Error enabling bulk reattempt:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;