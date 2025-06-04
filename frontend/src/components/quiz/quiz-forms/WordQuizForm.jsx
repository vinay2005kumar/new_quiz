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

const WordQuizForm = ({ onNext, setError, basicDetails }) => {
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
    // Create a Blob with the template content
    const templateContent = `Quiz Question Template

Instructions:
1. Follow this exact format for each question
2. Leave a blank line between questions
3. Mark the correct answer with an asterisk (*)

Example:

Q1. What is the capital of France? (1 mark)
A) Paris*
B) London
C) Berlin
D) Madrid

Q2. Which planet is known as the Red Planet? (1 mark)
A) Venus
B) Mars*
C) Jupiter
D) Saturn

[End of template]
`;

    const blob = new Blob([templateContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'quiz_template.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('quizDetails', JSON.stringify(basicDetails));

      const response = await api.post('/api/quiz/word', formData);
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