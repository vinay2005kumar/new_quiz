import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Alert,
  CircularProgress,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import api from '../../config/axios';

const EventPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    // Check if user exists and has event role
    if (!user || user.role !== 'event') {
      navigate('/login');
      return;
    }
    fetchEventQuizzes();
  }, [user, navigate]);

  const handleApiError = (error) => {
    console.error('API Error:', error);
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Unauthorized or Forbidden - clear session and redirect to login
      logout();
      navigate('/login');
    } else {
      setError('Failed to fetch quizzes. Please try again later.');
    }
  };

  const fetchEventQuizzes = async () => {
    try {
      setLoading(true);
      setError('');
      
      // First verify the user session is still valid
      try {
        await api.get('/api/auth/me');
      } catch (error) {
        handleApiError(error);
        return;
      }

      // Then fetch the quizzes
      const response = await api.get('/api/event-quiz/quizzes');
      if (Array.isArray(response)) {
        setQuizzes(response);
      } else if (response && Array.isArray(response.quizzes)) {
        setQuizzes(response.quizzes);
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (quiz) => {
    const now = new Date();
    const startTime = new Date(quiz.startTime);
    const endTime = new Date(quiz.endTime);

    if (now < startTime) return 'info'; // Upcoming
    if (now >= startTime && now <= endTime) return 'success'; // Active
    return 'error'; // Ended
  };

  const getStatusText = (quiz) => {
    const now = new Date();
    const startTime = new Date(quiz.startTime);
    const endTime = new Date(quiz.endTime);

    if (now < startTime) return 'Upcoming';
    if (now >= startTime && now <= endTime) return 'Active';
    return 'Ended';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container 
      maxWidth="lg" 
      sx={{ 
        mt: { xs: 2, sm: 3, md: 4 }, 
        mb: { xs: 2, sm: 3, md: 4 },
        px: { xs: 1, sm: 2, md: 3 }
      }}
    >
      <Box sx={{ mb: { xs: 2, sm: 3, md: 4 } }}>
        <Typography 
          variant={isMobile ? "h5" : "h4"} 
          gutterBottom
          sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}
        >
          Event Quiz Dashboard
        </Typography>
        <Typography 
          variant="subtitle1" 
          color="text.secondary"
          sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
        >
          {user?.department ? `Department: ${user.department}` : 'Organization Events'}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={isMobile ? 2 : 3}>
        {quizzes.map((quiz) => (
          <Grid item xs={12} md={6} lg={4} key={quiz._id}>
            <Card sx={{ 
              height: '100%',
              borderRadius: { xs: 1, sm: 2 }
            }}>
              <CardContent sx={{ 
                p: { xs: 1.5, sm: 2 },
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <Typography 
                  variant={isMobile ? "h6" : "h6"} 
                  gutterBottom
                  sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
                >
                  {quiz.title}
                </Typography>
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  gutterBottom
                  sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                >
                  Subject: {quiz.subject}
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Chip 
                    label={getStatusText(quiz)}
                    color={getStatusColor(quiz)}
                    size={isMobile ? "small" : "small"}
                    sx={{ mr: 1, mb: 1 }}
                  />
                  <Chip 
                    label={`Duration: ${quiz.duration} mins`}
                    variant="outlined"
                    size={isMobile ? "small" : "small"}
                    sx={{ mb: 1 }}
                  />
                </Box>
                <Box sx={{ mt: 2 }}>
                  <Typography 
                    variant="body2"
                    sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                  >
                    Start: {new Date(quiz.startTime).toLocaleString()}
                  </Typography>
                  <Typography 
                    variant="body2"
                    sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                  >
                    End: {new Date(quiz.endTime).toLocaleString()}
                  </Typography>
                </Box>
              </CardContent>
              <CardActions sx={{ 
                p: { xs: 1, sm: 2 },
                pt: 0
              }}>
                <Button 
                  size={isMobile ? "small" : "small"} 
                  color="primary"
                  onClick={() => {/* TODO: Add view results handler */}}
                  fullWidth={isMobile}
                  sx={{ 
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    mr: isMobile ? 0 : 1
                  }}
                >
                  View Results
                </Button>
                <Button 
                  size={isMobile ? "small" : "small"} 
                  color="primary"
                  onClick={() => {/* TODO: Add view details handler */}}
                  fullWidth={isMobile}
                  sx={{ 
                    fontSize: { xs: '0.75rem', sm: '0.875rem' }
                  }}
                >
                  View Details
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default EventPage; 