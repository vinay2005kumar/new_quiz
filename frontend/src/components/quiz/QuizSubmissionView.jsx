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
  FormControl,
  Radio,
  Chip,
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
  const [quizData, setQuizData] = useState(null);
  const [submission, setSubmission] = useState(null);



  useEffect(() => {
    fetchData();
  }, [quizId, studentId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      // First fetch quiz details (same as student quiz review)
      const quizResponse = await api.get(`/api/quiz/${quizId}`);
      //console.log('Quiz response:', quizResponse);

      if (!quizResponse || !quizResponse.title) {
        throw new Error('Invalid quiz data received');
      }

      setQuizData(quizResponse);

      // Then fetch submission details (same as student quiz review)
      const submissionResponse = await api.get(`/api/quiz/${quizId}/submissions/${studentId}`);
      //console.log('Submission response:', submissionResponse);

      if (submissionResponse) {
        setSubmission(submissionResponse);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.response?.data?.message || error.message || 'Failed to load data');
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

          <Typography variant="h4" gutterBottom>
            Quiz Review: {quizData?.title || 'N/A'}
          </Typography>
          <Typography variant="h5" color="primary" gutterBottom>
            Score: {submission?.totalMarks || 0} / {quizData?.effectiveTotalMarks || quizData?.totalMarks || 0}
          </Typography>
          <Typography variant="body1" gutterBottom>
            Subject: {quizData?.subject?.name || 'N/A'}
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
        </Box>

        <Typography variant="body1" gutterBottom>
          <strong>Student:</strong> {submission.student?.name} ({submission.student?.admissionNumber})
        </Typography>
        <Typography variant="body1" gutterBottom>
          <strong>Department:</strong> {submission.student?.department}, Year {submission.student?.year}, Section {submission.student?.section}
        </Typography>
        <Typography variant="body1" gutterBottom sx={{ mb: 3 }}>
          <strong>Status:</strong> <Chip label="evaluated" size="small" color="success" />
        </Typography>

        {/* Questions and Answers */}
        {(quizData?.questions || []).map((question, index) => {
          const userAnswer = submission?.answers?.find(a => a.questionId === question._id);



          const getAnswerStatus = (question, selectedOption) => {
            if (!submission?.answers) {
              return 'unanswered';
            }
            const answer = submission.answers.find(a => a.questionId === question._id);
            if (!answer) {
              return 'unanswered';
            }
            return answer.isCorrect ? 'correct' : 'incorrect';
          };
          const answerStatus = getAnswerStatus(question, userAnswer?.selectedOption);

          return (
            <Paper
              key={question._id}
              sx={{
                p: 3,
                mb: 2,
                border: 2,
                borderColor: answerStatus === 'correct' ? 'success.main' :
                           answerStatus === 'incorrect' ? 'error.main' :
                           'warning.main'
              }}
            >
              <Typography variant="h6" gutterBottom>
                Question {index + 1}:
              </Typography>

              {/* Question Text with UNIVERSAL Formatting Preservation */}
              <Box sx={{
                p: 2,
                mb: 2,
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                fontSize: '0.9rem',
                lineHeight: 1.5,
                overflow: 'auto'
              }}
              dangerouslySetInnerHTML={{ __html: question.question }}
              />
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Marks: {userAnswer?.marks || 0} / {question.marks || 0}
                {quizData?.negativeMarkingEnabled && question.negativeMarks > 0 && (
                  <span style={{ marginLeft: '8px', color: '#f57c00' }}>
                    (Negative: -{question.negativeMarks})
                  </span>
                )}
              </Typography>

              <FormControl component="fieldset" fullWidth>
                <RadioGroup value={userAnswer?.selectedOption?.toString() || ''}>
                  {(question.options || []).map((option, optionIndex) => {
                    const isCorrectAnswer = optionIndex === question.correctAnswer;
                    const isUserAnswer = optionIndex === userAnswer?.selectedOption;

                    return (
                      <FormControlLabel
                        key={optionIndex}
                        value={optionIndex.toString()}
                        control={<Radio />}
                        label={
                          <Typography
                            sx={{
                              color: isCorrectAnswer ? 'success.main' :
                                     isUserAnswer && !userAnswer?.isCorrect ? 'error.main' :
                                     'text.primary',
                              '& span': {
                                ml: 1,
                                fontSize: '0.875rem',
                                color: 'text.secondary'
                              }
                            }}
                          >
                            {option}
                            {isCorrectAnswer && <span>(Correct Answer)</span>}
                            {isUserAnswer && !isCorrectAnswer && <span>(Your Answer)</span>}
                          </Typography>
                        }
                        sx={{ mb: 0.5 }}
                        disabled
                      />
                    );
                  })}
                </RadioGroup>
              </FormControl>

              <Box sx={{ mt: 1 }}>
                {userAnswer ? (
                  userAnswer.isCorrect ? (
                    <Typography color="success.main" variant="body2">
                      ✓ Correct! Marks: {userAnswer.marks}
                    </Typography>
                  ) : (
                    <Typography color="error.main" variant="body2">
                      ✗ Incorrect. Marks: {userAnswer.marks || 0}
                    </Typography>
                  )
                ) : (
                  <Typography color="warning.main" variant="body2">
                    Not answered
                  </Typography>
                )}
              </Box>
            </Paper>
          );
        })}
      </Paper>
    </Container>
  );
};

export default QuizSubmissionView;
