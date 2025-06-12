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

// Get public event quizzes (no authentication required) - MUST BE BEFORE /:id route
router.get('/public', async (req, res) => {
  try {
    console.log('Fetching public event quizzes...');

    const quizzes = await Quiz.find({
      type: 'event',
      status: { $in: ['published', 'upcoming'] },
      registrationEnabled: true
    })
    .populate('createdBy', 'name email')
    .select('-questions.correctAnswer -questions.explanation') // Hide answers for security
    .sort({ startTime: 1 });

    console.log(`Found ${quizzes.length} public event quizzes`);
    res.json(quizzes);
  } catch (error) {
    console.error('Error fetching public event quizzes:', error);
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

// Register for event quiz (no authentication required) - Enhanced for team support
router.post('/:id/register', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      // Individual registration fields
      name, email, college, department, year, section, phoneNumber, rollNumber, admissionNumber,
      // Team registration fields
      isTeamRegistration, teamName, teamLeader, teamMembers
    } = req.body;

    console.log('Registration request for quiz:', id);
    console.log('Registration type:', isTeamRegistration ? 'Team' : 'Individual');

    // Find the quiz
    const quiz = await Quiz.findById(id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if quiz allows registration
    if (!quiz.registrationEnabled) {
      return res.status(400).json({ message: 'Registration is not enabled for this quiz' });
    }

    // Check if registration is still open
    const now = new Date();
    if (quiz.startTime <= now) {
      return res.status(400).json({ message: 'Registration is closed. Quiz has already started.' });
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
      if (!teamLeader.name || !teamLeader.email || !teamLeader.college) {
        return res.status(400).json({
          message: 'Team leader name, email, and college are required'
        });
      }

      // Validate team members
      for (let i = 0; i < teamMembers.length; i++) {
        const member = teamMembers[i];
        if (!member.name || !member.email || !member.college) {
          return res.status(400).json({
            message: `Team member ${i + 1} must have name, email, and college`
          });
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

      // For college-only quizzes, check admission number uniqueness
      if (quiz.participantTypes?.includes('college') && !quiz.participantTypes?.includes('external')) {
        const allAdmissionNumbers = [
          teamLeader.admissionNumber,
          ...teamMembers.map(m => m.admissionNumber)
        ].filter(Boolean);

        const existingAdmissionNumbers = quiz.registrations.flatMap(reg => {
          if (reg.isTeamRegistration) {
            return [reg.teamLeader.admissionNumber, ...reg.teamMembers.map(m => m.admissionNumber)];
          }
          return [reg.admissionNumber];
        }).filter(Boolean);

        const duplicateAdmission = allAdmissionNumbers.find(num => existingAdmissionNumbers.includes(num));
        if (duplicateAdmission) {
          return res.status(400).json({
            message: `Admission number ${duplicateAdmission} is already registered for this quiz`
          });
        }
      }

      registration = {
        isTeamRegistration: true,
        teamName,
        teamLeader,
        teamMembers,
        registeredAt: new Date(),
        isSpotRegistration: false
      };
    } else {
      // Individual registration validation
      if (!name || !email || !college) {
        return res.status(400).json({
          message: 'Name, email, and college are required'
        });
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

      // For college-only quizzes, check admission number uniqueness
      if (admissionNumber && quiz.participantTypes?.includes('college') && !quiz.participantTypes?.includes('external')) {
        const existingAdmissionNumbers = quiz.registrations.flatMap(reg => {
          if (reg.isTeamRegistration) {
            return [reg.teamLeader.admissionNumber, ...reg.teamMembers.map(m => m.admissionNumber)];
          }
          return [reg.admissionNumber];
        }).filter(Boolean);

        if (existingAdmissionNumbers.includes(admissionNumber)) {
          return res.status(400).json({
            message: `Admission number ${admissionNumber} is already registered for this quiz`
          });
        }
      }

      registration = {
        name,
        email,
        college,
        department,
        year,
        section,
        phoneNumber,
        rollNumber,
        admissionNumber,
        isTeamRegistration: false,
        registeredAt: new Date(),
        isSpotRegistration: false
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

    console.log('Registration successful:', isTeamRegistration ? `Team: ${teamName}` : `Individual: ${email}`);
    res.status(201).json({
      message: 'Registration successful',
      registrationId: quiz.registrations[quiz.registrations.length - 1]._id,
      type: isTeamRegistration ? 'team' : 'individual'
    });
  } catch (error) {
    console.error('Error registering for event quiz:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;