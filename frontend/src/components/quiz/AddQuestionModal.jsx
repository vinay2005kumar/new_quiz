import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  Tabs,
  Tab,
  Alert,
  Paper,
  Chip
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Description as WordIcon,
  TableChart as ExcelIcon,
  Image as ImageIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';

// Import the existing quiz form components
import ManualQuizForm from './quiz-forms/ManualQuizForm';
import WordQuizForm from './quiz-forms/WordQuizForm';
import ExcelQuizForm from './quiz-forms/ExcelQuizForm';
import ImageQuizForm from './quiz-forms/ImageQuizForm';

const AddQuestionModal = ({ 
  open, 
  onClose, 
  onQuestionsAdded, 
  negativeMarkingEnabled = false,
  isEventQuiz = false 
}) => {
  const [selectedMethod, setSelectedMethod] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showReview, setShowReview] = useState(false);

  const handleMethodChange = (event, newValue) => {
    setSelectedMethod(newValue);
    setError('');
    setSuccess('');
    setQuestions([]);
    setShowReview(false);
  };

  const handleClose = () => {
    setSelectedMethod(0);
    setQuestions([]);
    setError('');
    setSuccess('');
    setShowReview(false);
    onClose();
  };

  const handleQuestionsUpdate = (newQuestions) => {
    setQuestions(newQuestions);
    setError('');
    // Only show review step for file uploads, not for manual entry
    if (selectedMethod !== 0) {
      setShowReview(true);
    }
  };

  const handleBackToUpload = () => {
    setShowReview(false);
    setQuestions([]);
    setError('');
    setSuccess('');
  };

  const handleAddQuestions = () => {
    if (!questions || questions.length === 0) {
      setError('Please add at least one question before proceeding.');
      return;
    }

    // Validate questions
    const invalidQuestions = questions.filter((q, index) => {
      return !q.question?.trim() ||
             !q.options?.every(opt => opt?.trim()) ||
             q.correctAnswer === undefined ||
             q.correctAnswer < 0 ||
             q.correctAnswer > 3 ||
             !q.marks || q.marks < 1 ||
             q.negativeMarks === undefined || q.negativeMarks < 0;
    });

    if (invalidQuestions.length > 0) {
      setError('Please ensure all questions have valid text, options, correct answers, marks (≥1), and negative marks (≥0).');
      return;
    }

    // Call the parent callback with the new questions
    onQuestionsAdded(questions);
    setSuccess(`Successfully added ${questions.length} question(s)!`);
    
    // Close modal after a brief delay
    setTimeout(() => {
      handleClose();
    }, 1500);
  };

  const methodOptions = [
    {
      id: 0,
      title: 'Manual Entry',
      description: 'Create questions using form fields',
      icon: <EditIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      color: 'primary.light'
    },
    {
      id: 1,
      title: 'Excel Upload',
      description: 'Upload questions from Excel file',
      icon: <ExcelIcon sx={{ fontSize: 40, color: 'success.main' }} />,
      color: 'success.light'
    },
    {
      id: 2,
      title: 'Word Upload',
      description: 'Upload questions from Word document',
      icon: <WordIcon sx={{ fontSize: 40, color: 'info.main' }} />,
      color: 'info.light'
    },
    {
      id: 3,
      title: 'Image Upload',
      description: 'Extract questions from images using OCR',
      icon: <ImageIcon sx={{ fontSize: 40, color: 'warning.main' }} />,
      color: 'warning.light'
    }
  ];

  const renderQuestionForm = () => {
    const commonProps = {
      onQuestionsUpdate: handleQuestionsUpdate,
      error: error,
      setError: setError,
      negativeMarkingEnabled: negativeMarkingEnabled,
      isAddMode: true, // Flag to indicate this is for adding questions
      isEventQuiz: isEventQuiz, // Flag to determine which API endpoints to use
      onNext: () => {}, // Dummy function for modal context - forms don't need to navigate
      onPrevious: () => {} // Dummy function for modal context
    };

    switch (selectedMethod) {
      case 0:
        // For manual form, ensure we have at least one empty question to start with
        const manualQuestions = questions.length === 0 ? [{
          question: '',
          options: ['', '', '', ''],
          correctAnswer: 0,
          marks: 1,
          negativeMarks: negativeMarkingEnabled ? 1 : 0
        }] : questions;

        return (
          <ManualQuizForm
            {...commonProps}
            questions={manualQuestions}
            isReview={false}
            hideNavigation={true}
          />
        );
      case 1:
        return (
          <ExcelQuizForm
            {...commonProps}
            hideNavigation={true}
          />
        );
      case 2:
        return (
          <WordQuizForm
            {...commonProps}
            hideNavigation={true}
          />
        );
      case 3:
        return (
          <ImageQuizForm
            {...commonProps}
            hideNavigation={true}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5">Add Questions to Quiz</Typography>
          <IconButton onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {!showReview ? (
          <>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs
                value={selectedMethod}
                onChange={handleMethodChange}
                variant="fullWidth"
                aria-label="question input method tabs"
              >
                {methodOptions.map((method) => (
                  <Tab
                    key={method.id}
                    label={method.title}
                    icon={method.icon}
                    iconPosition="start"
                  />
                ))}
              </Tabs>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {methodOptions[selectedMethod].description}
              </Typography>
            </Box>

            {renderQuestionForm()}
          </>
        ) : (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Button
                startIcon={<ArrowBackIcon />}
                onClick={handleBackToUpload}
                variant="outlined"
                sx={{ mr: 2 }}
              >
                Back to Upload
              </Button>
              <Typography variant="h6">
                Review Questions ({questions.length} question{questions.length !== 1 ? 's' : ''})
              </Typography>
            </Box>

            <Box sx={{ maxHeight: '60vh', overflow: 'auto' }}>
              {questions.map((question, index) => (
                <Paper key={index} sx={{ p: 3, mb: 2, border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                    Question {index + 1}
                  </Typography>

                  <Box sx={{
                    mb: 2,
                    p: 2,
                    backgroundColor: 'action.hover',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    fontSize: '1rem',
                    lineHeight: 1.6,
                    overflow: 'auto'
                  }}
                  dangerouslySetInnerHTML={{ __html: question.question }}
                  />

                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    {question.options?.map((option, optIndex) => (
                      <Grid item xs={12} sm={6} key={optIndex}>
                        <Box sx={{
                          p: 1.5,
                          border: '1px solid',
                          borderColor: question.correctAnswer === optIndex ? 'success.main' : 'divider',
                          borderRadius: 1,
                          backgroundColor: question.correctAnswer === optIndex ? 'success.dark' : 'action.hover',
                          whiteSpace: 'pre-wrap'
                        }}>
                          <Typography variant="body2">
                            <strong>{String.fromCharCode(65 + optIndex)}) </strong>
                            {option}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>

                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Chip
                      label={`Marks: ${question.marks || 1}`}
                      color="primary"
                      size="small"
                    />
                    {question.negativeMarks > 0 && (
                      <Chip
                        label={`Negative: ${question.negativeMarks}`}
                        color="error"
                        size="small"
                      />
                    )}
                    <Chip
                      label={`Correct: ${String.fromCharCode(65 + question.correctAnswer)}`}
                      color="success"
                      size="small"
                    />
                  </Box>
                </Paper>
              ))}
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button onClick={handleClose} variant="outlined">
          Cancel
        </Button>

        {/* For manual form, show Add Questions button when questions are valid */}
        {selectedMethod === 0 && !showReview && questions.length > 0 && (
          <Button
            onClick={handleAddQuestions}
            variant="contained"
            disabled={!questions || questions.length === 0 || questions.some(q =>
              !q.question.trim() || q.options.some(opt => !opt.trim())
            )}
          >
            Add {questions.length > 0 ? `${questions.length} ` : ''}Question{questions.length !== 1 ? 's' : ''} to Quiz
          </Button>
        )}

        {/* For file uploads, show Add Questions button in review mode */}
        {showReview && (
          <Button
            onClick={handleAddQuestions}
            variant="contained"
            disabled={!questions || questions.length === 0}
          >
            Add {questions.length > 0 ? `${questions.length} ` : ''}Question{questions.length !== 1 ? 's' : ''} to Quiz
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AddQuestionModal;
