import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Divider,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Timer as TimerIcon,
  Quiz as QuizIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Home as HomeIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';

const QuizResult = () => {
  const { quizId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Get data from navigation state
  const result = location.state?.result;
  const participant = location.state?.participant;
  const isAuthenticated = location.state?.isAuthenticated;

  useEffect(() => {
    // If no result data, redirect to events page
    if (!result) {
      navigate('/events');
    }
  }, [result, navigate]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score, total) => {
    const percentage = (score / total) * 100;
    if (percentage >= 80) return 'success';
    if (percentage >= 60) return 'warning';
    return 'error';
  };

  const handleClose = () => {
    navigate('/events');
  };

  if (!result) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading results...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        {/* Success Header */}
        <Box sx={{ mb: 4 }}>
          <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
          <Typography variant="h3" gutterBottom sx={{ color: 'success.main', fontWeight: 'bold' }}>
            🎉 Quiz Completed!
          </Typography>
          <Typography variant="h5" color="text.secondary" gutterBottom>
            Thank you for taking the quiz
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Your responses have been successfully submitted and recorded.
          </Typography>
        </Box>

        <Divider sx={{ my: 4 }} />

        {/* Quiz Information */}
        <Card sx={{ mb: 3, bgcolor: 'primary.light', border: 1, borderColor: 'primary.main' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <QuizIcon />
              {result.quiz?.title || 'Quiz'}
            </Typography>
            {result.quiz?.description && (
              <Typography variant="body2" color="text.secondary">
                {result.quiz.description}
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* Results Summary */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                {result.score || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Score
              </Typography>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h4" sx={{ color: 'info.main', fontWeight: 'bold' }}>
                {result.totalQuestions || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Questions
              </Typography>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h4" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                {result.correctAnswers || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Correct Answers
              </Typography>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h4" sx={{ color: 'warning.main', fontWeight: 'bold' }}>
                {formatTime(result.timeTaken || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Time Taken
              </Typography>
            </Card>
          </Grid>
        </Grid>

        {/* Performance Summary */}
        <Card sx={{ mb: 3, bgcolor: 'background.default' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <AssessmentIcon />
              Performance Summary
            </Typography>
            
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap', mt: 2 }}>
              <Chip
                label={`${result.correctAnswers || 0}/${result.totalQuestions || 0} Correct`}
                color={getScoreColor(result.correctAnswers || 0, result.totalQuestions || 1)}
                variant="filled"
                size="large"
              />
              
              {result.totalMarks && (
                <Chip
                  label={`${result.score || 0}/${result.totalMarks} Marks`}
                  color={getScoreColor(result.score || 0, result.totalMarks)}
                  variant="filled"
                  size="large"
                />
              )}
              
              <Chip
                label={`${Math.round(((result.correctAnswers || 0) / (result.totalQuestions || 1)) * 100)}% Accuracy`}
                color={getScoreColor(result.correctAnswers || 0, result.totalQuestions || 1)}
                variant="outlined"
                size="large"
              />
            </Box>
          </CardContent>
        </Card>

        {/* Participant Information */}
        {participant && (
          <Card sx={{ mb: 3, bgcolor: 'secondary.light' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                {participant.isTeam ? <GroupIcon /> : <PersonIcon />}
                Participant Information
              </Typography>
              
              {participant.isTeam ? (
                <Box>
                  <Typography variant="body1" gutterBottom>
                    <strong>Team:</strong> {participant.teamName}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Team Leader:</strong> {participant.participantDetails?.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {participant.participantDetails?.email}
                  </Typography>
                </Box>
              ) : (
                <Box>
                  <Typography variant="body1" gutterBottom>
                    <strong>Name:</strong> {participant.participantDetails?.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {participant.participantDetails?.email}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        )}

        {/* Thank You Message */}
        <Alert severity="success" sx={{ mb: 4, textAlign: 'left' }}>
          <Typography variant="h6" gutterBottom>
            🌟 Congratulations!
          </Typography>
          <Typography variant="body1" paragraph>
            You have successfully completed the quiz. Your responses have been recorded and will be reviewed by the event organizers.
          </Typography>
          <Typography variant="body2">
            Results and further communications will be shared via email. Thank you for your participation!
          </Typography>
        </Alert>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<HomeIcon />}
            onClick={handleClose}
            sx={{ minWidth: 200 }}
          >
            Back to Events
          </Button>
        </Box>

        {/* Footer */}
        <Box sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary">
            Quiz completed at {new Date().toLocaleString()}
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default QuizResult;
