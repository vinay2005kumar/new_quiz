import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Grid,
  CircularProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  Radio,
  RadioGroup,
  FormControlLabel,
  Card,
  CardContent,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import api from '../../config/axios';

const EventQuizSubmissionView = () => {
  console.log('🚀 EventQuizSubmissionView component is rendering!');
  console.log('🔍 Current URL:', window.location.href);
  console.log('🔍 Current pathname:', window.location.pathname);

  const params = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submission, setSubmission] = useState(null);

  // Debug the parameters
  console.log('🔍 EventQuizSubmissionView - All params:', params);
  console.log('🔍 EventQuizSubmissionView - Current URL:', window.location.pathname);
  console.log('🔍 EventQuizSubmissionView - Available keys:', Object.keys(params));

  // Extract parameters - the route is /quiz/:id/submission/:studentId
  const quizId = params.id;
  const studentId = params.studentId;

  console.log('🔍 EventQuizSubmissionView - Extracted quizId:', quizId);
  console.log('🔍 EventQuizSubmissionView - Extracted studentId:', studentId);

  // Additional debugging
  if (!quizId) {
    console.error('❌ quizId is missing! Available params:', params);
  }
  if (!studentId) {
    console.error('❌ studentId is missing! Available params:', params);
  }

  useEffect(() => {
    console.log('🔄 useEffect triggered with quizId:', quizId, 'studentId:', studentId);

    if (quizId && studentId) {
      console.log('✅ Both parameters available, calling fetchSubmission');
      fetchSubmission();
    } else {
      console.error('❌ Missing parameters - quizId:', quizId, 'studentId:', studentId);
      console.error('❌ All available params:', params);
      setError(`Missing required parameters. QuizId: ${quizId}, StudentId: ${studentId}`);
      setLoading(false);
    }
  }, [quizId, studentId]);

  const fetchSubmission = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('🔍 EventQuizSubmissionView - Fetching submission with quizId:', quizId, 'studentId:', studentId);

      // The backend route is /:quizId/submission/:studentId
      // So we need to call /api/event-quiz/{quizId}/submission/{studentId}
      const apiUrl = `/api/event-quiz/${quizId}/submission/${studentId}`;
      console.log('🔍 EventQuizSubmissionView - API URL:', apiUrl);

      const response = await api.get(apiUrl);
      console.log('✅ EventQuizSubmissionView - Response received:', response);
      setSubmission(response);
    } catch (error) {
      console.error('❌ EventQuizSubmissionView - Error fetching submission:', error);
      console.error('❌ EventQuizSubmissionView - Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.response?.data?.message,
        data: error.response?.data,
        url: error.config?.url,
        quizId: quizId,
        studentId: studentId,
        fullError: error.response
      });

      // More detailed error message
      let errorMessage = 'Failed to load submission';
      if (error.response?.status === 500) {
        errorMessage = 'Server error occurred while fetching submission';
      } else if (error.response?.status === 404) {
        errorMessage = 'Submission not found for this student';
      } else if (error.response?.status === 403) {
        errorMessage = 'Access denied - insufficient permissions';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (minutes) => {
    if (!minutes && minutes !== 0) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${remainingMinutes}m`;
  };

  if (loading) {
    return (
      <Container sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">
          <Typography variant="h6" gutterBottom>Error</Typography>
          <Typography>{error}</Typography>
          <Typography variant="body2" sx={{ mt: 2 }}>
            <strong>Debug Info:</strong><br/>
            Current URL: {window.location.pathname}<br/>
            QuizId: {quizId || 'undefined'}<br/>
            StudentId: {studentId || 'undefined'}<br/>
            All Params: {JSON.stringify(params)}
          </Typography>
        </Alert>
      </Container>
    );
  }

  if (!submission) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="info">No submission found</Alert>
      </Container>
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
      <Paper sx={{ 
        p: { xs: 2, sm: 3 },
        borderRadius: { xs: 1, sm: 2 }
      }}>
        <Box sx={{ mb: { xs: 2, sm: 3 } }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
            sx={{ mb: 2 }}
            size={isMobile ? "small" : "medium"}
          >
            Back
          </Button>

          <Typography 
            variant={isMobile ? "h5" : "h4"} 
            gutterBottom
            sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}
          >
            {submission.quiz.title} - Submission Details
          </Typography>
        </Box>

        <Grid container spacing={isMobile ? 2 : 3}>
          {/* Student Information */}
          <Grid item xs={12}>
            <Card sx={{ borderRadius: { xs: 1, sm: 2 } }}>
              <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                <Typography 
                  variant="h6" 
                  gutterBottom
                  sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
                >
                  Student Information
                </Typography>
                <Grid container spacing={isMobile ? 1 : 2}>
                  <Grid item xs={12} sm={6} md={4}>
                    <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                      <strong>Name:</strong> {submission.student.name}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                      <strong>Email:</strong> {submission.student.email}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                      <strong>College:</strong> {submission.student.college}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                      <strong>Department:</strong> {submission.student.department}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                      <strong>Year:</strong> {submission.student.year}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                      <strong>Phone:</strong> {submission.student.phoneNumber || 'N/A'}
                    </Typography>
                  </Grid>
                  {submission.student.teamName && (
                    <Grid item xs={12} sm={6} md={4}>
                      <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                        <strong>Team Name:</strong> {submission.student.teamName}
                      </Typography>
                    </Grid>
                  )}
                  <Grid item xs={12} sm={6} md={4}>
                    <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                      <strong>Participant Type:</strong> {submission.student.participantType}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Submission Statistics */}
          <Grid item xs={12}>
            <Card sx={{ borderRadius: { xs: 1, sm: 2 } }}>
              <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                <Typography 
                  variant="h6" 
                  gutterBottom
                  sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
                >
                  Submission Statistics
                </Typography>
                <Grid container spacing={isMobile ? 1 : 2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                      <strong>Score:</strong> {submission.totalMarks}/{submission.quiz.totalMarks}
                      {' '}({Math.round((submission.totalMarks / submission.quiz.totalMarks) * 100)}%)
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                      <strong>Duration:</strong> {formatDuration(submission.duration)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                      <strong>Start Time:</strong> {formatDateTime(submission.startTime)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                      <strong>Submit Time:</strong> {formatDateTime(submission.submitTime)}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Questions and Answers */}
          <Grid item xs={12}>
            <Card sx={{ borderRadius: { xs: 1, sm: 2 } }}>
              <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                <Typography 
                  variant="h6" 
                  gutterBottom
                  sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
                >
                  Questions and Answers
                </Typography>
                <List sx={{ p: 0 }}>
                  {submission.quiz.questions?.map((question, index) => {
                    const answerObj = submission.answers?.find(ans => ans.questionId === question._id);
                    const studentAnswer = answerObj?.selectedOption;

                    return (
                      <React.Fragment key={question._id}>
                        <ListItem sx={{ 
                          flexDirection: 'column', 
                          alignItems: 'flex-start',
                          p: { xs: 1, sm: 2 }
                        }}>
                          <Box sx={{ width: '100%' }}>
                            <Typography 
                              variant="subtitle1" 
                              gutterBottom
                              sx={{ fontSize: { xs: '1rem', sm: '1.125rem' } }}
                            >
                              <strong>Question {index + 1}:</strong> ({question.marks || 1} marks)
                            </Typography>

                            {/* Question Text */}
                            <Box sx={{
                              p: { xs: 1.5, sm: 2 },
                              mb: 2,
                              bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
                              borderRadius: 1,
                              border: '1px solid',
                              borderColor: 'divider',
                              fontSize: { xs: '0.875rem', sm: '0.9rem' }
                            }}>
                              <div dangerouslySetInnerHTML={{ __html: question.text }} />
                            </Box>

                            {/* Options */}
                            <RadioGroup value={studentAnswer || ''} sx={{ mb: 2 }}>
                              {question.options?.map((option, optionIndex) => (
                                <FormControlLabel
                                  key={optionIndex}
                                  value={option}
                                  control={<Radio />}
                                  label={
                                    <Box sx={{ 
                                      fontSize: { xs: '0.875rem', sm: '1rem' },
                                      wordBreak: 'break-word'
                                    }}>
                                      <div dangerouslySetInnerHTML={{ __html: option }} />
                                    </Box>
                                  }
                                  sx={{
                                    margin: 0,
                                    padding: { xs: 0.5, sm: 1 },
                                    borderRadius: 1,
                                    backgroundColor: studentAnswer === option ? 'action.selected' : 'transparent',
                                    border: studentAnswer === option ? '2px solid' : '1px solid',
                                    borderColor: studentAnswer === option ? 'primary.main' : 'divider',
                                    width: '100%',
                                    '&:hover': {
                                      backgroundColor: 'action.hover'
                                    }
                                  }}
                                />
                              ))}
                            </RadioGroup>

                            {/* Answer Status */}
                            <Box sx={{ 
                              mt: 2, 
                              p: { xs: 1, sm: 1.5 }, 
                              borderRadius: 1,
                              backgroundColor: answerObj?.isCorrect ? 'success.light' : 'error.light',
                              color: answerObj?.isCorrect ? 'success.dark' : 'error.dark'
                            }}>
                              <Typography 
                                variant="body2"
                                sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                              >
                                <strong>
                                  {answerObj?.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                                </strong>
                                {answerObj?.marks !== undefined && (
                                  <span> - {answerObj.marks} mark{answerObj.marks !== 1 ? 's' : ''} awarded</span>
                                )}
                              </Typography>
                            </Box>
                          </Box>
                        </ListItem>
                        {index < submission.quiz.questions.length - 1 && (
                          <Divider sx={{ mx: { xs: 1, sm: 2 } }} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default EventQuizSubmissionView; 