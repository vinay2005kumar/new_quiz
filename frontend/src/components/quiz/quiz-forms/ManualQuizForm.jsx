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
  CircularProgress,
  Tooltip,
  Chip,
  ButtonGroup
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CodeIcon from '@mui/icons-material/Code';
import FormatIndentIncreaseIcon from '@mui/icons-material/FormatIndentIncrease';
import api from '../../../config/axios';

// Universal Indentation Restoration Function (SAME AS BACKEND)
const restoreIndentationForAllLanguages = (questionText) => {
  if (!questionText || typeof questionText !== 'string') return questionText;

  const lines = questionText.split('\n');
  const restoredLines = [];
  let currentIndentLevel = 0;
  let insideBraces = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) {
      restoredLines.push('');
      continue;
    }

    // PYTHON - Function/class definitions stay at base level
    if (line.match(/^(def|class)\s+\w+/)) {
      currentIndentLevel = 0;
      restoredLines.push(line);
      if (line.endsWith(':')) {
        currentIndentLevel = 1; // Next lines inside function should be indented
      }
      continue;
    }

    // PYTHON - Control structures inside functions
    if (line.match(/^(if|elif|else|for|while|try|except|finally|with)\s/)) {
      const indent = '    '.repeat(currentIndentLevel);
      restoredLines.push(indent + line);
      if (line.endsWith(':')) {
        currentIndentLevel++;
      }
      continue;
    }

    // PYTHON - Return statements (always inside functions)
    if (line.match(/^(return|break|continue|pass|raise)\s/)) {
      const indent = '    '.repeat(Math.max(currentIndentLevel, 1));
      restoredLines.push(indent + line);
      continue;
    }

    // PYTHON - Print statements - check if they're at base level or inside function
    if (line.match(/^print\s*\(/)) {
      // If this is the last line or followed by options (A), B), etc.), it's at base level
      const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
      if (!nextLine || nextLine.match(/^[A-D]\)/)) {
        // This print is at base level (outside function)
        restoredLines.push(line);
        currentIndentLevel = 0; // Reset for any following code
      } else {
        // This print is inside a function
        const indent = '    '.repeat(Math.max(currentIndentLevel, 1));
        restoredLines.push(indent + line);
      }
      continue;
    }

    // PYTHON - Import statements (always at base level)
    if (line.match(/^(import|from)\s/)) {
      restoredLines.push(line);
      currentIndentLevel = 0;
      continue;
    }

    // PYTHON - Variable assignments and function calls
    if (line.match(/^[a-zA-Z_][a-zA-Z0-9_]*\s*[=+\-*\/]/) ||
        line.match(/^[a-zA-Z_][a-zA-Z0-9_]*\(/)) {
      // If we're inside a function, indent it
      if (currentIndentLevel > 0) {
        const indent = '    '.repeat(currentIndentLevel);
        restoredLines.push(indent + line);
      } else {
        // Base level assignment/call
        restoredLines.push(line);
      }
      continue;
    }

    // C/C++/JAVA/JAVASCRIPT - Function definitions and control structures
    if (line.match(/^(public|private|protected|static|void|int|float|double|char|string|bool|function|var|let|const)\s/) ||
        line.match(/^(if|else|for|while|do|switch|case|default|try|catch|finally)\s*\(/) ||
        line.match(/^\w+\s+\w+\s*\(/)) {
      const indent = '    '.repeat(currentIndentLevel);
      restoredLines.push(indent + line);
      if (line.includes('{')) {
        currentIndentLevel++;
        insideBraces++;
      }
      continue;
    }

    // Handle closing braces
    if (line.includes('}')) {
      currentIndentLevel = Math.max(0, currentIndentLevel - 1);
      insideBraces = Math.max(0, insideBraces - 1);
      const indent = '    '.repeat(currentIndentLevel);
      restoredLines.push(indent + line);
      continue;
    }

    // Handle opening braces on separate lines
    if (line === '{') {
      const indent = '    '.repeat(currentIndentLevel);
      restoredLines.push(indent + line);
      currentIndentLevel++;
      insideBraces++;
      continue;
    }

    // C/C++/JAVA/JAVASCRIPT - Regular statements inside blocks
    if (line.match(/.*;$/) || line.match(/^\/\//)) {
      const indent = '    '.repeat(Math.max(currentIndentLevel, insideBraces > 0 ? 1 : 0));
      restoredLines.push(indent + line);
      continue;
    }

    // HTML/XML - Tags
    if (line.match(/^<\w+/) || line.match(/^<\/\w+/)) {
      const indent = '    '.repeat(currentIndentLevel);
      restoredLines.push(indent + line);
      continue;
    }

    // Default: apply current indentation if we're inside any block
    if (currentIndentLevel > 0 || insideBraces > 0) {
      const indent = '    '.repeat(Math.max(currentIndentLevel, insideBraces > 0 ? 1 : 0));
      restoredLines.push(indent + line);
    } else {
      restoredLines.push(line);
    }
  }

  return restoredLines.join('\n');
};

// Function to detect if text needs format preservation
const needsFormatPreservation = (text) => {
  if (!text) return false;
  return text.includes('def ') || text.includes('if ') || text.includes('for ') ||
         text.includes('while ') || text.includes('class ') || text.includes('function ') ||
         text.includes('{') || text.includes('}') || text.includes('<') || text.includes('>') ||
         text.includes('    ') || text.includes('\t') || text.includes('print(') ||
         text.includes('import ') || text.includes('from ') || text.includes('return ');
};

// Enhanced Question Input Component with Smart Indentation
const SmartQuestionInput = memo(({
  value,
  onChange,
  label,
  questionIndex,
  disabled
}) => {
  const [showFormatted, setShowFormatted] = useState(false);
  const [hasAppliedFormatting, setHasAppliedFormatting] = useState(false);

  const handleApplyIndentation = () => {
    if (value && needsFormatPreservation(value)) {
      const formattedText = restoreIndentationForAllLanguages(value);
      onChange(formattedText);
      setHasAppliedFormatting(true);
      setShowFormatted(true);
    }
  };

  const handleTextChange = (newValue) => {
    onChange(newValue);
    setHasAppliedFormatting(false);
  };

  const togglePreview = () => {
    setShowFormatted(!showFormatted);
  };

  const isCodeLike = needsFormatPreservation(value);

  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        {isCodeLike && (
          <>
            <Chip
              icon={<CodeIcon />}
              label="Code Detected"
              size="small"
              color="primary"
              variant="outlined"
            />
            <Tooltip title="Apply smart indentation for programming code">
              <Button
                size="small"
                startIcon={<FormatIndentIncreaseIcon />}
                onClick={handleApplyIndentation}
                disabled={disabled || hasAppliedFormatting}
                variant="outlined"
                color="secondary"
              >
                {hasAppliedFormatting ? 'Formatted' : 'Fix Indentation'}
              </Button>
            </Tooltip>
            <Button
              size="small"
              onClick={togglePreview}
              variant="text"
            >
              {showFormatted ? 'Hide Preview' : 'Show Preview'}
            </Button>
          </>
        )}
      </Box>

      {/* Preview Box - Show formatted version */}
      {showFormatted && value && (
        <Box sx={{
          p: 2,
          mb: 2,
          bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'success.main',
          fontFamily: 'monospace',
          fontSize: '0.9rem',
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
          overflow: 'auto',
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          <Typography variant="caption" color="success.main" sx={{ display: 'block', mb: 1 }}>
            ✓ Formatted Preview:
          </Typography>
          {hasAppliedFormatting ? value : restoreIndentationForAllLanguages(value)}
        </Box>
      )}

      <TextField
        fullWidth
        label={`Enter Question ${questionIndex + 1}`}
        value={value}
        onChange={(e) => handleTextChange(e.target.value)}
        required
        disabled={disabled}
        multiline
        rows={isCodeLike ? 6 : 4}
        sx={{
          '& .MuiInputBase-input': {
            fontFamily: isCodeLike ? 'monospace' : 'inherit',
            fontSize: isCodeLike ? '0.9rem' : 'inherit',
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap'
          }
        }}
        helperText={
          isCodeLike
            ? "Programming code detected. Use 'Fix Indentation' to apply smart formatting."
            : "Enter your question text. Programming code will be automatically detected."
        }
      />
    </Box>
  );
});

SmartQuestionInput.displayName = 'SmartQuestionInput';

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
        {/* Enhanced Question Input with Smart Indentation */}
        <SmartQuestionInput
          value={question.question}
          onChange={(value) => onQuestionChange(questionIndex, 'question', value)}
          label={`Question ${questionIndex + 1} (with smart indentation support):`}
          questionIndex={questionIndex}
          disabled={isReview}
        />
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