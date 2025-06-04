import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Typography,
  Box,
  Alert,
  CircularProgress
} from '@mui/material';
import api from '../../config/axios';
import EventQuizCard from './EventQuizCard';

const EventActiveQuizzes = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchActiveQuizzes = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/event-quiz?status=active');
        setQuizzes(response);
      } catch (error) {
        console.error('Error fetching active quizzes:', error);
        setError(error.response?.data?.message || 'Failed to fetch active quizzes');
      } finally {
        setLoading(false);
      }
    };

    fetchActiveQuizzes();
  }, []);

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
        <Typography variant="h4" component="h1" gutterBottom>
          Active Event Quizzes
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {quizzes.length === 0 ? (
          <Alert severity="info">
            No active quizzes available.
          </Alert>
        ) : (
          <Grid 
            container 
            spacing={3} 
            sx={{ width: '100%', margin: '0 auto' }}
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
                <EventQuizCard 
                  quiz={quiz} 
                  showRegistration={true}
                  showStart={true}
                  showViewDetails={true}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Container>
  );
};

export default EventActiveQuizzes; 