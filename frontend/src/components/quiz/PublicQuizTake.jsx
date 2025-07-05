import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  useTheme,
  useMediaQuery,
  Drawer,
  IconButton,
  Divider,
  LinearProgress
} from '@mui/material';
import {
  Timer as TimerIcon,
  Send as SendIcon,
  Warning as WarningIcon,
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Clear as ClearIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import api from '../../config/axios';
import QuizSecurity from './QuizSecurity';

const PublicQuizTake = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [participantInfo, setParticipantInfo] = useState({
    name: '',
    email: '',
    college: '',
    department: '',
    year: ''
  });
  const [startTime, setStartTime] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  // Mobile sidebar states
  const [showDetailsSidebar, setShowDetailsSidebar] = useState(false);
  const [showQuestionsSidebar, setShowQuestionsSidebar] = useState(false);

  useEffect(() => {
    fetchQuiz();
  }, [quizId]);

  useEffect(() => {
    if (quiz && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1000) {
            handleSubmit();
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [quiz, timeRemaining]);

  const fetchQuiz = async () => {
    try {
      const response = await api.get(`/api/event-quiz/${quizId}/public`);
      const quizData = response.data;

      setQuiz(quizData);
      setQuestions(quizData.questions || []);
      setTimeRemaining(quizData.duration * 60 * 1000);
      setStartTime(new Date());
      setLoading(false);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to load quiz');
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionIndex, selectedOption) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: parseInt(selectedOption)
    }));
  };

  const handleSubmit = () => {
    setShowSubmitDialog(true);
  };

  const confirmSubmit = async () => {
    setSubmitting(true);
    try {
      const timeTaken = startTime ? Math.floor((new Date() - startTime) / 1000) : 0;

      const submissionData = {
        answers: Object.entries(answers).map(([questionIndex, selectedOption]) => ({
          questionIndex: parseInt(questionIndex),
          selectedOption
        })),
        participantInfo,
        timeTaken
      };

      const response = await api.post(`/api/event-quiz/${quizId}/submit`, submissionData);

      navigate(`/quiz/${quizId}/result`, {
        state: {
          result: response.data,
          participantInfo
        }
      });
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to submit quiz');
      setSubmitting(false);
    }
    setShowSubmitDialog(false);
  };

  const formatTime = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getProgress = () => {
    const answeredQuestions = Object.values(answers).filter(answer => answer !== null).length;
    return (answeredQuestions / questions.length) * 100;
  };

  // Clear current question answer
  const handleClearAnswer = () => {
    if (questions && questions[currentQuestion]) {
      setAnswers(prev => {
        const newAnswers = { ...prev };
        delete newAnswers[currentQuestion];
        return newAnswers;
      });
    }
  };

  // Mobile navigation functions
  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleNextQuestion = () => {
    if (questions && currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading Quiz...
        </Typography>
      </Container>
    );
  }

  if (error && !quiz) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">
          {error}
        </Alert>
        <Button
          variant="contained"
          onClick={() => navigate('/')}
          sx={{ mt: 2 }}
        >
          Go Back
        </Button>
      </Container>
    );
  }

  return (
    <QuizSecurity
      securitySettings={quiz?.securitySettings || {}}
      onSecurityViolation={(violation) => {
        console.log('Security violation:', violation);
      }}
      quizTitle={quiz?.title}
    >
      <Box sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Top Header Bar */}
        <Paper sx={{
          p: { xs: 1, sm: 2 },
          borderRadius: 0,
          borderBottom: 1,
          borderColor: 'divider',
          zIndex: 1000
        }}>
          <Box sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', sm: 'center' },
            gap: { xs: 1, sm: 0 }
          }}>
            <Typography
              variant={isMobile ? "h6" : "h5"}
              component="h1"
              sx={{
                fontWeight: 'bold',
                fontSize: { xs: '1.25rem', sm: '1.5rem' }
              }}
            >
              {quiz?.title}
            </Typography>

            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 1, sm: 2 },
              justifyContent: { xs: 'space-between', sm: 'flex-end' },
              width: { xs: '100%', sm: 'auto' }
            }}>
              {/* Mobile Navigation Buttons */}
              {isMobile && (
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setShowDetailsSidebar(true)}
                    sx={{ minWidth: 'auto', px: 1, fontSize: '0.75rem' }}
                  >
                    📋
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setShowQuestionsSidebar(true)}
                    sx={{ minWidth: 'auto', px: 1, fontSize: '0.75rem' }}
                  >
                    📝
                  </Button>
                </Box>
              )}

              <Chip
                icon={<TimerIcon sx={{ fontSize: { xs: '1rem', sm: '1.2rem' } }} />}
                label={formatTime(timeRemaining)}
                color={timeRemaining < 300000 ? 'error' : 'primary'}
                variant="filled"
                size={isMobile ? "small" : "medium"}
                sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, fontWeight: 'bold' }}
              />
              <Button
                variant="contained"
                color="success"
                onClick={() => setShowSubmitDialog(true)}
                startIcon={<SendIcon sx={{ fontSize: { xs: '1rem', sm: '1.2rem' } }} />}
                size={isMobile ? "small" : "medium"}
                sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, py: { xs: 0.75, sm: 1 } }}
              >
                {isMobile ? 'Submit' : 'Submit Quiz'}
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* Main Content Area - Responsive Layout */}
        <Box sx={{
          flex: 1,
          display: 'flex',
          height: 'calc(100vh - 80px)',
          overflow: 'hidden'
        }}>
          {/* Desktop Left Sidebar - Quiz Details */}
          {!isMobile && (
            <Paper sx={{
              width: '300px',
              borderRadius: 0,
              borderRight: 1,
              borderColor: 'divider',
              overflow: 'auto',
              p: 2
            }}>
              {/* Quiz Information */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                  📋 Quiz Details
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Typography variant="body2" gutterBottom>
                  <strong>Duration:</strong> {quiz?.duration} minutes
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Total Questions:</strong> {questions?.length || 0}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Description:</strong> {quiz?.description}
                </Typography>
              </Box>

              {/* Participant Information */}
              <Typography variant="h6" gutterBottom sx={{
                color: 'secondary.main',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <PersonIcon />
                Your Details
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body2" gutterBottom>
                <strong>Name:</strong> {participantInfo?.name || 'Not provided'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Email:</strong> {participantInfo?.email || 'Not provided'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>College:</strong> {participantInfo?.college || 'Not provided'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Department:</strong> {participantInfo?.department || 'Not provided'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Year:</strong> {participantInfo?.year || 'Not provided'}
              </Typography>
            </Paper>
          )}

          {/* Mobile Drawers */}
          {isMobile && (
            <>
              {/* Details Sidebar Drawer */}
              <Drawer
                anchor="left"
                open={showDetailsSidebar}
                onClose={() => setShowDetailsSidebar(false)}
                sx={{
                  '& .MuiDrawer-paper': {
                    width: '280px',
                    p: 2,
                    bgcolor: 'background.paper',
                    color: 'text.primary'
                  }
                }}
              >
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                  width: '100%'
                }}>
                  <Typography
                    variant="h6"
                    sx={{
                      color: 'primary.main',
                      fontWeight: 'bold',
                      fontSize: '1.1rem'
                    }}
                  >
                    📋 Details
                  </Typography>
                  <IconButton
                    onClick={() => setShowDetailsSidebar(false)}
                    size="small"
                    sx={{
                      color: 'text.primary',
                      p: 0.5
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
                <Divider sx={{ mb: 2 }} />

                {/* Quiz Information */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" gutterBottom sx={{ color: 'text.primary' }}>
                    <strong>Duration:</strong> {quiz?.duration} minutes
                  </Typography>
                  <Typography variant="body2" gutterBottom sx={{ color: 'text.primary' }}>
                    <strong>Total Questions:</strong> {questions?.length || 0}
                  </Typography>
                  <Typography variant="body2" gutterBottom sx={{ color: 'text.primary' }}>
                    <strong>Description:</strong> {quiz?.description}
                  </Typography>
                </Box>

                {/* Participant Information */}
                <Typography variant="h6" gutterBottom sx={{
                  color: 'secondary.main',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  <PersonIcon />
                  Your Details
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body2" gutterBottom sx={{ color: 'text.primary' }}>
                  <strong>Name:</strong> {participantInfo?.name || 'Not provided'}
                </Typography>
                <Typography variant="body2" gutterBottom sx={{ color: 'text.primary' }}>
                  <strong>Email:</strong> {participantInfo?.email || 'Not provided'}
                </Typography>
                <Typography variant="body2" gutterBottom sx={{ color: 'text.primary' }}>
                  <strong>College:</strong> {participantInfo?.college || 'Not provided'}
                </Typography>
                <Typography variant="body2" gutterBottom sx={{ color: 'text.primary' }}>
                  <strong>Department:</strong> {participantInfo?.department || 'Not provided'}
                </Typography>
                <Typography variant="body2" gutterBottom sx={{ color: 'text.primary' }}>
                  <strong>Year:</strong> {participantInfo?.year || 'Not provided'}
                </Typography>
              </Drawer>

              {/* Questions Navigation Drawer */}
              <Drawer
                anchor="right"
                open={showQuestionsSidebar}
                onClose={() => setShowQuestionsSidebar(false)}
                sx={{
                  '& .MuiDrawer-paper': {
                    width: '280px',
                    p: 2,
                    bgcolor: 'background.paper',
                    color: 'text.primary'
                  }
                }}
              >
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                  width: '100%'
                }}>
                  <Typography
                    variant="h6"
                    sx={{
                      color: 'primary.main',
                      fontWeight: 'bold',
                      fontSize: '1.1rem'
                    }}
                  >
                    📝 Questions
                  </Typography>
                  <IconButton
                    onClick={() => setShowQuestionsSidebar(false)}
                    size="small"
                    sx={{
                      color: 'text.primary',
                      p: 0.5
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
                <Divider sx={{ mb: 2 }} />

                {/* Question Grid */}
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1, mb: 2 }}>
                  {questions?.map((question, index) => {
                    const isAnswered = answers[index] !== undefined && answers[index] !== null;
                    const isCurrent = index === currentQuestion;

                    return (
                      <Button
                        key={index}
                        variant={isCurrent ? 'contained' : isAnswered ? 'outlined' : 'text'}
                        color={isCurrent ? 'primary' : isAnswered ? 'success' : 'inherit'}
                        size="small"
                        onClick={() => {
                          setCurrentQuestion(index);
                          setShowQuestionsSidebar(false);
                        }}
                        sx={{
                          minWidth: 'auto',
                          aspectRatio: '1',
                          fontSize: '0.75rem'
                        }}
                      >
                        {index + 1}
                      </Button>
                    );
                  })}
                </Box>

                {/* Legend */}
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                  Legend:
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 16, height: 16, bgcolor: 'success.main', borderRadius: 1 }} />
                    <Typography variant="body2" sx={{ color: 'text.primary' }}>Answered</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 16, height: 16, bgcolor: 'primary.main', borderRadius: 1 }} />
                    <Typography variant="body2" sx={{ color: 'text.primary' }}>Current</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 16, height: 16, border: 1, borderColor: 'grey.400', borderRadius: 1 }} />
                    <Typography variant="body2" sx={{ color: 'text.primary' }}>Not Answered</Typography>
                  </Box>
                </Box>
              </Drawer>
            </>
          )}

          {/* Center - Questions Area */}
          <Box sx={{
            flex: 1,
            overflow: 'auto',
            p: { xs: 1.5, sm: 3 },
            bgcolor: 'background.paper'
          }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {/* Questions Display */}
            {questions && questions.length > 0 && (
              <Box>
                {/* Mobile: One-by-One Display Mode */}
                {currentQuestion < questions.length && (
                  <Box>
                    <Card sx={{
                      minHeight: { xs: 'auto', sm: '400px' },
                      border: 2,
                      borderColor: 'primary.light',
                      boxShadow: 3,
                      borderRadius: isMobile ? 1 : 2
                    }}>
                      <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
                        <Typography
                          variant={isMobile ? "h6" : "h4"}
                          gutterBottom
                          sx={{
                            color: 'primary.main',
                            fontWeight: 'bold',
                            mb: { xs: 2, sm: 3 },
                            fontSize: { xs: '1.25rem', sm: '2rem' }
                          }}
                        >
                          Question {currentQuestion + 1} of {questions.length}
                        </Typography>

                        {/* Question Text */}
                        <Box sx={{ mb: { xs: 3, sm: 4 } }}>
                          <Typography
                            variant="body1"
                            sx={{
                              fontSize: { xs: '1rem', sm: '1.1rem' },
                              lineHeight: 1.6,
                              mb: 2
                            }}
                          >
                            {questions[currentQuestion]?.question}
                          </Typography>
                        </Box>

                        <FormControl component="fieldset" sx={{ width: '100%' }}>
                          <RadioGroup
                            value={answers[currentQuestion] || ''}
                            onChange={(e) => handleAnswerChange(currentQuestion, e.target.value)}
                          >
                            {questions[currentQuestion]?.options?.map((option, optionIndex) => (
                              <FormControlLabel
                                key={optionIndex}
                                value={optionIndex}
                                control={<Radio size={isMobile ? "medium" : "large"} />}
                                label={
                                  <Typography
                                    variant="body1"
                                    sx={{
                                      fontSize: { xs: '1rem', sm: '1.1rem' },
                                      ml: 1,
                                      wordBreak: 'break-word'
                                    }}
                                  >
                                    {String.fromCharCode(65 + optionIndex)}. {option}
                                  </Typography>
                                }
                                sx={{
                                  mb: { xs: 1.5, sm: 2 },
                                  p: { xs: 1.5, sm: 2 },
                                  border: 1,
                                  borderColor: answers[currentQuestion] === optionIndex ? 'primary.main' : 'grey.300',
                                  borderRadius: 2,
                                  bgcolor: answers[currentQuestion] === optionIndex ? 'primary.light' : 'transparent',
                                  width: '100%',
                                  margin: 0,
                                  marginBottom: { xs: 1.5, sm: 2 },
                                  '&:hover': {
                                    bgcolor: answers[currentQuestion] === optionIndex ? 'primary.light' : 'action.hover'
                                  }
                                }}
                              />
                            ))}
                          </RadioGroup>
                        </FormControl>

                        {/* Navigation Buttons */}
                        <Box sx={{
                          display: 'flex',
                          flexDirection: { xs: 'column', sm: 'row' },
                          justifyContent: 'space-between',
                          alignItems: { xs: 'stretch', sm: 'center' },
                          mt: { xs: 3, sm: 4 },
                          pt: { xs: 2, sm: 3 },
                          borderTop: 1,
                          borderColor: 'divider',
                          gap: { xs: 1, sm: 0 }
                        }}>
                          <Box sx={{
                            display: 'flex',
                            gap: 1,
                            justifyContent: { xs: 'space-between', sm: 'flex-start' }
                          }}>
                            <Button
                              variant="outlined"
                              onClick={handlePreviousQuestion}
                              disabled={currentQuestion === 0}
                              size={isMobile ? "medium" : "large"}
                              startIcon={<ArrowBackIcon />}
                              sx={{
                                fontSize: { xs: '0.875rem', sm: '1rem' },
                                flex: { xs: 1, sm: 'none' }
                              }}
                            >
                              Previous
                            </Button>

                            <Button
                              variant="outlined"
                              color="warning"
                              onClick={handleClearAnswer}
                              size={isMobile ? "medium" : "large"}
                              startIcon={<ClearIcon />}
                              sx={{
                                fontSize: { xs: '0.875rem', sm: '1rem' },
                                flex: { xs: 1, sm: 'none' }
                              }}
                            >
                              Clear
                            </Button>
                          </Box>

                          <Button
                            variant="contained"
                            onClick={handleNextQuestion}
                            disabled={currentQuestion === questions.length - 1}
                            size={isMobile ? "medium" : "large"}
                            endIcon={<ArrowForwardIcon />}
                            sx={{
                              fontSize: { xs: '0.875rem', sm: '1rem' }
                            }}
                          >
                            Next
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Box>
                )}
              </Box>
            )}
          </Box>

          {/* Desktop Right Sidebar - Timer and Question Navigation */}
          {!isMobile && (
            <Paper sx={{
              width: '280px',
              borderRadius: 0,
              borderLeft: 1,
              borderColor: 'divider',
              overflow: 'auto',
              p: 2
            }}>
              {/* Progress Section */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ color: 'info.main', fontWeight: 'bold' }}>
                  📊 Progress
                </Typography>
                <Typography variant="body2" gutterBottom>
                  Answered: {Object.values(answers).filter(a => a !== null && a !== undefined).length} / {questions?.length || 0}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={getProgress()}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    mb: 1
                  }}
                />
                <Typography variant="body2" color="text.secondary">
                  {getProgress().toFixed(1)}% Complete
                </Typography>
              </Box>

              {/* Question Navigation Grid */}
              <Box>
                <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                  🔢 Questions
                </Typography>
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 1,
                  mb: 2
                }}>
                  {questions?.map((question, index) => (
                    <Button
                      key={index}
                      variant={currentQuestion === index ? "contained" : "outlined"}
                      color={
                        answers[index] !== null && answers[index] !== undefined
                          ? "success"
                          : currentQuestion === index
                            ? "primary"
                            : "inherit"
                      }
                      size="small"
                      onClick={() => setCurrentQuestion(index)}
                      sx={{
                        minWidth: 'auto',
                        aspectRatio: '1',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        border: currentQuestion === index ? 2 : 1,
                        borderColor: currentQuestion === index ? 'primary.main' : 'inherit'
                      }}
                    >
                      {index + 1}
                    </Button>
                  ))}
                </Box>

                {/* Legend */}
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                    Legend:
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 16, height: 16, bgcolor: 'success.main', borderRadius: 1 }} />
                      <Typography variant="body2">Answered</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 16, height: 16, bgcolor: 'primary.main', borderRadius: 1 }} />
                      <Typography variant="body2">Current</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 16, height: 16, border: 1, borderColor: 'grey.400', borderRadius: 1 }} />
                      <Typography variant="body2">Not Answered</Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Paper>
          )}
        </Box>
      </Box>

      {/* Submit Confirmation Dialog */}
      <Dialog open={showSubmitDialog} onClose={() => setShowSubmitDialog(false)}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon color="warning" />
            Confirm Quiz Submission
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Are you sure you want to submit your quiz? Once submitted, you cannot make any changes.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Answered Questions: {Object.values(answers).filter(a => a !== null && a !== undefined).length} / {questions.length}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSubmitDialog(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={confirmSubmit}
            variant="contained"
            color="primary"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={20} /> : <SendIcon />}
          >
            {submitting ? 'Submitting...' : 'Submit Quiz'}
          </Button>
        </DialogActions>
      </Dialog>
    </QuizSecurity>
  );
};

export default PublicQuizTake;