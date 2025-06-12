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
  FormLabel,
  Alert,
  CircularProgress,
  LinearProgress,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Chip
} from '@mui/material';
import {
  Timer as TimerIcon,
  Quiz as QuizIcon,
  Send as SendIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import api from '../../config/axios';

const PublicQuizTake = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  
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

  useEffect(() => {
    fetchQuiz();
  }, [quizId]);

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

  const fetchQuiz = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/event-quiz/${quizId}/public-access`);
      
      if (response.data.isActive) {
        setQuiz(response.data.quiz);
        setQuestions(response.data.questions);
        setTimeRemaining(response.data.timeRemaining);
        setStartTime(new Date());
        
        // Initialize answers object
        const initialAnswers = {};
        response.data.questions.forEach((_, index) => {
          initialAnswers[index] = null;
        });
        setAnswers(initialAnswers);
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to load quiz');
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
    // Validate participant info
    if (!participantInfo.name || !participantInfo.email || !participantInfo.college) {
      setError('Please fill in your name, email, and college before submitting');
      return;
    }
    setShowSubmitDialog(true);
  };

  const handleAutoSubmit = () => {
    if (!participantInfo.name || !participantInfo.email || !participantInfo.college) {
      setError('Time is up! Please quickly fill in your details to submit');
      setShowSubmitDialog(true);
      return;
    }
    confirmSubmit();
  };

  const confirmSubmit = async () => {
    try {
      setSubmitting(true);
      
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
      
      // Navigate to results page
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
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={() => navigate('/events')}>
          Back to Events
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
      {/* Quiz Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1">
            {quiz?.title}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip 
              icon={<TimerIcon />} 
              label={formatTime(timeRemaining)} 
              color={timeRemaining < 300000 ? 'error' : 'primary'}
              variant="outlined"
            />
          </Box>
        </Box>
        
        <Typography variant="body1" color="text.secondary" paragraph>
          {quiz?.description}
        </Typography>
        
        {quiz?.instructions && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Instructions:</Typography>
            {quiz.instructions}
          </Alert>
        )}

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Progress: {Object.values(answers).filter(a => a !== null).length} of {questions.length} questions answered
          </Typography>
          <LinearProgress variant="determinate" value={getProgress()} sx={{ mt: 1 }} />
        </Box>
      </Paper>

      {/* Participant Information */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Your Information
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Full Name"
              value={participantInfo.name}
              onChange={(e) => setParticipantInfo(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={participantInfo.email}
              onChange={(e) => setParticipantInfo(prev => ({ ...prev, email: e.target.value }))}
              required
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="College"
              value={participantInfo.college}
              onChange={(e) => setParticipantInfo(prev => ({ ...prev, college: e.target.value }))}
              required
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Department"
              value={participantInfo.department}
              onChange={(e) => setParticipantInfo(prev => ({ ...prev, department: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Year"
              value={participantInfo.year}
              onChange={(e) => setParticipantInfo(prev => ({ ...prev, year: e.target.value }))}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Questions */}
      {questions.map((question, index) => (
        <Card key={index} sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Question {index + 1} ({question.marks} mark{question.marks !== 1 ? 's' : ''})
            </Typography>
            <Typography variant="body1" paragraph>
              {question.question}
            </Typography>
            
            <FormControl component="fieldset">
              <RadioGroup
                value={answers[index] || ''}
                onChange={(e) => handleAnswerChange(index, e.target.value)}
              >
                {question.options.map((option, optionIndex) => (
                  <FormControlLabel
                    key={optionIndex}
                    value={optionIndex}
                    control={<Radio />}
                    label={`${String.fromCharCode(65 + optionIndex)}. ${option}`}
                  />
                ))}
              </RadioGroup>
            </FormControl>
          </CardContent>
        </Card>
      ))}

      {/* Submit Button */}
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Button
          variant="contained"
          size="large"
          onClick={handleSubmit}
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={20} /> : <SendIcon />}
        >
          {submitting ? 'Submitting...' : 'Submit Quiz'}
        </Button>
      </Paper>

      {/* Submit Confirmation Dialog */}
      <Dialog open={showSubmitDialog} onClose={() => !submitting && setShowSubmitDialog(false)}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon color="warning" />
            Confirm Submission
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography paragraph>
            Are you sure you want to submit your quiz? You have answered{' '}
            {Object.values(answers).filter(a => a !== null).length} out of {questions.length} questions.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Once submitted, you cannot change your answers.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSubmitDialog(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button 
            onClick={confirmSubmit} 
            variant="contained" 
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={20} /> : null}
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PublicQuizTake;
