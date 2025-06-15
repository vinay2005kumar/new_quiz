import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  CircularProgress,
  Alert,
  Paper,
  Stack,
  Chip
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import GroupIcon from '@mui/icons-material/Group';
import ClassIcon from '@mui/icons-material/Class';
import api from '../../config/axios';
import { useAuth } from '../../context/AuthContext';

const ReviewQuizzes = () => {
  const [submittedQuizzes, setSubmittedQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSubmittedQuizzes();
  }, []);

  const fetchSubmittedQuizzes = async () => {
    try {
      setLoading(true);
      setError('');

      // Use the same approach as QuizList.jsx for consistency
      // Fetch all submissions using the bulk endpoint
      const submissionsResponse = await api.get('/api/quiz/my-submissions');
      const submissions = Array.isArray(submissionsResponse.data) ? submissionsResponse.data : [];

      console.log('Review Quizzes - Fetched submissions:', submissions);
      console.log('Review Quizzes - Raw response structure:', {
        isArray: Array.isArray(submissions),
        length: submissions.length,
        firstSubmission: submissions[0],
        hasQuiz: submissions[0]?.quiz,
        hasAnswers: submissions[0]?.answers,
        submissionStatus: submissions[0]?.status
      });

      // Debug submissions for troubleshooting
      console.log('Review Quizzes - Submissions received:', {
        count: submissions.length,
        firstSubmission: submissions[0]
      });

      // Transform submissions to match the expected format
      const validSubmissions = submissions
        .filter(submission => {
          console.log('Filtering submission:', {
            hasQuiz: !!submission.quiz,
            status: submission.status,
            quizTitle: submission.quiz?.title
          });
          return submission.quiz && submission.status === 'evaluated';
        })
        .map(submission => {
          const totalScore = Array.isArray(submission.answers)
            ? submission.answers.reduce((total, ans) => total + (Number(ans.marks) || 0), 0)
            : 0;

          console.log('Processing submission:', {
            quizTitle: submission.quiz.title,
            hasAnswers: !!submission.answers,
            answersLength: submission.answers?.length,
            totalScore
          });

          return {
            quizId: submission.quiz._id,
            quiz: submission.quiz,
            ...submission,
            totalScore
          };
        });

      console.log('Review Quizzes - Valid submissions:', validSubmissions);
      setSubmittedQuizzes(validSubmissions);
    } catch (error) {
      console.error('Error fetching submitted quizzes:', error);
      setError('Failed to fetch submitted quizzes. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getSubjectDisplay = (subject) => {
    if (!subject) return 'N/A';
    if (typeof subject === 'string') return subject;
    if (subject.code && subject.name) {
      if (subject.code === subject.name) return subject.code;
      return `${subject.name} (${subject.code})`;
    }
    if (subject.name) return subject.name;
    if (subject.code) return subject.code;
    return 'N/A';
  };

  const renderQuizCard = (submission) => {
    const quiz = submission.quiz;
    const score = submission.totalScore;
    const maxScore = quiz.questions?.reduce((total, q) => total + q.marks, 0) || 0;
    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
    
    let performanceColor = 'error';
    if (percentage >= 90) performanceColor = 'success';
    else if (percentage >= 70) performanceColor = 'primary';
    else if (percentage >= 50) performanceColor = 'warning';

    return (
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flexGrow: 1 }}>
          <Typography variant="h6" gutterBottom>
            {quiz.title}
          </Typography>
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
              <ClassIcon sx={{ mr: 1, fontSize: '1.2rem' }} />
              Subject: {getSubjectDisplay(quiz.subject)}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
              <AccessTimeIcon sx={{ mr: 1, fontSize: '1.2rem' }} />
              Duration: {quiz.duration} minutes
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
              <GroupIcon sx={{ mr: 1, fontSize: '1.2rem' }} />
              {quiz.allowedGroups?.map(group => 
                `${group.department} - Year ${group.year} - Section ${group.section}`
              ).join(', ')}
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body1" gutterBottom>
                Submission Details:
              </Typography>
              <Stack spacing={1}>
                <Typography variant="body2">
                  Submitted: {formatDateTime(submission.submitTime)}
                </Typography>
                <Typography variant="body2">
                  Score: <Chip 
                    label={`${score}/${maxScore} (${percentage.toFixed(1)}%)`}
                    color={performanceColor}
                    size="small"
                  />
                </Typography>
              </Stack>
            </Box>
          </Stack>
        </CardContent>
        <CardActions>
          <Button
            fullWidth
            variant="contained"
            color="primary"
            startIcon={<AssessmentIcon />}
            onClick={() => navigate(`/student/quizzes/${quiz._id}/review`)}
          >
            View Details
          </Button>
        </CardActions>
      </Card>
    );
  };

  if (loading) {
    return (
      <Container sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Review Quizzes
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {submittedQuizzes.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No submitted quizzes found
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
            Once you complete quizzes, they will appear here for review
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {submittedQuizzes.map((submission) => (
            <Grid item xs={12} sm={6} md={4} key={submission.quizId}>
              {renderQuizCard(submission)}
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default ReviewQuizzes; 