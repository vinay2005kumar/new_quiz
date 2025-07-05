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
  Chip,
  useTheme,
  useMediaQuery
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    fetchSubmittedQuizzes();
  }, []);

  const fetchSubmittedQuizzes = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('🚀 REVIEW QUIZZES - FETCHING SUBMISSIONS...');
      const submissionsResponse = await api.get('/api/quiz/my-submissions');

      // Handle different response formats (same as QuizList)
      const responseData = submissionsResponse.data || submissionsResponse || [];

      console.log('📥 REVIEW QUIZZES - FRONTEND RECEIVED:', {
        fullResponse: submissionsResponse,
        responseData: responseData,
        dataType: typeof responseData,
        isArray: Array.isArray(responseData),
        length: Array.isArray(responseData) ? responseData.length : 'N/A'
      });

      if (Array.isArray(responseData)) {
        // Filter for evaluated submissions only and process them
        const validSubmissions = responseData
          .filter(submission => {
            const isEvaluated = submission.status === 'evaluated';
            const hasQuiz = !!submission.quiz;

            console.log('📝 REVIEW QUIZZES - FILTERING SUBMISSION:', {
              hasQuiz: hasQuiz,
              status: submission.status,
              isEvaluated: isEvaluated,
              quizTitle: submission.quiz?.title,
              willInclude: isEvaluated && hasQuiz
            });

            return isEvaluated && hasQuiz;
          })
          .map(submission => {
            const totalScore = Array.isArray(submission.answers)
              ? submission.answers.reduce((total, ans) => total + (Number(ans.marks) || 0), 0)
              : 0;

            const processedSubmission = {
              quizId: submission.quiz._id,
              quiz: submission.quiz,
              ...submission,
              totalScore
            };

            console.log('✅ REVIEW QUIZZES - PROCESSED SUBMISSION:', {
              quizTitle: submission.quiz.title,
              status: submission.status,
              totalScore: totalScore
            });

            return processedSubmission;
          });

        console.log('🎯 REVIEW QUIZZES - FINAL EVALUATED SUBMISSIONS:', {
          total: validSubmissions.length,
          submissions: validSubmissions.map(s => ({ title: s.quiz.title, status: s.status }))
        });

        setSubmittedQuizzes(validSubmissions);
      } else {
        console.log('❌ REVIEW QUIZZES - RESPONSE DATA IS NOT ARRAY:', responseData);
        setSubmittedQuizzes([]);
      }
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
      <Card sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: isMobile ? 1 : 2
      }}>
        <CardContent sx={{
          flexGrow: 1,
          p: isMobile ? 1.5 : 2
        }}>
          <Typography
            variant={isMobile ? "subtitle1" : "h6"}
            gutterBottom
            sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
          >
            {quiz.title}
          </Typography>
          <Stack spacing={isMobile ? 0.5 : 1}>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                display: 'flex',
                alignItems: 'center',
                fontSize: { xs: '0.75rem', sm: '0.875rem' }
              }}
            >
              <ClassIcon sx={{ mr: 1, fontSize: { xs: '1rem', sm: '1.2rem' } }} />
              Subject: {getSubjectDisplay(quiz.subject)}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                display: 'flex',
                alignItems: 'center',
                fontSize: { xs: '0.75rem', sm: '0.875rem' }
              }}
            >
              <AccessTimeIcon sx={{ mr: 1, fontSize: { xs: '1rem', sm: '1.2rem' } }} />
              Duration: {quiz.duration} minutes
            </Typography>
            <Typography variant="body2" sx={{
              display: 'flex',
              alignItems: 'center',
              color: quiz?.negativeMarkingEnabled ? 'warning.main' : 'success.main',
              fontWeight: 'medium'
            }}>
              {quiz?.negativeMarkingEnabled ? '⚠️' : '✅'}
              <Box component="span" sx={{ ml: 1 }}>
                Negative Marking: {quiz?.negativeMarkingEnabled ? 'Enabled' : 'Disabled'}
              </Box>
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
        <CardActions sx={{ p: isMobile ? 1 : 2 }}>
          <Button
            fullWidth
            variant="contained"
            color="primary"
            startIcon={<AssessmentIcon sx={{ fontSize: { xs: '1rem', sm: '1.2rem' } }} />}
            onClick={() => navigate(`/student/quizzes/${quiz._id}/review`)}
            sx={{
              fontSize: { xs: '0.875rem', sm: '1rem' },
              py: { xs: 1, sm: 1.5 }
            }}
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
    <Container
      maxWidth="xl"
      sx={{
        mt: { xs: 2, sm: 3, md: 4 },
        mb: { xs: 2, sm: 3, md: 4 },
        px: { xs: 1, sm: 2, md: 3 }
      }}
    >
      <Typography
        variant={isMobile ? "h5" : "h4"}
        gutterBottom
        sx={{
          fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' },
          mb: { xs: 2, sm: 3 }
        }}
      >
        Review Quizzes
      </Typography>

      {error && (
        <Alert
          severity="error"
          sx={{
            mb: { xs: 1.5, sm: 2 },
            fontSize: { xs: '0.875rem', sm: '1rem' }
          }}
        >
          {error}
        </Alert>
      )}

      {submittedQuizzes.length === 0 ? (
        <Paper sx={{
          p: { xs: 2, sm: 3 },
          textAlign: 'center',
          borderRadius: isMobile ? 1 : 2
        }}>
          <Typography
            variant={isMobile ? "subtitle1" : "h6"}
            color="text.secondary"
            sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
          >
            No submitted quizzes found
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{
              mt: 1,
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }}
          >
            Once you complete quizzes, they will appear here for review
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={isMobile ? 2 : 3}>
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