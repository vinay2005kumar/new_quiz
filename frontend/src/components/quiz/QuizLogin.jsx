import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  Login as LoginIcon,
  Quiz as QuizIcon,
  AccessTime as TimeIcon,
  People as PeopleIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import api from '../../config/axios';

const QuizLogin = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [quizInfo, setQuizInfo] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('🔑 Attempting login with:', { username: formData.username, password: '***' });
      const response = await api.post(`/api/event-quiz/${quizId}/login`, formData);

      console.log('🔑 Login response:', response);
      console.log('🔑 Response data:', response.data);
      console.log('🔑 Response data type:', typeof response.data);

      // Handle different response formats
      let responseData = response.data;
      if (!responseData && response) {
        console.log('🔑 Using response directly as data is undefined');
        responseData = response;
      }

      if (!responseData) {
        console.error('🔑 No response data available');
        setError('Login response is empty. Please try again.');
        return;
      }

      console.log('🔑 Using response data:', responseData);

      // Store session info
      const sessionData = {
        sessionToken: responseData.sessionToken,
        quizId,
        participant: responseData.participant,
        loginTime: new Date().toISOString()
      };

      console.log('🔑 Storing session data:', sessionData);
      localStorage.setItem('quizSession', JSON.stringify(sessionData));

      // Navigate to authenticated quiz taking page
      const navigationState = {
        quizData: responseData.quiz,
        participant: responseData.participant,
        hasAttemptedQuiz: responseData.hasAttemptedQuiz,
        sessionToken: responseData.sessionToken
      };

      console.log('🔑 Navigating with state:', navigationState);
      console.log('🔑 Navigation URL:', `/quiz/${quizId}/take-authenticated`);

      navigate(`/quiz/${quizId}/take-authenticated`, {
        state: navigationState
      });

      console.log('🔑 Navigation completed');
    } catch (error) {
      console.error('🔑 Login error:', error);
      console.error('🔑 Error response:', error.response);

      // Check if it's an "already submitted" error with submission details
      if (error.response?.data?.submissionDetails) {
        const details = error.response.data.submissionDetails;
        const submittedDate = new Date(details.submittedAt).toLocaleString();
        setError(
          `You have already submitted this quiz on ${submittedDate}. ` +
          `Score: ${details.score}/${details.totalMarks}. ` +
          `Use the emergency password if you need to resubmit.`
        );
      } else {
        setError(error.response?.data?.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch quiz info for display
  const fetchQuizInfo = async () => {
    try {
      const response = await api.get(`/api/event-quiz/public`);
      console.log('Full response:', response);
      console.log('Response data:', response.data);
      console.log('Response data type:', typeof response.data);

      // Handle different response formats
      let quizzes = null;
      if (response.data) {
        quizzes = response.data;
      } else if (response) {
        // Sometimes the data might be directly in response
        quizzes = response;
      }

      if (quizzes && Array.isArray(quizzes)) {
        const quiz = quizzes.find(q => q._id === quizId);
        setQuizInfo(quiz);
        console.log('Found quiz:', quiz);
      } else {
        console.error('Invalid response format. Expected array, got:', typeof quizzes, quizzes);
        // Try to fetch individual quiz as fallback
        try {
          const individualResponse = await api.get(`/api/event-quiz/${quizId}/public-access`);
          console.log('Individual quiz response:', individualResponse);
          if (individualResponse.data && individualResponse.data.quiz) {
            setQuizInfo(individualResponse.data.quiz);
          }
        } catch (fallbackError) {
          console.error('Fallback fetch also failed:', fallbackError);
        }
      }
    } catch (error) {
      console.error('Error fetching quiz info:', error);
    }
  };

  // Fetch quiz info on component mount
  useEffect(() => {
    if (quizId) {
      fetchQuizInfo();
    }
  }, [quizId]);

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      {/* Back Button */}
      <Box sx={{ mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/events')}
          sx={{ mb: 2 }}
        >
          Back to Events
        </Button>
      </Box>

      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <QuizIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
        <Typography variant="h3" component="h1" gutterBottom>
          Quiz Login
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Enter your credentials to access the quiz
        </Typography>
      </Box>

      {/* Quiz Information Card */}
      {quizInfo && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom color="primary">
              {quizInfo.title}
            </Typography>
            <Typography variant="body1" paragraph color="text.secondary">
              {quizInfo.description}
            </Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TimeIcon sx={{ fontSize: 20, mr: 1, color: 'text.secondary' }} />
                <Typography variant="body2">
                  {formatDateTime(quizInfo.startTime)} - {formatDateTime(quizInfo.endTime)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TimeIcon sx={{ fontSize: 20, mr: 1, color: 'text.secondary' }} />
                <Typography variant="body2">
                  Duration: {quizInfo.duration} minutes
                </Typography>
              </Box>
              {quizInfo.participationMode === 'team' && (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <PeopleIcon sx={{ fontSize: 20, mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2">
                    Team Quiz ({quizInfo.teamSize} members)
                  </Typography>
                </Box>
              )}
            </Box>

            {quizInfo.instructions && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" gutterBottom>
                  Instructions:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {quizInfo.instructions}
                </Typography>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Login Form */}
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom textAlign="center">
          Login to Quiz
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Email Address (Username)"
            name="username"
            type="email"
            value={formData.username}
            onChange={handleChange}
            required
            disabled={loading}
            placeholder="Enter your email address"
            sx={{ mb: 3 }}
            helperText="Use your email address as username"
          />

          <TextField
            fullWidth
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
            disabled={loading}
            sx={{ mb: 3 }}
            helperText="Enter the password provided in your registration email"
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading || !formData.username || !formData.password}
            startIcon={loading ? <CircularProgress size={20} /> : <LoginIcon />}
            sx={{ mt: 2, py: 1.5 }}
          >
            {loading ? 'Logging in...' : 'Login to Quiz'}
          </Button>
        </Box>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Don't have credentials? Check your registration email or contact support.
          </Typography>
        </Box>
      </Paper>

      {/* Important Notes */}
      <Card sx={{ mt: 4, bgcolor: 'warning.light' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom color="warning.dark">
            ⚠️ Important Notes
          </Typography>
          <Typography variant="body2" component="div">
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>Make sure you have a stable internet connection</li>
              <li>Use a desktop or laptop for the best experience</li>
              <li>Do not refresh the page during the quiz</li>
              <li>For team quizzes, only one member should login and take the quiz</li>
              <li>Contact support immediately if you face any technical issues</li>
            </ul>
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
};

export default QuizLogin;
