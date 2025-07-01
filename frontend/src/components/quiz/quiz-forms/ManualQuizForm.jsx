import { useState, useCallback, useEffect, memo } from 'react';
import {
  Box,
  Grid,
  TextField,
  Button,
  Paper,
  Typography,
  IconButton,
  Radio,
  Alert,
  CircularProgress
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import api from '../../../config/axios';

// Create a memoized Question component
const Question = memo(({
  question,
  questionIndex,
  onQuestionChange,
  onOptionChange,
  onRemove,
  isReview
}) => (
  <Paper sx={{ p: 2, mb: 2 }}>
    <Grid container spacing={2}>
      <Grid item xs={11}>
        {/* Question Text with UNIVERSAL Formatting Preservation */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Question {questionIndex + 1} (all formatting preserved):
          </Typography>

          {/* Display formatted question text for easy reading */}
          {question.question && (
            <Box sx={{
              p: 2,
              mb: 2,
              bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
              fontFamily: 'monospace',
              fontSize: '0.9rem',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap', // ALWAYS preserve all formatting
              overflow: 'auto',
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              {question.question}
            </Box>
          )}

          <TextField
            fullWidth
            label={`Enter Question ${questionIndex + 1}`}
            value={question.question}
            onChange={(e) => onQuestionChange(questionIndex, 'question', e.target.value)}
            required
            disabled={isReview}
            multiline
            rows={4}
            sx={{
              '& .MuiInputBase-input': {
                fontFamily: 'monospace',
                fontSize: '0.9rem',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap' // ALWAYS preserve formatting
              }
            }}
          />
        </Box>
      </Grid>
      <Grid item xs={1}>
        {!isReview && (
          <IconButton
            color="error"
            onClick={() => onRemove(questionIndex)}
          >
            <DeleteIcon />
          </IconButton>
        )}
      </Grid>

      {question.options.map((option, optionIndex) => (
        <Grid item xs={12} sm={6} key={optionIndex}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Radio
              checked={question.correctAnswer === optionIndex}
              onChange={() => onQuestionChange(questionIndex, 'correctAnswer', optionIndex)}
              value={optionIndex}
              disabled={isReview}
            />
            <TextField
              fullWidth
              label={`Option ${optionIndex + 1}`}
              value={option}
              onChange={(e) => onOptionChange(questionIndex, optionIndex, e.target.value)}
              required
              disabled={isReview}
            />
          </Box>
        </Grid>
      ))}

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          type="number"
          label="Marks (for correct answer)"
          value={question.marks}
          onChange={(e) => onQuestionChange(questionIndex, 'marks', Number(e.target.value))}
          required
          inputProps={{ min: 1 }}
          disabled={isReview}
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          type="number"
          label="Negative Marks (for wrong answer)"
          value={question.negativeMarks || 0}
          onChange={(e) => onQuestionChange(questionIndex, 'negativeMarks', Number(e.target.value))}
          inputProps={{ min: 0, step: 0.25 }}
          disabled={isReview}
          helperText="Marks deducted for wrong answer (0 = no negative marking)"
        />
      </Grid>
    </Grid>
  </Paper>
));

Question.displayName = 'Question';

const ManualQuizForm = ({
  onNext,
  questions,
  onQuestionsUpdate,
  isReview,
  error,
  setError,
  negativeMarkingEnabled = false
}) => {
  const [loading, setLoading] = useState(false);

  // Effect to update negative marks when negative marking is toggled
  useEffect(() => {
    if (isReview) return;

    const updatedQuestions = questions.map(question => {
      // If negative marking is disabled, set all negative marks to 0
      if (!negativeMarkingEnabled) {
        return { ...question, negativeMarks: 0 };
      }

      // If negative marking is enabled and question has no negative marks set, use marks value as default
      if (negativeMarkingEnabled && (question.negativeMarks === undefined || question.negativeMarks === 0)) {
        const defaultNegativeMarks = question.marks || 1;
        return { ...question, negativeMarks: defaultNegativeMarks };
      }

      // Keep existing negative marks if they were explicitly set
      return question;
    });

    // Only update if there are actual changes
    const hasChanges = updatedQuestions.some((q, index) =>
      q.negativeMarks !== questions[index].negativeMarks
    );

    if (hasChanges) {
      onQuestionsUpdate(updatedQuestions);
    }
  }, [negativeMarkingEnabled, questions, onQuestionsUpdate, isReview]);

  const handleQuestionChange = useCallback((index, field, value) => {
    if (isReview) return;

    onQuestionsUpdate(questions.map((q, i) => {
      if (i === index) {
        const updatedQuestion = { ...q, [field]: value };

        // If marks are changed and negative marking is enabled, auto-update negative marks
        if (field === 'marks' && negativeMarkingEnabled) {
          const newMarks = Number(value);
          const currentNegativeMarks = q.negativeMarks || 0;

          // Calculate expected default based on old marks (equal to marks value)
          const oldMarks = q.marks || 1;
          const expectedDefault = oldMarks;

          // Only auto-update if current negative marks seem to be default or 0
          if (currentNegativeMarks === 0 || currentNegativeMarks === expectedDefault) {
            updatedQuestion.negativeMarks = newMarks;
          }
        }

        return updatedQuestion;
      }
      return q;
    }));
  }, [questions, onQuestionsUpdate, isReview, negativeMarkingEnabled]);

  const handleOptionChange = useCallback((questionIndex, optionIndex, value) => {
    if (isReview) return;
    
    onQuestionsUpdate(questions.map((q, i) => {
      if (i === questionIndex) {
        const newOptions = [...q.options];
        newOptions[optionIndex] = value;
        return { ...q, options: newOptions };
      }
      return q;
    }));
  }, [questions, onQuestionsUpdate, isReview]);

  const addQuestion = useCallback(() => {
    if (isReview) return;

    // Calculate default negative marks based on positive marks (equal to marks value)
    const defaultMarks = 1;
    const defaultNegativeMarks = negativeMarkingEnabled ? defaultMarks : 0;

    onQuestionsUpdate([
      ...questions,
      {
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        marks: defaultMarks,
        negativeMarks: defaultNegativeMarks
      }
    ]);
  }, [questions, onQuestionsUpdate, isReview, negativeMarkingEnabled]);

  const removeQuestion = useCallback((index) => {
    if (isReview) return;
    
    if (questions.length > 1) {
      onQuestionsUpdate(questions.filter((_, i) => i !== index));
    }
  }, [questions, onQuestionsUpdate, isReview]);

  const handleNext = async () => {
    try {
      setLoading(true);
      setError('');

      // Validate questions
      questions.forEach((q, i) => {
        if (!q.question) throw new Error(`Question ${i + 1} is empty`);
        if (q.options.some(opt => !opt)) throw new Error(`All options for question ${i + 1} are required`);
        if (!q.marks) throw new Error(`Marks for question ${i + 1} are required`);
      });

      // Call onNext if validation passes
      onNext();
    } catch (error) {
      setError(error.message || 'Please fill in all required fields');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12}>
          {!isReview && (
            <Typography variant="h6" gutterBottom>
              Questions
            </Typography>
          )}
          
          {questions.map((question, index) => (
            <Question
              key={index}
              question={question}
              questionIndex={index}
              onQuestionChange={handleQuestionChange}
              onOptionChange={handleOptionChange}
              onRemove={removeQuestion}
              isReview={isReview}
            />
          ))}

          {!isReview && (
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={addQuestion}
            >
              Add Question
            </Button>
          )}
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Next'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default memo(ManualQuizForm); 