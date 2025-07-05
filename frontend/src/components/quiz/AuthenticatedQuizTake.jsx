import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
  LinearProgress,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Divider,
  useTheme,
  useMediaQuery,
  Drawer,
  IconButton
} from '@mui/material';
import {
  Timer as TimerIcon,
  Send as SendIcon,
  Warning as WarningIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import api from '../../config/axios';
import QuizSecurity from './QuizSecurity';

const AuthenticatedQuizTake = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showFullscreenDialog, setShowFullscreenDialog] = useState(false);
  const [fullscreenWarnings, setFullscreenWarnings] = useState(0);
  // Mobile sidebar states
  const [showDetailsSidebar, setShowDetailsSidebar] = useState(false);
  const [showQuestionsSidebar, setShowQuestionsSidebar] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [participant, setParticipant] = useState(null);
  const [sessionToken, setSessionToken] = useState(null);
  const [overrideState, setOverrideState] = useState({
    adminOverrideActive: false,
    personalOverrideActive: false,
    reEnableSecurity: null
  });

  useEffect(() => {
    // Check if we have the required data from login
    if (!location.state?.sessionToken) {
      navigate(`/quiz/${quizId}/login`);
      return;
    }

    setQuiz(location.state.quizData);
    setParticipant(location.state.participant);
    setSessionToken(location.state.sessionToken);

    // Enter fullscreen mode - TEMPORARILY DISABLED FOR TESTING
    // if (document.documentElement.requestFullscreen) {
    //   document.documentElement.requestFullscreen().catch(err => {
    //     console.log('Fullscreen request failed:', err);
    //   });
    // }

    fetchQuestions();
  }, [quizId, location.state]);

  // Enhanced full-screen security and prevention - TEMPORARILY DISABLED FOR TESTING
  /*
  useEffect(() => {
    const maxWarnings = 2;

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        const newWarningCount = fullscreenWarnings + 1;
        setFullscreenWarnings(newWarningCount);

        if (newWarningCount >= maxWarnings) {
          alert('⚠️ QUIZ TERMINATED!\n\n' +
                'You have exited full-screen mode multiple times.\n' +
                'Your quiz cannot be submitted and you will be redirected.\n\n' +
                'Contact the event manager if this was accidental.');
          navigate('/events');
          return;
        }

        // Show the fullscreen dialog
        setShowFullscreenDialog(true);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        alert('⚠️ Warning: Tab switching detected!\n\n' +
              'Please stay on the quiz tab. Multiple violations may result in automatic submission.\n\n' +
              'Focus on this tab to continue the quiz.');
      }
    };

    const handleKeyDown = (e) => {
      // Prevent common shortcuts and cheating attempts
      if (
        (e.ctrlKey && (e.key === 't' || e.key === 'n' || e.key === 'w' || e.key === 'Tab')) ||
        (e.altKey && e.key === 'Tab') ||
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.shiftKey && e.key === 'J') ||
        (e.ctrlKey && e.shiftKey && e.key === 'C') ||
        (e.ctrlKey && e.key === 'u') ||
        (e.ctrlKey && e.key === 's') ||
        (e.ctrlKey && e.key === 'p') ||
        (e.ctrlKey && e.key === 'a') ||
        e.key === 'F5' ||
        (e.ctrlKey && e.key === 'r') ||
        e.key === 'Escape'
      ) {
        e.preventDefault();
        alert('⚠️ This action is not allowed during the quiz!\n\n' +
              'Blocked action: ' + (e.ctrlKey ? 'Ctrl+' : '') + (e.altKey ? 'Alt+' : '') + e.key + '\n\n' +
              'Please focus on answering the quiz questions.');
      }
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
      alert('⚠️ Right-click is disabled during the quiz!\n\n' +
            'This is to maintain quiz integrity and prevent cheating.');
    };

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'Are you sure you want to leave the quiz? Your progress may be lost and the quiz may be terminated.';
      return e.returnValue;
    };

    // Prevent drag and drop
    const handleDragOver = (e) => {
      e.preventDefault();
    };

    const handleDrop = (e) => {
      e.preventDefault();
      alert('⚠️ Drag and drop is not allowed during the quiz!');
    };

    // Add event listeners
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Disable text selection
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';

    // Cleanup
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('drop', handleDrop);
      window.removeEventListener('beforeunload', handleBeforeUnload);

      // Re-enable text selection
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';

      // Exit fullscreen when component unmounts
      if (document.exitFullscreen && document.fullscreenElement) {
        document.exitFullscreen().catch(err => {
          console.log('Exit fullscreen failed:', err);
        });
      }
    };
  }, [navigate]);
  */

  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleAutoSubmit();
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeRemaining]);

  // Check if quiz still exists every 30 seconds
  useEffect(() => {
    if (!quizId) return;

    const checkQuizStatus = async () => {
      try {
        await api.get(`/api/event-quiz/${quizId}/status`);
      } catch (error) {
        if (error.response?.status === 404) {
          // Quiz has been deleted
          setError('');
          alert('⚠️ Quiz Deleted\n\n' +
                'This quiz has been deleted by the event manager.\n' +
                'You will be redirected to the events page.\n\n' +
                'If you had submitted answers, please contact the event manager for clarification.');
          navigate('/events');
        }
      }
    };

    // Check immediately and then every 30 seconds
    checkQuizStatus();
    const statusChecker = setInterval(checkQuizStatus, 30000);

    return () => clearInterval(statusChecker);
  }, [quizId, navigate]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('🔍 FETCH: Starting to fetch questions for quiz:', quizId);
      console.log('🔍 FETCH: Session token:', sessionToken || location.state?.sessionToken ? 'Available' : 'Missing');

      const response = await api.get(`/api/event-quiz/${quizId}/questions`, {
        headers: {
          sessionToken: sessionToken || location.state?.sessionToken
        }
      });

      console.log('🔍 FETCH: Response received:', response);
      console.log('🔍 FETCH: Response data:', response.data);
      console.log('🔍 FETCH: Direct response properties:', {
        questions: response.questions,
        timeRemaining: response.timeRemaining,
        quiz: response.quiz
      });

      // Handle different response formats
      let questionsData = null;
      let timeRemainingData = null;
      let quizData = null;

      if (response.data) {
        questionsData = response.data.questions;
        timeRemainingData = response.data.timeRemaining;
        quizData = response.data.quiz;
      } else {
        // Direct response format (our axios interceptor unwraps .data)
        questionsData = response.questions;
        timeRemainingData = response.timeRemaining;
        quizData = response.quiz;
      }

      console.log('🔍 FETCH: Questions data:', questionsData);
      console.log('🔍 FETCH: Questions count:', questionsData?.length || 0);

      if (!questionsData || !Array.isArray(questionsData) || questionsData.length === 0) {
        throw new Error('No questions received from server');
      }

      setQuestions(questionsData);
      setTimeRemaining(timeRemainingData || 3600000); // Default 1 hour if not provided
      setStartTime(new Date());

      // Set quiz data if available
      if (quizData) {
        setQuiz(quizData);
        console.log('🔍 FETCH: Quiz data set:', quizData);
        console.log('🔍 FETCH: Question display mode:', quizData.questionDisplayMode);
      } else {
        console.log('🔍 FETCH: No quiz data received');
      }

      // Initialize answers object
      const initialAnswers = {};
      questionsData.forEach((_, index) => {
        initialAnswers[index] = null;
      });
      setAnswers(initialAnswers);

      console.log('🔍 FETCH: Questions loaded successfully:', questionsData.length);
    } catch (error) {
      console.error('🔍 FETCH: Error loading questions:', error);
      console.error('🔍 FETCH: Error response:', error.response);
      setError(error.response?.data?.message || error.message || 'Failed to load quiz questions');
    } finally {
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

  const handleAutoSubmit = () => {
    console.log('⏰ Time is up! Auto-submitting quiz...');
    alert('⏰ Time is up! Your quiz will be automatically submitted.');
    confirmSubmit();
  };

  const confirmSubmit = async () => {
    try {
      console.log('🚀 SUBMIT: Starting quiz submission process...');
      setSubmitting(true);

      const timeTaken = startTime ? Math.floor((new Date() - startTime) / 1000) : 0;

      // Check if this is an emergency submission (simple check)
      const isEmergencySubmission = participant?.isEmergencyLogin === true;

      console.log('🚀 SUBMIT: Participant data:', participant);
      console.log('🚀 SUBMIT: isEmergencyLogin flag:', participant?.isEmergencyLogin);
      console.log('🚀 SUBMIT: Is emergency submission:', isEmergencySubmission);

      const submissionData = {
        participantEmail: participant?.participantDetails?.email,
        answers: Object.entries(answers)
          .filter(([questionIndex, selectedOption]) => selectedOption !== null && selectedOption !== undefined)
          .map(([questionIndex, selectedOption]) => ({
            questionIndex: parseInt(questionIndex),
            selectedOption
          })),
        timeTaken,
        isEmergencySubmission
      };

      console.log('🚀 SUBMIT: Raw answers object:', answers);
      console.log('🚀 SUBMIT: Filtered answers for submission:', submissionData.answers);
      console.log('🚀 SUBMIT: Submission data prepared:', submissionData);
      console.log('🚀 SUBMIT: Making API call to:', `/api/event-quiz/${quizId}/submit`);

      const response = await api.post(`/api/event-quiz/${quizId}/submit`, submissionData);

      console.log('🚀 SUBMIT: API call successful, response:', response.data);
      console.log('🚀 SUBMIT: Preparing navigation data...');

      const navigationState = {
        result: {
          ...response.data,
          quiz: quiz,
          totalQuestions: questions.length,
          timeTaken: Math.floor((new Date() - startTime) / 1000)
        },
        participant,
        isAuthenticated: true
      };

      console.log('🚀 SUBMIT: Navigation state prepared:', navigationState);
      console.log('🚀 SUBMIT: Attempting navigation to:', `/quiz/${quizId}/result`);

      // Navigate to results page with comprehensive data
      navigate(`/quiz/${quizId}/result`, {
        state: navigationState
      });

      console.log('🚀 SUBMIT: Navigation call completed');
    } catch (error) {
      console.error('🚀 SUBMIT: Error during submission:', error);
      console.error('🚀 SUBMIT: Error response:', error.response);
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

  const handleContinueFullscreen = () => {
    setShowFullscreenDialog(false);
    // Re-enter fullscreen
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log('Fullscreen re-entry failed:', err);
        alert('Failed to re-enter full-screen mode. Quiz will be terminated.');
        navigate('/events');
      });
    }
  };

  const handleExitQuiz = () => {
    setShowFullscreenDialog(false);
    alert('Quiz terminated by user. Redirecting to events page.');
    navigate('/events');
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading Quiz Questions...
        </Typography>
      </Container>
    );
  }

  if (error && !quiz) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={() => navigate(`/quiz/${quizId}/login`)}>
          Back to Login
        </Button>
      </Container>
    );
  }

  // Only render QuizSecurity if quiz data is loaded
  if (!quiz) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading Quiz...
        </Typography>
      </Container>
    );
  }

  return (
    <QuizSecurity
      securitySettings={quiz.securitySettings || {
        enableFullscreen: false,
        disableRightClick: false,
        disableCopyPaste: false,
        disableTabSwitch: false,
        enableProctoringMode: false
      }}
      onSecurityViolation={(violation) => {
        console.log('Security violation:', violation);
        // You can add additional handling here like logging to backend
      }}
      quizTitle={quiz.title}
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
              onClick={handleSubmit}
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={20} /> : <SendIcon sx={{ fontSize: { xs: '1rem', sm: '1.2rem' } }} />}
              size={isMobile ? "small" : "medium"}
              sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, py: { xs: 0.75, sm: 1 } }}
            >
              {submitting ? 'Submitting...' : (isMobile ? 'Submit' : 'Submit Quiz')}
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
        {/* Desktop Left Sidebar - Team/Quiz Details */}
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
                <strong>Total Questions:</strong> {questions.length}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Total Marks:</strong> {questions.reduce((sum, q) => sum + (q.marks || 1), 0)}
              </Typography>
              {quiz?.instructions && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Instructions:
                  </Typography>
                  <Typography variant="body2" sx={{
                    bgcolor: 'info.light',
                    p: 1,
                    borderRadius: 1,
                    fontSize: '0.85rem'
                  }}>
                    {quiz.instructions}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Participant Information */}
            {participant && (
              <Box>
                <Typography variant="h6" gutterBottom sx={{
                  color: 'secondary.main',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  {participant.participantDetails?.isTeamRegistration ? <GroupIcon /> : <PersonIcon />}
                  {participant.participantDetails?.isTeamRegistration ? 'Team Details' : 'Participant Details'}
                </Typography>
                <Divider sx={{ mb: 2 }} />

                {participant.participantDetails?.isTeamRegistration ? (
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      <strong>Team Name:</strong> {participant.participantDetails?.teamName}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Team Leader:</strong> {participant.participantDetails?.teamLeader?.name}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Email:</strong> {participant.participantDetails?.teamLeader?.email}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>College:</strong> {participant.participantDetails?.teamLeader?.college}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Members:</strong> {participant.participantDetails?.teamMembers?.length || 0} + 1 (Leader)
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      <strong>Name:</strong> {participant.participantDetails?.name}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Email:</strong> {participant.participantDetails?.email}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>College:</strong> {participant.participantDetails?.college}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Department:</strong> {participant.participantDetails?.department}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Year:</strong> {participant.participantDetails?.year}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
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
                  <strong>Total Questions:</strong> {questions.length}
                </Typography>
                <Typography variant="body2" gutterBottom sx={{ color: 'text.primary' }}>
                  <strong>Total Marks:</strong> {questions.reduce((sum, q) => sum + (q.marks || 1), 0)}
                </Typography>
                {quiz?.instructions && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1, color: 'text.primary' }}>
                      Instructions:
                    </Typography>
                    <Typography variant="body2" sx={{
                      bgcolor: 'info.light',
                      p: 1,
                      borderRadius: 1,
                      fontSize: '0.85rem',
                      color: 'text.primary'
                    }}>
                      {quiz.instructions}
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Participant Information */}
              {participant && (
                <Box>
                  <Typography variant="h6" gutterBottom sx={{
                    color: 'secondary.main',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    {participant.participantDetails?.isTeamRegistration ? <GroupIcon /> : <PersonIcon />}
                    {participant.participantDetails?.isTeamRegistration ? 'Team Details' : 'Participant Details'}
                  </Typography>
                  <Divider sx={{ mb: 2 }} />

                  {participant.participantDetails?.isTeamRegistration ? (
                    <Box>
                      <Typography variant="body2" gutterBottom sx={{ color: 'text.primary' }}>
                        <strong>Team Name:</strong> {participant.participantDetails?.teamName}
                      </Typography>
                      <Typography variant="body2" gutterBottom sx={{ color: 'text.primary' }}>
                        <strong>Team Leader:</strong> {participant.participantDetails?.teamLeader?.name}
                      </Typography>
                      <Typography variant="body2" gutterBottom sx={{ color: 'text.primary' }}>
                        <strong>Email:</strong> {participant.participantDetails?.teamLeader?.email}
                      </Typography>
                      <Typography variant="body2" gutterBottom sx={{ color: 'text.primary' }}>
                        <strong>College:</strong> {participant.participantDetails?.teamLeader?.college}
                      </Typography>
                      <Typography variant="body2" gutterBottom sx={{ color: 'text.primary' }}>
                        <strong>Members:</strong> {participant.participantDetails?.teamMembers?.length || 0} + 1 (Leader)
                      </Typography>
                    </Box>
                  ) : (
                    <Box>
                      <Typography variant="body2" gutterBottom sx={{ color: 'text.primary' }}>
                        <strong>Name:</strong> {participant.participantDetails?.name}
                      </Typography>
                      <Typography variant="body2" gutterBottom sx={{ color: 'text.primary' }}>
                        <strong>Email:</strong> {participant.participantDetails?.email}
                      </Typography>
                      <Typography variant="body2" gutterBottom sx={{ color: 'text.primary' }}>
                        <strong>College:</strong> {participant.participantDetails?.college}
                      </Typography>
                      <Typography variant="body2" gutterBottom sx={{ color: 'text.primary' }}>
                        <strong>Department:</strong> {participant.participantDetails?.department}
                      </Typography>
                      <Typography variant="body2" gutterBottom sx={{ color: 'text.primary' }}>
                        <strong>Year:</strong> {participant.participantDetails?.year}
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
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
                        {questions[currentQuestion]?.marks && (
                          <Chip
                            label={`${questions[currentQuestion].marks} mark${questions[currentQuestion].marks !== 1 ? 's' : ''}`}
                            color="primary"
                            size="small"
                            sx={{ ml: 2 }}
                          />
                        )}
                      </Typography>

                      {/* Question Text */}
                      <Box sx={{ mb: { xs: 3, sm: 4 } }}>
                        <Typography
                          variant="body1"
                          sx={{
                            fontSize: { xs: '1rem', sm: '1.1rem' },
                            lineHeight: 1.6,
                            mb: 2,
                            whiteSpace: 'pre-wrap'
                          }}
                        >
                          {questions[currentQuestion]?.question}
                        </Typography>
                      </Box>

                      <FormControl component="fieldset" sx={{ width: '100%' }}>
                        <RadioGroup
                          value={answers[currentQuestion] || ''}
                          onChange={(e) => setAnswers(prev => ({
                            ...prev,
                            [currentQuestion]: parseInt(e.target.value)
                          }))}
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
      </Box>
    </QuizSecurity>
  );
};

export default AuthenticatedQuizTake;
