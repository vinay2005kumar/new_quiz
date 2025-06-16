import { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  Paper,
  CircularProgress,
  Link
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import api from '../../../config/axios';

const WordQuizForm = ({ onNext, setError, basicDetails, onQuestionsUpdate }) => {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.match(/\.(doc|docx)$/)) {
        setError('Please upload a Word document (.doc or .docx)');
        return;
      }
      setFile(selectedFile);
    }
  };

  const downloadTemplate = () => {
    // Create RTF content that can be opened in Word
    const rtfContent = `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}
\\f0\\fs24
\\b Quiz Question Template\\b0\\par
\\par
\\b Instructions:\\b0\\par
1. Follow this exact format for each question\\par
2. Leave a blank line between questions\\par
3. Mark the correct answer with an asterisk (*)\\par
4. Include marks in parentheses after each question\\par
\\par
\\b Example Questions:\\b0\\par
\\par
\\b Q1. What is the capital of France? (1 marks)\\b0\\par
A) Paris*\\par
B) London\\par
C) Berlin\\par
D) Madrid\\par
\\par
\\b Q2. Which planet is known as the Red Planet? (1 marks)\\b0\\par
A) Venus\\par
B) Mars*\\par
C) Jupiter\\par
D) Saturn\\par
\\par
\\b Q3. What is 2 + 2? (1 marks)\\b0\\par
A) 3\\par
B) 4*\\par
C) 5\\par
D) 6\\par
\\par
\\i [Replace the example questions above with your own questions following the same format]\\i0\\par
\\par
\\b Format Rules:\\b0\\par
- Start each question with "Q1.", "Q2.", etc.\\par
- Include marks in parentheses: (1 marks), (2 marks), etc.\\par
- List options as A), B), C), D)\\par
- Mark correct answer with asterisk (*) at the end\\par
- Leave blank lines between questions for better readability\\par
\\par
\\b Tips:\\b0\\par
- Keep questions clear and concise\\par
- Ensure all options are plausible\\par
- Double-check the correct answers\\par
- Save the file as .docx format before uploading\\par
}`;

    try {
      const blob = new Blob([rtfContent], {
        type: 'application/rtf'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'quiz_template.rtf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error creating Word template:', error);
      setError('Failed to create Word template');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    try {
      setUploading(true);

      // Use the new parse endpoint
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/api/quiz/parse/word', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      console.log('Word response from backend:', response);

      // Handle the actual response structure from axios interceptor
      let questions;
      if (response.questions) {
        // Direct response structure
        questions = response.questions;
      } else if (response.data && response.data.questions) {
        // Standard response structure
        questions = response.data.questions;
      } else {
        console.error('Questions not found in Word response:', response);
        throw new Error('Questions not found in server response');
      }

      console.log('Parsed questions from Word:', questions);

      // Store questions in parent component state for review
      if (onQuestionsUpdate) {
        onQuestionsUpdate(questions);
      }

      // Move to next step (review)
      onNext();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to upload Word document');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Word Document Upload Instructions
        </Typography>
        <Typography variant="body2" paragraph>
          1. Download the template using the button below
        </Typography>
        <Typography variant="body2" paragraph>
          2. Fill in your questions following the format in the template
        </Typography>
        <Typography variant="body2" paragraph>
          3. Save as .doc or .docx and upload
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Format Rules:
          </Typography>
          <Typography variant="body2" component="div">
            <ul>
              <li>Start each question with "Q1.", "Q2.", etc.</li>
              <li>Include marks in parentheses after each question</li>
              <li>List options as A), B), C), D)</li>
              <li>Mark correct answer with an asterisk (*)</li>
              <li>Leave a blank line between questions</li>
            </ul>
          </Typography>
        </Box>
        
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={downloadTemplate}
          sx={{ mb: 3 }}
        >
          Download Template
        </Button>

        {/* Example Section */}
        <Box sx={{
          my: 2,
          p: 2,
          bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100',
          borderRadius: 1,
          border: (theme) => `1px solid ${theme.palette.divider}`
        }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
            📄 Word Document Format Example:
          </Typography>
          <Box sx={{
            p: 2,
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'white',
            borderRadius: 1,
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            lineHeight: 1.6,
            whiteSpace: 'pre-line',
            border: '1px solid #ddd'
          }}>
            {`Q1. What is the capital of France? (1 marks) [Negative: 1]
A) Paris*
B) London
C) Berlin
D) Madrid

Q2. Which planet is known as the Red Planet? (2 marks) [Negative: 0]
A) Venus
B) Mars*
C) Jupiter
D) Saturn

Q3. What is 2 + 2? (3 marks) [Negative: 3]
A) 3
B) 4*
C) 5
D) 6`}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            💡 <strong>Tips:</strong> Use Q1., Q2., etc. for questions. Add (marks) after each question. Add [Negative: X] for negative marking (optional). Mark correct answers with asterisk (*). Leave blank lines between questions.
          </Typography>
        </Box>

        <input
          type="file"
          accept=".doc,.docx"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          id="word-file-input"
        />
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <label htmlFor="word-file-input">
            <Button
              variant="contained"
              component="span"
              startIcon={<CloudUploadIcon />}
              fullWidth
            >
              Choose File
            </Button>
          </label>
          
          {file && (
            <Alert severity="info">
              Selected file: {file.name}
            </Alert>
          )}

          <Button
            variant="contained"
            color="primary"
            onClick={handleUpload}
            disabled={!file || uploading}
          >
            {uploading ? <CircularProgress size={24} /> : 'Upload and Create Quiz'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default WordQuizForm; 