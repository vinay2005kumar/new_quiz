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
  FormControl,
  Card,
  CardContent,
  Chip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import api from '../../config/axios';

const EventQuizSubmissionView = () => {
  const params = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submission, setSubmission] = useState(null);

  // Extract parameters - the route is /quiz/:id/submission/:studentId
  const quizId = params.id;
  const studentId = params.studentId;

  useEffect(() => {
    if (quizId && studentId) {
      fetchSubmission();
    } else {
      setError(`Missing required parameters. QuizId: ${quizId}, StudentId: ${studentId}`);
      setLoading(false);
    }
  }, [quizId, studentId]);

  const fetchSubmission = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get(`/api/event-quiz/${quizId}/submission/${studentId}`);

      // Handle different response structures
      const submissionData = response.data || response;
      setSubmission(submissionData);
    } catch (error) {

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

  const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
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

          <Typography variant="h4" gutterBottom>
            Quiz Review: {submission.quiz?.title || 'N/A'}
          </Typography>
          <Typography variant="h5" color="primary" gutterBottom>
            Score: {submission?.totalMarks || 0} / {submission.quiz?.effectiveTotalMarks || submission.quiz?.totalMarks || 0}
          </Typography>
          <Typography variant="body1" gutterBottom>
            Subject: {submission.quiz?.subject?.name || 'N/A'}
          </Typography>
          <Typography variant="body1" gutterBottom>
            Started: {submission.startTime ? new Date(submission.startTime).toLocaleString() : 'N/A'}
          </Typography>
          <Typography variant="body1" gutterBottom>
            Submitted: {submission.submitTime ? new Date(submission.submitTime).toLocaleString() : 'N/A'}
          </Typography>
          <Typography variant="body1" gutterBottom>
            Duration: {submission.duration ? `${submission.duration} minutes` : 'N/A'}
          </Typography>
          <Typography variant="body1" gutterBottom>
            <strong>Student:</strong> {submission.student?.name} ({submission.student?.admissionNumber})
          </Typography>
          <Typography variant="body1" gutterBottom>
            <strong>Department:</strong> {submission.student?.department}, Year {submission.student?.year}, Section {submission.student?.section}
          </Typography>
          <Typography variant="body1" gutterBottom sx={{ mb: 3 }}>
            <strong>Status:</strong> <Chip label="evaluated" size="small" color="success" />
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
                      <strong>Score:</strong> {submission?.totalMarks || 0}/{submission.quiz?.effectiveTotalMarks || submission.quiz?.totalMarks || 0} ({(() => {
                        const totalScore = submission?.totalMarks || 0;
                        const maxScore = submission.quiz?.effectiveTotalMarks || submission.quiz?.totalMarks || 0;
                        const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
                        return percentage;
                      })()}%)
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
                <Box sx={{ p: 0 }}>
                  {submission.quiz.questions?.map((question, index) => {
                    // Find answer by questionIndex (not questionId)
                    const answerObj = submission.answers?.find(ans => ans.questionIndex === index);
                    const studentAnswerIndex = answerObj?.selectedOption;
                    const studentAnswer = question.options?.[studentAnswerIndex];
                    const correctAnswer = question.options?.[question.correctAnswer];
                    const isCorrect = studentAnswerIndex === question.correctAnswer;
                    const marksAwarded = isCorrect ? (question.marks || 1) : 0;

                    return (
                      <Box
                        key={question._id || index}
                        sx={{
                          mb: 3,
                          border: '2px solid',
                          borderColor: isCorrect ? 'success.main' : 'error.main',
                          borderRadius: 2,
                          overflow: 'hidden'
                        }}
                      >
                        {/* Question Header */}
                        <Box sx={{
                          p: 2,
                          backgroundColor: 'grey.900',
                          color: 'white'
                        }}>
                          <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                            Question {index + 1}:
                          </Typography>
                        </Box>

                        {/* Question Text */}
                        <Box sx={{
                          p: 2,
                          backgroundColor: 'grey.800',
                          color: 'white'
                        }}>
                          <Typography sx={{ fontSize: '1rem' }}>
                            <div dangerouslySetInnerHTML={{ __html: question.question || question.text || 'Question text not available' }} />
                          </Typography>
                        </Box>

                        {/* Marks Display */}
                        <Box sx={{
                          px: 2,
                          py: 1,
                          backgroundColor: 'background.paper'
                        }}>
                          <Typography sx={{
                            fontSize: '0.9rem',
                            color: isCorrect ? 'success.main' : 'error.main',
                            fontWeight: 600
                          }}>
                            Marks: {marksAwarded}/{question.marks || 1} {!isCorrect && question.negativeMarks ? `(Negative: -${question.negativeMarks})` : ''}
                          </Typography>
                        </Box>

                        {/* Options */}
                        <Box sx={{ p: 2, backgroundColor: 'background.paper' }}>
                          {question.options?.map((option, optionIndex) => {
                            const isStudentAnswer = optionIndex === studentAnswerIndex;
                            const isCorrectOption = optionIndex === question.correctAnswer;

                            return (
                              <Box
                                key={optionIndex}
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  mb: 1,
                                  p: 1,
                                  borderRadius: 1
                                }}
                              >
                                <Radio
                                  checked={isStudentAnswer || isCorrectOption}
                                  sx={{
                                    color: isStudentAnswer ? 'primary.main' : isCorrectOption ? 'success.main' : 'grey.400',
                                    '&.Mui-checked': {
                                      color: isStudentAnswer ? 'primary.main' : 'success.main'
                                    }
                                  }}
                                />
                                <Typography sx={{
                                  ml: 1,
                                  fontSize: '0.95rem',
                                  color: isStudentAnswer ? 'primary.main' : isCorrectOption ? 'success.main' : 'text.primary',
                                  fontWeight: (isStudentAnswer || isCorrectOption) ? 600 : 400
                                }}>
                                  <div dangerouslySetInnerHTML={{ __html: option }} />
                                  {isStudentAnswer && (
                                    <span style={{ marginLeft: '8px', fontSize: '0.85rem' }}>
                                      (Your Answer)
                                    </span>
                                  )}
                                  {isCorrectOption && (
                                    <span style={{ marginLeft: '8px', fontSize: '0.85rem' }}>
                                      (Correct Answer)
                                    </span>
                                  )}
                                </Typography>
                              </Box>
                            );
                          })}
                        </Box>

                        {/* Result Summary */}
                        <Box sx={{
                          p: 2,
                          backgroundColor: isCorrect ? 'success.light' : 'error.light',
                          borderTop: '1px solid',
                          borderColor: 'divider'
                        }}>
                          <Typography sx={{
                            fontSize: '0.9rem',
                            color: isCorrect ? 'success.dark' : 'error.dark',
                            fontWeight: 600
                          }}>
                            {isCorrect ? '✓ Correct' : '✗ Incorrect'}. Marks: {marksAwarded}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default EventQuizSubmissionView; 