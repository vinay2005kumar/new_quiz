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
  const { quizId, studentId } = useParams();
  const navigate = useNavigate();
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

      const response = await api.get(`/api/event-quizzes/${quizId}/submission/${studentId}`);
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
        <Alert severity="error">{error}</Alert>
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
                  {submission.quiz.questions.map((question, index) => (
                    <React.Fragment key={index}>
                      <ListItem>
                        <Box sx={{ width: '100%' }}>
                          <Typography variant="subtitle1" gutterBottom>
                            <strong>Question {index + 1}:</strong> {question.question}
                            {' '}({question.marks} marks)
                          </Typography>
                          <RadioGroup
                            value={submission.answers[index]}
                            sx={{ ml: 2 }}
                          >
                            {question.options.map((option, optIndex) => (
                              <FormControlLabel
                                key={optIndex}
                                value={optIndex}
                                control={<Radio />}
                                label={option}
                                sx={{
                                  color: optIndex === question.correctAnswer ? 'success.main' : 
                                        submission.answers[index] === optIndex ? 'error.main' : 'inherit'
                                }}
                                disabled
                              />
                            ))}
                          </RadioGroup>
                          <Box sx={{ mt: 1 }}>
                            <Typography color={submission.answers[index] === question.correctAnswer ? 'success.main' : 'error.main'}>
                              {submission.answers[index] === question.correctAnswer ? 
                                '✓ Correct' : 
                                `✗ Incorrect (Correct answer: ${question.options[question.correctAnswer]})`}
                            </Typography>
                          </Box>
                        </Box>
                      </ListItem>
                      {index < submission.quiz.questions.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
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