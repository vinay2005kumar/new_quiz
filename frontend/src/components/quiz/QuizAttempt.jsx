import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  FormControl,
  FormControlLabel,
  RadioGroup,
  Radio,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Chip,
  Divider,
  Card,
  CardContent,
  useTheme,
  useMediaQuery,
  Drawer,
  IconButton
} from '@mui/material';
import {
  Timer as TimerIcon,
  Send as SendIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  Assessment as AssessmentIcon,
  Lock as LockIcon,
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import api from '../../config/axios';
import { useAuth } from '../../context/AuthContext';
import QuizSecurity from './QuizSecurity';

const QuizAttempt = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [quiz, setQuiz] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [showScoreSummary, setShowScoreSummary] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [displayMode, setDisplayMode] = useState('oneByOne'); // 'oneByOne' or 'allVertical'
  const [overrideState, setOverrideState] = useState({
    adminOverrideActive: false,
    personalOverrideActive: false,
    reEnableSecurity: null
  });
  // Mobile sidebar states
  const [showDetailsSidebar, setShowDetailsSidebar] = useState(false);
  const [showQuestionsSidebar, setShowQuestionsSidebar] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const fetchQuiz = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Fetching quiz details for ID:', id);
        
        // First fetch quiz details
        const quizResponse = await api.get(`/api/quiz/${id}`);
        if (!isMounted) return;
        
        console.log('Quiz response:', quizResponse);
        console.log('🔒 Quiz security settings from backend:', quizResponse.securitySettings);

        if (!quizResponse || !quizResponse.title) {
          throw new Error('Invalid quiz data received');
        }

        setQuiz(quizResponse);
        setDisplayMode(quizResponse.questionDisplayMode || 'oneByOne');

        // Check for existing submission first
        try {
          console.log('Checking for existing submission');
          const existingSubmission = await api.get(`/api/quiz/${id}/submission`);
          if (!isMounted) return;

          console.log('Existing submission:', existingSubmission);

          if (existingSubmission.status === 'started') {
            // Resume the ongoing attempt
            console.log('Resuming ongoing attempt');
            setSubmission(existingSubmission);
            const endTime = new Date(existingSubmission.startTime).getTime() + quizResponse.duration * 60000;
            const now = new Date().getTime();
            const remainingTime = Math.max(0, Math.floor((endTime - now) / 1000));
            setTimeLeft(remainingTime);
          } else {
            // If submission is completed or evaluated, redirect to review
            console.log('Submission already completed, redirecting to review');
            navigate(`/student/quizzes/${id}/review`);
            return;
          }
        } catch (submissionError) {
          console.log('No existing submission found, starting new attempt');
          // No existing submission found, try to start new attempt
          try {
            const newSubmission = await api.post(`/api/quiz/${id}/start`);
            if (!isMounted) return;
            
            console.log('New submission created:', newSubmission);
            setSubmission(newSubmission);
            setTimeLeft(quizResponse.duration * 60);
          } catch (startError) {
            console.error('Error starting quiz:', startError);
            if (startError.response?.status === 400 && startError.response?.data?.message === 'Quiz already attempted') {
              console.log('Quiz already attempted, redirecting to review');
              navigate(`/student/quizzes/${id}/review`);
              return;
            }
            throw startError;
          }
        }
        
        setLoading(false);
      } catch (error) {
        if (!isMounted) return;
        
        console.error('Error in quiz flow:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to load quiz';
        setError(errorMessage);
        
        if (errorMessage === 'Quiz already attempted') {
          navigate(`/student/quizzes/${id}/review`);
          return;
        }
        
        setLoading(false);
      }
    };

    fetchQuiz();
    
    return () => {
      isMounted = false;
    };
  }, [id, navigate]);

  useEffect(() => {
    if (submission?.startTime && quiz?.duration) {
      const endTime = new Date(submission.startTime).getTime() + quiz.duration * 60000;
      const interval = setInterval(() => {
        const now = new Date().getTime();
        const distance = endTime - now;

        if (distance < 0) {
          clearInterval(interval);
          handleSubmit();
        } else {
          setTimeLeft(Math.floor(distance / 1000));
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [submission, quiz]);

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: parseInt(value, 10)
    }));
  };

  const handleSubmit = async () => {
    try {
      const submissionData = {
        answers: Object.keys(answers).map(questionId => ({
          questionId,
          selectedOption: answers[questionId]
        }))
      };

      const response = await api.post(`/api/quiz/${id}/submit`, submissionData);

      setSubmissionResult(response);
      setShowScoreSummary(true);
      setShowConfirmSubmit(false);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to submit quiz');
    }
  };

  const handleReviewQuiz = () => {
    navigate(`/student/quizzes/${id}/review`);
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Clear current question answer
  const handleClearAnswer = () => {
    if (quiz?.questions && quiz.questions[currentQuestion]) {
      const questionId = quiz.questions[currentQuestion]._id;
      setAnswers(prev => {
        const newAnswers = { ...prev };
        delete newAnswers[questionId];
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
    if (quiz?.questions && currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const getProgress = () => {
    if (!quiz?.questions?.length) return 0;
    const answeredCount = Object.values(answers).filter(a => a !== null && a !== undefined).length;
    return (answeredCount / quiz.questions.length) * 100;
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

  return (
    <QuizSecurity
      securitySettings={quiz?.securitySettings || {}}
      onSecurityViolation={(violation) => {
        console.log('Security violation:', violation);
        // You can add additional handling here like logging to backend
      }}
      quizTitle={quiz?.title}
      onOverrideStateChange={setOverrideState}
    >
      <Box sx={{
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default'
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
          <Box sx={{
            display: 'flex',
            gap: { xs: 1, sm: 2 },
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'center' }
          }}>
            <Typography
              variant={isMobile ? "h6" : "h5"}
              component="h1"
              sx={{
                fontWeight: 'bold',
                fontSize: { xs: '1.25rem', sm: '1.5rem' },
                textAlign: { xs: 'left', sm: 'left' }
              }}
            >
              {quiz?.title}
            </Typography>
            {/* Re-enable Security Button */}
            {(overrideState.adminOverrideActive || overrideState.personalOverrideActive) && (
              <Button
                variant="contained"
                color="warning"
                size="small"
                onClick={overrideState.reEnableSecurity}
                startIcon={<LockIcon />}
                sx={{
                  fontWeight: 'bold',
                  animation: 'pulse 2s infinite',
                  boxShadow: 3
                }}
              >
                Re-enable Security
              </Button>
            )}
          </Box>
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 1, sm: 2 },
            flexDirection: { xs: 'row', sm: 'row' },
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
                  sx={{
                    minWidth: 'auto',
                    px: 1,
                    fontSize: '0.75rem'
                  }}
                >
                  📋
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setShowQuestionsSidebar(true)}
                  sx={{
                    minWidth: 'auto',
                    px: 1,
                    fontSize: '0.75rem'
                  }}
                >
                  📝
                </Button>
              </Box>
            )}

            <Chip
              icon={<TimerIcon sx={{ fontSize: { xs: '1rem', sm: '1.2rem' } }} />}
              label={formatTime(timeLeft)}
              color={timeLeft < 300 ? 'error' : 'primary'}
              variant="filled"
              size={isMobile ? "small" : "medium"}
              sx={{
                fontSize: { xs: '0.875rem', sm: '1rem' },
                fontWeight: 'bold'
              }}
            />
            <Button
              variant="contained"
              color="success"
              onClick={() => setShowConfirmSubmit(true)}
              startIcon={<SendIcon sx={{ fontSize: { xs: '1rem', sm: '1.2rem' } }} />}
              size={isMobile ? "small" : "medium"}
              sx={{
                fontSize: { xs: '0.875rem', sm: '1rem' },
                py: { xs: 0.75, sm: 1 }
              }}
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
              <strong>Total Questions:</strong> {quiz?.questions?.length || 0}
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Total Marks:</strong> {quiz?.totalMarks || 0}
            </Typography>
            {quiz?.subject && (
              <Typography variant="body2" gutterBottom>
                <strong>Subject:</strong> {quiz.subject.name || quiz.subject}
              </Typography>
            )}
          </Box>

          {/* Student Information */}
          <Box>
            <Typography variant="h6" gutterBottom sx={{
              color: 'secondary.main',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <PersonIcon />
              Student Details
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="body2" gutterBottom>
              <strong>Name:</strong> {user?.name}
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Email:</strong> {user?.email}
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Department:</strong> {user?.department}
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Year:</strong> {user?.year}
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Section:</strong> {user?.section}
            </Typography>
          </Box>
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
                  <strong>Total Questions:</strong> {quiz?.questions?.length || 0}
                </Typography>
                <Typography variant="body2" gutterBottom sx={{ color: 'text.primary' }}>
                  <strong>Total Marks:</strong> {quiz?.totalMarks || 0}
                </Typography>
                {quiz?.subject && (
                  <Typography variant="body2" gutterBottom sx={{ color: 'text.primary' }}>
                    <strong>Subject:</strong> {quiz.subject.name || quiz.subject}
                  </Typography>
                )}
              </Box>

              {/* Student Information */}
              <Typography variant="h6" gutterBottom sx={{
                color: 'secondary.main',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <PersonIcon />
                Student Details
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body2" gutterBottom sx={{ color: 'text.primary' }}>
                <strong>Name:</strong> {user?.name}
              </Typography>
              <Typography variant="body2" gutterBottom sx={{ color: 'text.primary' }}>
                <strong>Email:</strong> {user?.email}
              </Typography>
              <Typography variant="body2" gutterBottom sx={{ color: 'text.primary' }}>
                <strong>Department:</strong> {user?.department}
              </Typography>
              <Typography variant="body2" gutterBottom sx={{ color: 'text.primary' }}>
                <strong>Year:</strong> {user?.year}
              </Typography>
              <Typography variant="body2" gutterBottom sx={{ color: 'text.primary' }}>
                <strong>Section:</strong> {user?.section}
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
                {quiz?.questions?.map((question, index) => {
                  const isAnswered = answers[question._id] !== undefined && answers[question._id] !== null;
                  const isCurrent = index === currentQuestion;

                  return (
                    <Button
                      key={question._id}
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
          {quiz?.questions && quiz.questions.length > 0 && (
            <>
              {(displayMode === 'oneByOne' || isMobile) ? (
                /* One-by-One Display Mode (Always used on mobile) */
                currentQuestion < quiz.questions.length && (
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
                          Question {currentQuestion + 1} of {quiz.questions.length}
                        <Chip
                          label={`${quiz.questions[currentQuestion].marks} mark${quiz.questions[currentQuestion].marks !== 1 ? 's' : ''}`}
                          color="primary"
                          size={isMobile ? "small" : "small"}
                          sx={{
                            ml: { xs: 1, sm: 2 },
                            fontSize: { xs: '0.75rem', sm: '0.8125rem' }
                          }}
                        />
                        {quiz?.negativeMarkingEnabled && quiz.questions[currentQuestion].negativeMarks > 0 && (
                          <Chip
                            label={`-${quiz.questions[currentQuestion].negativeMarks} for wrong`}
                            color="warning"
                            size={isMobile ? "small" : "small"}
                            sx={{
                              ml: 1,
                              fontSize: { xs: '0.75rem', sm: '0.8125rem' }
                            }}
                          />
                        )}
                      </Typography>

                      {/* Question Text with UNIVERSAL Formatting Preservation */}
                      <Box sx={{ mb: { xs: 3, sm: 4 } }}>
                        <Box sx={{
                          p: { xs: 1.5, sm: 2 },
                          bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'divider',
                          fontSize: { xs: '1rem', sm: '1.1rem' },
                          lineHeight: 1.6,
                          overflow: 'auto',
                          maxHeight: { xs: '300px', sm: '400px' },
                          overflowY: 'auto'
                        }}
                        dangerouslySetInnerHTML={{ __html: quiz.questions[currentQuestion].question }}
                        />
                      </Box>

                      <FormControl component="fieldset" sx={{ width: '100%' }}>
                        <RadioGroup
                          value={answers[quiz.questions[currentQuestion]._id] || ''}
                          onChange={(e) => handleAnswerChange(quiz.questions[currentQuestion]._id, e.target.value)}
                        >
                          {quiz.questions[currentQuestion].options.map((option, optionIndex) => (
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
                                borderColor: answers[quiz.questions[currentQuestion]._id] === optionIndex ? 'primary.main' : 'grey.300',
                                borderRadius: 2,
                                bgcolor: answers[quiz.questions[currentQuestion]._id] === optionIndex ? 'primary.light' : 'transparent',
                                width: '100%',
                                margin: 0,
                                marginBottom: { xs: 1.5, sm: 2 },
                                '&:hover': {
                                  bgcolor: answers[quiz.questions[currentQuestion]._id] === optionIndex ? 'primary.light' : 'action.hover'
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
                          disabled={currentQuestion === quiz.questions.length - 1}
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
                )
              ) : (
                /* All Questions Vertically Display Mode - Desktop Only */
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {quiz.questions.map((question, index) => (
                    <Card key={question._id} id={`question-${index}`} sx={{
                      border: 2,
                      borderColor: answers[question._id] !== null && answers[question._id] !== undefined ? 'success.light' : 'primary.light',
                      boxShadow: 2,
                      position: 'relative'
                    }}>
                      <CardContent sx={{ p: 3 }}>
                        <Typography variant="h5" gutterBottom sx={{
                          color: 'primary.main',
                          fontWeight: 'bold',
                          mb: 2
                        }}>
                          Question {index + 1}
                          <Chip
                            label={`${question.marks} mark${question.marks !== 1 ? 's' : ''}`}
                            color="primary"
                            size="small"
                            sx={{ ml: 2 }}
                          />
                          {quiz?.negativeMarkingEnabled && question.negativeMarks > 0 && (
                            <Chip
                              label={`-${question.negativeMarks} for wrong`}
                              color="warning"
                              size="small"
                              sx={{ ml: 1 }}
                            />
                          )}
                          {answers[question._id] !== null && answers[question._id] !== undefined && (
                            <Chip
                              label="✓ Answered"
                              color="success"
                              size="small"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Typography>

                        {/* Question Text with UNIVERSAL Formatting Preservation */}
                        <Box sx={{ mb: 3 }}>
                          <div
                            style={{
                              padding: '16px',
                              backgroundColor: 'var(--question-bg, #f8f9fa)',
                              borderRadius: '8px',
                              border: '1px solid var(--question-border, #e9ecef)',
                              fontSize: '1.1rem',
                              lineHeight: 1.6,
                              overflow: 'auto',
                              maxHeight: '400px',
                              overflowY: 'auto'
                            }}
                            dangerouslySetInnerHTML={{ __html: question.question }}
                          />
                        </Box>

                        <FormControl component="fieldset" sx={{ width: '100%' }}>
                          <RadioGroup
                            value={answers[question._id] || ''}
                            onChange={(e) => handleAnswerChange(question._id, e.target.value)}
                          >
                            {question.options.map((option, optionIndex) => (
                              <FormControlLabel
                                key={optionIndex}
                                value={optionIndex}
                                control={<Radio />}
                                label={
                                  <Typography variant="body1" sx={{ fontSize: '1rem', ml: 1 }}>
                                    {String.fromCharCode(65 + optionIndex)}. {option}
                                  </Typography>
                                }
                                sx={{
                                  mb: 1,
                                  p: 1.5,
                                  border: 1,
                                  borderColor: answers[question._id] === optionIndex ? 'primary.main' : 'grey.300',
                                  borderRadius: 1,
                                  bgcolor: answers[question._id] === optionIndex ? 'primary.light' : 'transparent',
                                  '&:hover': {
                                    bgcolor: answers[question._id] === optionIndex ? 'primary.light' : 'action.hover'
                                  }
                                }}
                              />
                            ))}
                          </RadioGroup>
                        </FormControl>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}
            </>
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
          {/* Timer Section */}
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom sx={{ color: 'error.main', fontWeight: 'bold' }}>
              ⏰ Time Remaining
            </Typography>
            <Box sx={{
              p: 2,
              bgcolor: timeLeft < 300 ? 'error.light' : 'success.light',
              borderRadius: 2,
              border: 2,
              borderColor: timeLeft < 300 ? 'error.main' : 'success.main'
            }}>
              <Typography variant="h4" sx={{
                fontWeight: 'bold',
                color: timeLeft < 300 ? 'error.dark' : 'success.dark',
                fontFamily: 'monospace'
              }}>
                {formatTime(timeLeft)}
              </Typography>
            </Box>
          </Box>

          {/* Progress Section */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ color: 'info.main', fontWeight: 'bold' }}>
              📊 Progress
            </Typography>
            <Typography variant="body2" gutterBottom>
              Answered: {Object.values(answers).filter(a => a !== null && a !== undefined).length} / {quiz?.questions?.length || 0}
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
              {quiz?.questions?.map((question, index) => (
                <Button
                  key={index}
                  variant={
                    displayMode === 'oneByOne'
                      ? (currentQuestion === index ? "contained" : "outlined")
                      : "outlined"
                  }
                  color={
                    answers[question._id] !== null && answers[question._id] !== undefined
                      ? "success"
                      : displayMode === 'oneByOne' && currentQuestion === index
                        ? "primary"
                        : "inherit"
                  }
                  onClick={() => {
                    if (displayMode === 'oneByOne') {
                      setCurrentQuestion(index);
                    } else {
                      // Scroll to question in vertical mode
                      const questionElement = document.getElementById(`question-${index}`);
                      if (questionElement) {
                        questionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }
                  }}
                  sx={{
                    minWidth: '40px',
                    height: '40px',
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    border: displayMode === 'oneByOne' && currentQuestion === index ? 2 : 1,
                    borderColor: displayMode === 'oneByOne' && currentQuestion === index ? 'primary.main' : 'inherit'
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

      {/* Confirm Submit Dialog */}
      <Dialog
        open={showConfirmSubmit}
        onClose={() => setShowConfirmSubmit(false)}
      >
        <DialogTitle>
          Confirm Submission
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to submit the quiz? This action cannot be undone.
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography>
              Answered: {Object.keys(answers).length} of {quiz?.questions?.length || 0} questions
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmSubmit(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
          >
            Submit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Score Summary Dialog */}
      <Dialog
        open={showScoreSummary}
        onClose={() => setShowScoreSummary(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Quiz Completed!
        </DialogTitle>
        <DialogContent>
          {submissionResult && (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" gutterBottom>
                Your Score
              </Typography>
              <Typography variant="h2" color="primary" gutterBottom>
                {submissionResult.answers?.reduce((total, ans) => total + (ans.marks || 0), 0) || 0} / {quiz?.totalMarks || 0}
              </Typography>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                Questions Attempted: {Object.keys(answers).length} of {quiz?.questions?.length || 0}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleReviewQuiz}
            size="large"
          >
            Review Answers
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
    </QuizSecurity>
  );
};

export default QuizAttempt; 