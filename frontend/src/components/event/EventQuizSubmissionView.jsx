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
  CardContent
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import api from '../../config/axios';

const EventQuizSubmissionView = () => {
  console.log('🚀 EventQuizSubmissionView component is rendering!');
  console.log('🔍 Current URL:', window.location.href);
  console.log('🔍 Current pathname:', window.location.pathname);

  const params = useParams();
  const navigate = useNavigate();
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
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
            sx={{ mb: 2 }}
          >
            Back
          </Button>

          <Typography variant="h4" gutterBottom>
            {submission.quiz.title} - Submission Details
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Student Information */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Student Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={4}>
                    <Typography><strong>Name:</strong> {submission.student.name}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Typography><strong>Email:</strong> {submission.student.email}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Typography><strong>College:</strong> {submission.student.college}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Typography><strong>Department:</strong> {submission.student.department}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Typography><strong>Year:</strong> {submission.student.year}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Typography><strong>Roll Number:</strong> {submission.student.rollNumber}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Submission Statistics */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Submission Statistics
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography>
                      <strong>Score:</strong> {submission.totalMarks}/{submission.quiz.totalMarks}
                      {' '}({Math.round((submission.totalMarks / submission.quiz.totalMarks) * 100)}%)
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography>
                      <strong>Duration:</strong> {formatDuration(submission.duration)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography>
                      <strong>Start Time:</strong> {formatDateTime(submission.startTime)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography>
                      <strong>Submit Time:</strong> {formatDateTime(submission.submitTime)}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Questions and Answers */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Questions and Answers
                </Typography>
                <List>
                  {submission.quiz.questions.map((question, index) => {
                    // Get the student's answer for this question
                    // The answers array might have different structures, so we need to handle both
                    let studentAnswer = null;

                    if (submission.answers && Array.isArray(submission.answers)) {
                      // Check if answers is an array of objects with questionIndex
                      const answerObj = submission.answers.find(ans => ans.questionIndex === index);
                      if (answerObj) {
                        studentAnswer = answerObj.selectedOption;
                      } else {
                        // Check if answers is a simple array indexed by question
                        studentAnswer = submission.answers[index];
                      }
                    }

                    return (
                      <React.Fragment key={index}>
                        <ListItem>
                          <Box sx={{ width: '100%' }}>
                            <Typography variant="subtitle1" gutterBottom>
                              <strong>Question {index + 1}:</strong> ({question.marks || 1} marks)
                            </Typography>
                            {/* Question Text with UNIVERSAL Formatting Preservation */}
                            <Box sx={{
                              p: 2,
                              mb: 2,
                              bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
                              borderRadius: 1,
                              border: '1px solid',
                              borderColor: 'divider',
                              fontFamily: 'monospace',
                              fontSize: '0.9rem',
                              lineHeight: 1.5,
                              whiteSpace: 'pre-wrap', // ALWAYS preserve all formatting
                              overflow: 'auto'
                            }}>
                              {question.question}
                            </Box>
                            <RadioGroup
                              value={studentAnswer !== null ? studentAnswer : ''}
                              sx={{ ml: 2 }}
                            >
                              {question.options.map((option, optIndex) => {
                                const isCorrect = optIndex === question.correctAnswer;
                                const isSelected = studentAnswer === optIndex;

                                return (
                                  <FormControlLabel
                                    key={optIndex}
                                    value={optIndex}
                                    control={<Radio />}
                                    label={option}
                                    sx={{
                                      color: isCorrect ? 'success.main' :
                                            isSelected ? 'error.main' : 'inherit',
                                      fontWeight: isSelected ? 'bold' : 'normal'
                                    }}
                                    disabled
                                  />
                                );
                              })}
                            </RadioGroup>
                            <Box sx={{ mt: 1 }}>
                              {studentAnswer !== null ? (
                                <Typography color={studentAnswer === question.correctAnswer ? 'success.main' : 'error.main'}>
                                  {studentAnswer === question.correctAnswer ?
                                    '✓ Correct Answer' :
                                    `✗ Incorrect Answer (Correct: ${question.options[question.correctAnswer]})`}
                                </Typography>
                              ) : (
                                <Typography color="warning.main">
                                  ⚠ No answer selected
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </ListItem>
                        {index < submission.quiz.questions.length - 1 && <Divider />}
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