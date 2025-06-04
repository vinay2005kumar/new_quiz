const express = require('express');
const router = express.Router();
const Quiz = require('../models/Quiz');
const { auth } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const User = require('../models/User');

// Get all event quizzes
router.get('/', auth, authorize(['event', 'admin']), async (req, res) => {
  try {
    const query = { type: 'event' };
    
    // If not admin, only show own quizzes
    if (req.userRole !== 'admin') {
      query.createdBy = req.user._id;
    }

    const quizzes = await Quiz.find(query)
      .sort({ createdAt: -1 });
    
    console.log('Fetched event quizzes:', quizzes.length);
    res.json(quizzes);
  } catch (error) {
    console.error('Error fetching event quizzes:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new event quiz
router.post('/', auth, authorize(['event', 'admin']), async (req, res) => {
  try {
    console.log('Creating event quiz with data:', req.body);

    // Validate required fields
    const { title, duration, startTime, endTime } = req.body;
    if (!title || !duration || !startTime || !endTime) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate dates
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (end <= start) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }

    // Prepare quiz data with eligibility
    const quizData = {
      ...req.body,
      type: 'event',
      createdBy: req.user._id,
      eligibility: {
        departments: req.body.eligibility?.departments || ['all'],
        years: req.body.eligibility?.years || ['all'],
        semesters: req.body.eligibility?.semesters || ['all'],
        sections: req.body.eligibility?.sections || ['all']
      }
    };

    console.log('Final quiz data:', quizData);

    const quiz = new Quiz(quizData);
    await quiz.save();

    console.log('Created new event quiz:', quiz._id);
    res.status(201).json(quiz);
  } catch (error) {
    console.error('Error creating event quiz:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get event quiz by ID
router.get('/:id', auth, authorize(['event', 'admin']), async (req, res) => {
  try {
    const query = { 
      _id: req.params.id,
      type: 'event'
    };

    // If not admin, only show own quizzes
    if (req.userRole !== 'admin') {
      query.createdBy = req.user._id;
    }

    const quiz = await Quiz.findOne(query);
    
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    
    res.json(quiz);
  } catch (error) {
    console.error('Error fetching event quiz:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update event quiz
router.put('/:id', auth, authorize(['event', 'admin']), async (req, res) => {
  try {
    const query = { 
      _id: req.params.id,
      type: 'event'
    };

    // If not admin, only update own quizzes
    if (req.userRole !== 'admin') {
      query.createdBy = req.user._id;
    }

    const quiz = await Quiz.findOneAndUpdate(
      query,
      { ...req.body, type: 'event' },
      { new: true }
    );

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    res.json(quiz);
  } catch (error) {
    console.error('Error updating event quiz:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete event quiz
router.delete('/:id', auth, authorize(['event', 'admin']), async (req, res) => {
  try {
    const query = { 
      _id: req.params.id,
      type: 'event'
    };

    // If not admin, only delete own quizzes
    if (req.userRole !== 'admin') {
      query.createdBy = req.user._id;
    }

    const quiz = await Quiz.findOneAndDelete(query);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    console.error('Error deleting event quiz:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get event quiz submissions
router.get('/:id/submissions', auth, authorize(['event', 'admin']), async (req, res) => {
  try {
    const query = { 
      _id: req.params.id,
      type: 'event'
    };

    // If not admin, only show own quiz submissions
    if (req.userRole !== 'admin') {
      query.createdBy = req.user._id;
    }

    const quiz = await Quiz.findOne(query)
      .populate({
        path: 'submissions',
        populate: {
          path: 'student',
          select: 'name email college department year rollNumber'
        }
      });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Transform submissions data to include all necessary details
    const submissions = quiz.submissions.map(submission => ({
      student: {
        _id: submission.student?._id,
        name: submission.student?.name || 'N/A',
        email: submission.student?.email || 'N/A',
        college: submission.student?.college || 'N/A',
        department: submission.student?.department || 'N/A',
        year: submission.student?.year || 'N/A',
        rollNumber: submission.student?.rollNumber || 'N/A'
      },
      status: submission.status,
      totalMarks: submission.totalMarks || 0,
      duration: submission.duration || null,
      startTime: submission.startTime || null,
      submitTime: submission.submitTime || null,
      answers: submission.answers || []
    }));

    res.json(submissions);
  } catch (error) {
    console.error('Error fetching event quiz submissions:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get individual submission
router.get('/:quizId/submission/:studentId', auth, authorize(['event', 'admin']), async (req, res) => {
  try {
    const query = { 
      _id: req.params.quizId,
      type: 'event'
    };

    // If not admin, only show own quiz submissions
    if (req.userRole !== 'admin') {
      query.createdBy = req.user._id;
    }

    const quiz = await Quiz.findOne(query);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    const submission = quiz.submissions.find(sub => 
      sub.student.toString() === req.params.studentId
    );

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Get student details
    const student = await User.findById(req.params.studentId)
      .select('name email college department year rollNumber');

    // Format submission data
    const formattedSubmission = {
      student: {
        _id: student._id,
        name: student.name || 'N/A',
        email: student.email || 'N/A',
        college: student.college || 'N/A',
        department: student.department || 'N/A',
        year: student.year || 'N/A',
        rollNumber: student.rollNumber || 'N/A'
      },
      quiz: {
        title: quiz.title,
        totalMarks: quiz.totalMarks,
        questions: quiz.questions
      },
      status: submission.status,
      totalMarks: submission.totalMarks || 0,
      duration: submission.duration || null,
      startTime: submission.startTime || null,
      submitTime: submission.submitTime || null,
      answers: submission.answers || []
    };

    res.json(formattedSubmission);
  } catch (error) {
    console.error('Error fetching submission:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 