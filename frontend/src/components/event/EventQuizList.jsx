import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Box
} from '@mui/material';
import { Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import api from '../../config/axios';
import EventQuizCard from './EventQuizCard';

const EventQuizList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

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
    <Container maxWidth={false} sx={{ mt: 4, mb: 4, px: { xs: 2, sm: 3, md: 4 } }}>
      <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1">
            Event Quizzes
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchQuizzes}
              disabled={loading}
            >
              Refresh
            </Button>
            {user.role === 'event' && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => navigate('/event/quiz/create')}
              >
                Create Quiz
              </Button>
            )}
          </Box>
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

        {quizzes.length === 0 ? (
          <Alert severity="info">
            No event quizzes found.
          </Alert>
        ) : (
          <Grid 
            container 
            spacing={3} 
            sx={{ 
              width: '100%',
              margin: '0 auto'
            }}
          >
            {quizzes.map((quiz) => (
              <Grid 
                item 
                xs={12} 
                sm={6} 
                md={4} 
                key={quiz._id}
                sx={{
                  width: { md: '33.333%' },
                  flexShrink: 0
                }}
              >
                <EventQuizCard quiz={quiz} onDelete={handleDelete} />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Container>
  );
};

export default EventQuizList; 