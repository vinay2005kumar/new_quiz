import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  List,
  ListItem,
  Divider,
  RadioGroup,
  FormControlLabel,
  Radio,
  useTheme,
  useMediaQuery
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import api from '../../config/axios';

const QuizSubmissionView = () => {
  const { id: quizId, studentId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submission, setSubmission] = useState(null);

  useEffect(() => {
    fetchSubmission();
  }, [quizId, studentId]);

  const fetchSubmission = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get(`/api/quiz/${quizId}/submissions/${studentId}`);
      setSubmission(response);
    } catch (error) {
      console.error('Error fetching submission:', error);
      setError(error.response?.data?.message || error.message || 'Failed to load submission');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (durationInMinutes) => {
    if (!durationInMinutes && durationInMinutes !== 0) return 'N/A';
    
    const hours = Math.floor(durationInMinutes / 60);
    const minutes = durationInMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
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
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!submission) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="warning">No submission data found</Alert>
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
            {submission.quiz?.title} - Submission Details
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
                      <strong>Name:</strong> {submission.student?.name}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                      <strong>Admission Number:</strong> {submission.student?.admissionNumber}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                      <strong>Department:</strong> {submission.student?.department}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                      <strong>Year:</strong> {submission.student?.year}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                      <strong>Section:</strong> {submission.student?.section}
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
                      <strong>Score:</strong> {submission.totalMarks}/{submission.quiz?.totalMarks}
                      {' '}({Math.round((submission.totalMarks / submission.quiz?.totalMarks) * 100)}%)
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
                  {submission.quiz?.questions?.map((question, index) => {
                    // Get the student's answer for this question
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

                            {/* Question Text with UNIVERSAL Formatting Preservation */}
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

export default QuizSubmissionView;
