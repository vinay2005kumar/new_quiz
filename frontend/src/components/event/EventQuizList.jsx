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
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Tabs,
  Tab
} from '@mui/material';
import { Add as AddIcon, Refresh as RefreshIcon, FilterList as FilterListIcon } from '@mui/icons-material';
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
  const [statusFilter, setStatusFilter] = useState('all');
  const [tabValue, setTabValue] = useState(0);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      //console.log('Fetching quizzes...');
      const response = await api.get('/api/event-quiz');
      //console.log('Response:', response);
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

  // Get quiz status
  const getQuizStatus = (quiz) => {
    const now = new Date();
    const startTime = new Date(quiz.startTime);
    const endTime = new Date(quiz.endTime);

    if (now < startTime) return 'upcoming';
    if (now >= startTime && now <= endTime) return 'active';
    return 'completed';
  };

  // Get status display info
  const getStatusInfo = (status) => {
    switch (status) {
      case 'upcoming':
        return { label: 'Upcoming', color: 'info' };
      case 'active':
        return { label: 'Active', color: 'success' };
      case 'completed':
        return { label: 'Completed', color: 'default' };
      default:
        return { label: 'Unknown', color: 'default' };
    }
  };

  // Categorize quizzes by status
  const categorizeQuizzes = () => {
    const upcoming = [];
    const active = [];
    const completed = [];

    quizzes.forEach(quiz => {
      const status = getQuizStatus(quiz);
      switch (status) {
        case 'upcoming':
          upcoming.push(quiz);
          break;
        case 'active':
          active.push(quiz);
          break;
        case 'completed':
          completed.push(quiz);
          break;
      }
    });

    return { upcoming, active, completed };
  };

  // Filter quizzes by search title and status
  const getFilteredQuizzes = () => {
    let filteredQuizzes = quizzes;

    // Apply search filter
    if (searchTitle.trim()) {
      filteredQuizzes = filteredQuizzes.filter(quiz =>
        quiz.title?.toLowerCase().includes(searchTitle.toLowerCase().trim())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filteredQuizzes = filteredQuizzes.filter(quiz =>
        getQuizStatus(quiz) === statusFilter
      );
    }

    return filteredQuizzes;
  };

  // Get quizzes for current tab
  const getQuizzesForTab = () => {
    const { upcoming, active, completed } = categorizeQuizzes();

    switch (tabValue) {
      case 0: // All
        return getFilteredQuizzes();
      case 1: // Upcoming
        return upcoming.filter(quiz =>
          !searchTitle.trim() || quiz.title?.toLowerCase().includes(searchTitle.toLowerCase().trim())
        );
      case 2: // Active
        return active.filter(quiz =>
          !searchTitle.trim() || quiz.title?.toLowerCase().includes(searchTitle.toLowerCase().trim())
        );
      case 3: // Completed
        return completed.filter(quiz =>
          !searchTitle.trim() || quiz.title?.toLowerCase().includes(searchTitle.toLowerCase().trim())
        );
      default:
        return getFilteredQuizzes();
    }
  };

  const handleDelete = async (quizId) => {
    try {
      //console.log('🗑️ Deleting quiz:', quizId);
      await api.delete(`/api/event-quiz/${quizId}`);
      //console.log('✅ Quiz deleted successfully, updating UI...');

      // Use functional update to ensure we have the latest state
      setQuizzes(prevQuizzes => {
        const updatedQuizzes = prevQuizzes.filter(quiz => quiz._id !== quizId);
        //console.log('📊 Updated quiz list:', updatedQuizzes.length, 'quizzes remaining');
        return updatedQuizzes;
      });

      // Clear any previous errors
      setError('');

      //console.log('🎉 Quiz deletion completed successfully');
    } catch (error) {
      console.error('❌ Error deleting quiz:', error);

      // Handle specific error cases
      if (error.response?.status === 404) {
        //console.log('📝 Quiz not found (404) - removing from UI and refreshing list');

        // Remove from UI since it doesn't exist in database
        setQuizzes(prevQuizzes => {
          const updatedQuizzes = prevQuizzes.filter(quiz => quiz._id !== quizId);
          //console.log('📊 Removed non-existent quiz, updated list:', updatedQuizzes.length, 'quizzes remaining');
          return updatedQuizzes;
        });

        // Show info message instead of error
        setInfoMessage('Quiz was already deleted. The list has been updated.');
        setError(''); // Clear any error messages

        // Clear the info message after 3 seconds
        setTimeout(() => setInfoMessage(''), 3000);

        // Refresh the entire list to ensure consistency
        setTimeout(() => {
          //console.log('🔄 Refreshing quiz list to ensure consistency...');
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

        {/* Status Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={(e, newValue) => setTabValue(newValue)}
            variant="fullWidth"
            indicatorColor="primary"
          >
            <Tab
              label={`All (${quizzes.length})`}
              icon={<FilterListIcon />}
              iconPosition="start"
            />
            <Tab
              label={`Upcoming (${categorizeQuizzes().upcoming.length})`}
              icon={<Chip label="📅" size="small" />}
              iconPosition="start"
            />
            <Tab
              label={`Active (${categorizeQuizzes().active.length})`}
              icon={<Chip label="🟢" size="small" />}
              iconPosition="start"
            />
            <Tab
              label={`Completed (${categorizeQuizzes().completed.length})`}
              icon={<Chip label="✅" size="small" />}
              iconPosition="start"
            />
          </Tabs>
        </Paper>

        {/* Search and Status Filters */}
        <Paper sx={{
          p: { xs: 1.5, sm: 2 },
          mb: { xs: 2, sm: 3 },
          borderRadius: { xs: 1, sm: 2 },
          width: '100%',
          maxWidth: '1200px',
          mx: 'auto'
        }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
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
            {tabValue === 0 && (
              <FormControl sx={{ minWidth: 150 }} size={isMobile ? "small" : "medium"}>
                <InputLabel>Status Filter</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Status Filter"
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="upcoming">Upcoming</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                </Select>
              </FormControl>
            )}
          </Stack>
        </Paper>

        {getQuizzesForTab().length === 0 ? (
          <Alert severity="info">
            {searchTitle.trim()
              ? `No ${tabValue === 0 ? '' : ['', 'upcoming', 'active', 'completed'][tabValue] + ' '}event quizzes match your search.`
              : `No ${tabValue === 0 ? '' : ['', 'upcoming', 'active', 'completed'][tabValue] + ' '}event quizzes found.`
            }
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
            {getQuizzesForTab().map((quiz) => {
              const status = getQuizStatus(quiz);
              const statusInfo = getStatusInfo(status);

              return (
                <Box
                  key={quiz._id}
                  sx={{
                    width: '100%',
                    maxWidth: { xs: '400px', sm: '100%', md: '100%' },
                    mx: { xs: 'auto', sm: 0 },
                    position: 'relative'
                  }}
                >
                  <EventQuizCard quiz={quiz} onDelete={handleDelete} />
                  {/* Status Badge */}
                  <Chip
                    label={statusInfo.label}
                    color={statusInfo.color}
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      zIndex: 1,
                      fontWeight: 'bold'
                    }}
                  />
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default EventQuizList; 