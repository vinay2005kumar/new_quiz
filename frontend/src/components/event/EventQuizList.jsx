import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Box,
  TextField,
  Paper,
  useTheme,
  useMediaQuery,
  Stack
} from '@mui/material';
import { Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import api from '../../config/axios';
import EventQuizCard from './EventQuizCard';

const EventQuizList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [searchTitle, setSearchTitle] = useState('');

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      console.log('Fetching quizzes...');
      const response = await api.get('/api/event-quiz');
      console.log('Response:', response);
      setQuizzes(response);
      setError(''); // Clear any previous errors
      setInfoMessage(''); // Clear any previous info messages
    } catch (error) {
      console.error('Error fetching event quizzes:', error);
      setError(error.response?.data?.message || 'Failed to fetch event quizzes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  // Filter quizzes by search title
  const getFilteredQuizzes = () => {
    if (!searchTitle.trim()) return quizzes;

    return quizzes.filter(quiz =>
      quiz.title?.toLowerCase().includes(searchTitle.toLowerCase().trim())
    );
  };

  const handleDelete = async (quizId) => {
    try {
      console.log('🗑️ Deleting quiz:', quizId);
      await api.delete(`/api/event-quiz/${quizId}`);
      console.log('✅ Quiz deleted successfully, updating UI...');

      // Use functional update to ensure we have the latest state
      setQuizzes(prevQuizzes => {
        const updatedQuizzes = prevQuizzes.filter(quiz => quiz._id !== quizId);
        console.log('📊 Updated quiz list:', updatedQuizzes.length, 'quizzes remaining');
        return updatedQuizzes;
      });

      // Clear any previous errors
      setError('');

      console.log('🎉 Quiz deletion completed successfully');
    } catch (error) {
      console.error('❌ Error deleting quiz:', error);

      // Handle specific error cases
      if (error.response?.status === 404) {
        console.log('📝 Quiz not found (404) - removing from UI and refreshing list');

        // Remove from UI since it doesn't exist in database
        setQuizzes(prevQuizzes => {
          const updatedQuizzes = prevQuizzes.filter(quiz => quiz._id !== quizId);
          console.log('📊 Removed non-existent quiz, updated list:', updatedQuizzes.length, 'quizzes remaining');
          return updatedQuizzes;
        });

        // Show info message instead of error
        setInfoMessage('Quiz was already deleted. The list has been updated.');
        setError(''); // Clear any error messages

        // Clear the info message after 3 seconds
        setTimeout(() => setInfoMessage(''), 3000);

        // Refresh the entire list to ensure consistency
        setTimeout(() => {
          console.log('🔄 Refreshing quiz list to ensure consistency...');
          fetchQuizzes();
        }, 1000);
      } else {
        // Handle other errors normally
        setError(error.response?.data?.message || 'Failed to delete quiz');
      }
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container 
      maxWidth={false} 
      sx={{ 
        mt: { xs: 2, sm: 3, md: 4 }, 
        mb: { xs: 2, sm: 3, md: 4 }, 
        px: { xs: 1, sm: 2, md: 4 } 
      }}
    >
      <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between', 
          alignItems: { xs: 'stretch', sm: 'center' }, 
          mb: { xs: 2, sm: 3, md: 4 },
          gap: { xs: 1, sm: 0 }
        }}>
          <Typography 
            variant={isMobile ? "h5" : "h4"} 
            component="h1"
            sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}
          >
            Event Quizzes
          </Typography>
          <Stack 
            direction={isMobile ? "column" : "row"} 
            spacing={isMobile ? 1 : 2}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchQuizzes}
              disabled={loading}
              fullWidth={isMobile}
              sx={{ 
                fontSize: { xs: '0.875rem', sm: '1rem' },
                py: { xs: 1, sm: 1.5 }
              }}
            >
              Refresh
            </Button>
            {user.role === 'event' && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => navigate('/event/quiz/create')}
                fullWidth={isMobile}
                sx={{ 
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  py: { xs: 1, sm: 1.5 }
                }}
              >
                Create Quiz
              </Button>
            )}
          </Stack>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {infoMessage && (
          <Alert severity="info" sx={{ mb: 3 }}>
            {infoMessage}
          </Alert>
        )}

        {/* Search Filter - Fixed Width */}
        <Paper sx={{
          p: { xs: 1.5, sm: 2 },
          mb: { xs: 2, sm: 3 },
          borderRadius: { xs: 1, sm: 2 },
          width: '100%',
          maxWidth: '1200px',
          mx: 'auto'
        }}>
          <TextField
            fullWidth
            label="Search quizzes by title..."
            variant="outlined"
            value={searchTitle}
            onChange={(e) => setSearchTitle(e.target.value)}
            placeholder="Enter quiz title to search"
            size={isMobile ? "small" : "medium"}
            InputProps={{
              startAdornment: (
                <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                  🔍
                </Box>
              ),
            }}
          />
        </Paper>

        {getFilteredQuizzes().length === 0 ? (
          <Alert severity="info">
            {searchTitle.trim() ? 'No event quizzes match your search.' : 'No event quizzes found.'}
          </Alert>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)'
              },
              gap: { xs: 2, sm: 3 },
              width: '100%',
              maxWidth: '1200px',
              margin: '0 auto'
            }}
          >
            {getFilteredQuizzes().map((quiz) => (
              <Box
                key={quiz._id}
                sx={{
                  width: '100%',
                  maxWidth: { xs: '400px', sm: '100%', md: '100%' },
                  mx: { xs: 'auto', sm: 0 }
                }}
              >
                <EventQuizCard quiz={quiz} onDelete={handleDelete} />
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default EventQuizList; 