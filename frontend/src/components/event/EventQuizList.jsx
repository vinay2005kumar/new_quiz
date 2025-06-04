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
import { Add as AddIcon } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import api from '../../config/axios';
import EventQuizCard from './EventQuizCard';

const EventQuizList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        setLoading(true);
        console.log('Fetching quizzes...');
        const response = await api.get('/api/event-quiz');
        console.log('Response:', response);
        setQuizzes(response);
      } catch (error) {
        console.error('Error fetching event quizzes:', error);
        setError(error.response?.data?.message || 'Failed to fetch event quizzes');
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, []);

  const handleDelete = async (quizId) => {
    try {
      await api.delete(`/api/event-quiz/${quizId}`);
      setQuizzes(quizzes.filter(quiz => quiz._id !== quizId));
    } catch (error) {
      console.error('Error deleting quiz:', error);
      setError(error.response?.data?.message || 'Failed to delete quiz');
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

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
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