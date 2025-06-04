const express = require('express');
const router = express.Router();
const Quiz = require('../../models/Quiz');
const { isAdmin } = require('../../middleware/auth');

// Get all quizzes (both academic and event)
router.get('/', isAdmin, async (req, res) => {
  try {
    const quizzes = await Quiz.find()
      .populate('subject', 'name code')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    
    res.json(quizzes);
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).json({ message: 'Failed to fetch quizzes' });
  }
});

// Get quiz statistics
router.get('/statistics', isAdmin, async (req, res) => {
  try {
    const { department, year, section } = req.query;
    
    // Build filter based on query parameters
    const filter = {};
    if (department) filter['allowedGroups.department'] = department;
    if (year) filter['allowedGroups.year'] = parseInt(year);
    if (section) filter['allowedGroups.section'] = section;

    // Get all quizzes matching the filter
    const quizzes = await Quiz.find(filter)
      .populate('submissions')
      .populate('subject', 'name code');

    // Calculate statistics
    const stats = {
      totalStudents: 0,
      submittedCount: 0,
      averageScore: 0,
      scoreDistribution: {
        excellent: 0,
        good: 0,
        average: 0,
        poor: 0
      },
      subjectWiseStats: {},
      departmentWiseStats: {},
      yearWiseStats: {}
    };

    quizzes.forEach(quiz => {
      // Update total students and submissions
      stats.totalStudents += quiz.totalAuthorizedStudents || 0;
      stats.submittedCount += quiz.submissions?.length || 0;

      // Calculate scores and distributions
      quiz.submissions?.forEach(submission => {
        const score = submission.score || 0;
        const percentage = (score / quiz.totalMarks) * 100;

        // Update score distribution
        if (percentage >= 90) stats.scoreDistribution.excellent++;
        else if (percentage >= 70) stats.scoreDistribution.good++;
        else if (percentage >= 50) stats.scoreDistribution.average++;
        else stats.scoreDistribution.poor++;

        // Update subject-wise statistics
        const subjectKey = quiz.subject?.code || 'unknown';
        if (!stats.subjectWiseStats[subjectKey]) {
          stats.subjectWiseStats[subjectKey] = {
            code: quiz.subject?.code,
            name: quiz.subject?.name,
            totalSubmissions: 0,
            totalScore: 0
          };
        }
        stats.subjectWiseStats[subjectKey].totalSubmissions++;
        stats.subjectWiseStats[subjectKey].totalScore += score;

        // Update department-wise statistics
        quiz.allowedGroups.forEach(group => {
          const deptKey = group.department;
          if (!stats.departmentWiseStats[deptKey]) {
            stats.departmentWiseStats[deptKey] = {
              totalSubmissions: 0,
              totalScore: 0
            };
          }
          stats.departmentWiseStats[deptKey].totalSubmissions++;
          stats.departmentWiseStats[deptKey].totalScore += score;
        });

        // Update year-wise statistics
        quiz.allowedGroups.forEach(group => {
          const yearKey = group.year.toString();
          if (!stats.yearWiseStats[yearKey]) {
            stats.yearWiseStats[yearKey] = {
              totalSubmissions: 0,
              totalScore: 0
            };
          }
          stats.yearWiseStats[yearKey].totalSubmissions++;
          stats.yearWiseStats[yearKey].totalScore += score;
        });
      });
    });

    // Calculate averages
    if (stats.submittedCount > 0) {
      stats.averageScore = stats.totalScore / stats.submittedCount;
    }

    // Calculate averages for subject-wise stats
    Object.keys(stats.subjectWiseStats).forEach(key => {
      const subject = stats.subjectWiseStats[key];
      if (subject.totalSubmissions > 0) {
        subject.averageScore = subject.totalScore / subject.totalSubmissions;
      }
    });

    // Calculate averages for department-wise stats
    Object.keys(stats.departmentWiseStats).forEach(key => {
      const dept = stats.departmentWiseStats[key];
      if (dept.totalSubmissions > 0) {
        dept.averageScore = dept.totalScore / dept.totalSubmissions;
      }
    });

    // Calculate averages for year-wise stats
    Object.keys(stats.yearWiseStats).forEach(key => {
      const year = stats.yearWiseStats[key];
      if (year.totalSubmissions > 0) {
        year.averageScore = year.totalScore / year.totalSubmissions;
      }
    });

    res.json(stats);
  } catch (error) {
    console.error('Error fetching quiz statistics:', error);
    res.status(500).json({ message: 'Failed to fetch quiz statistics' });
  }
});

// Get a single quiz
router.get('/:id', isAdmin, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate('subject', 'name code')
      .populate('createdBy', 'name')
      .populate('submissions');
    
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    
    res.json(quiz);
  } catch (error) {
    console.error('Error fetching quiz:', error);
    res.status(500).json({ message: 'Failed to fetch quiz' });
  }
});

// Update a quiz
router.put('/:id', isAdmin, async (req, res) => {
  try {
    const quiz = await Quiz.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    
    res.json(quiz);
  } catch (error) {
    console.error('Error updating quiz:', error);
    res.status(500).json({ message: 'Failed to update quiz' });
  }
});

// Delete a quiz
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    const quiz = await Quiz.findByIdAndDelete(req.params.id);
    
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    
    res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    res.status(500).json({ message: 'Failed to delete quiz' });
  }
});

module.exports = router; 