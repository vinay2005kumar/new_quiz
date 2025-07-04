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

const WordQuizForm = ({ onNext, setError, basicDetails, onQuestionsUpdate, hideNavigation = false, isEventQuiz = false }) => {
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
\\b Q2. What is the output of this Python code? (2 marks)\\b0\\par
\\par
def greet(name):\\par
\\tab if name:\\par
\\tab\\tab return f"Hello, {name}!"\\par
\\tab else:\\par
\\tab\\tab return "Hello, World!"\\par
\\par
print(greet("Alice"))\\par
\\par
A) Hello, Alice!*\\par
B) Hello, World!\\par
C) Error\\par
D) None\\par
\\par
\\b Q3. What does this HTML create? (2 marks)\\b0\\par
\\par
<div class="container">\\par
\\tab <h1>Welcome</h1>\\par
\\tab <p>This is a paragraph.</p>\\par
</div>\\par
\\par
A) A form with input fields\\par
B) A navigation menu\\par
C) A container with heading and paragraph*\\par
D) A table with data\\par
\\par
\\b Q4. What will this C code output? (2 marks)\\b0\\par
\\par
#include <stdio.h>\\par
int main() {\\par
\\tab int x = 5;\\par
\\tab if (x > 3) {\\par
\\tab\\tab printf("Greater than 3");\\par
\\tab } else {\\par
\\tab\\tab printf("Less than or equal to 3");\\par
\\tab }\\par
\\tab return 0;\\par
}\\par
\\par
A) Greater than 3*\\par
B) Less than or equal to 3\\par
C) Error\\par
D) Nothing\\par
\\par
\\b Q5. What is 2 + 2? (1 marks)\\b0\\par
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
\\b Programming Questions - IMPORTANT FORMATTING RULES:\\b0\\par
- Each line of code MUST be on a separate line in Word\\par
- Use Tab key or 4 spaces for indentation (Tab key recommended)\\par
- Press Enter after each line of code\\par
- DO NOT let Word auto-format or auto-correct your code\\par
- Supported: Python, Java, C/C++, HTML, CSS, JavaScript, SQL, and more\\par
- Example: For Python, each line like 'def function():', 'if condition:', etc. should be separate lines\\par
\\par
\\b Tips:\\b0\\par
- Keep questions clear and concise\\par
- Ensure all options are plausible\\par
- Double-check the correct answers\\par
- For code questions, test your code before adding to quiz\\par
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

      // Use the correct API endpoint based on quiz type
      const endpoint = isEventQuiz ? '/api/event-quiz/parse/word' : '/api/quiz/parse/word';
      const response = await api.post(endpoint, formData, {
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

      // Only call onNext if not in modal context (hideNavigation = false)
      // In modal context, the parent will handle showing the review step
      if (!hideNavigation) {
        onNext();
      }
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
              <li><strong>For Programming Questions:</strong>
                <ul>
                  <li>Each line of code MUST be on a separate line in Word</li>
                  <li>Use Tab key for indentation (recommended) or 4 spaces</li>
                  <li>Press Enter after each line of code</li>
                  <li>Turn off Word's auto-formatting for code sections</li>
                </ul>
              </li>
              <li><strong>Supported Languages:</strong> Python, Java, C/C++, HTML, CSS, JavaScript, SQL, and more</li>
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

Q2. What is the output of this Python code? (2 marks) [Negative: 0]

def greet(name):
    if name:
        return f"Hello, {name}!"
    else:
        return "Hello, World!"

print(greet("Alice"))

A) Hello, Alice!*
B) Hello, World!
C) Error
D) None

Q3. What does this HTML code create? (2 marks) [Negative: 1]

<div class="container">
    <h1>Welcome</h1>
    <p>This is a paragraph.</p>
</div>

A) A form with input fields
B) A navigation menu
C) A container with heading and paragraph*
D) A table with data

Q4. What is 2 + 2? (1 marks) [Negative: 0]
A) 3
B) 4*
C) 5
D) 6`}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            💡 <strong>Tips:</strong> Use Q1., Q2., etc. for questions. Add (marks) after each question. Add [Negative: X] for negative marking (optional). Mark correct answers with asterisk (*). Leave blank lines between questions.
          </Typography>
          <Typography variant="caption" color="primary.main" sx={{ mt: 1, display: 'block', fontWeight: 'bold' }}>
            🔥 <strong>For Programming Questions:</strong> Just type your code with proper indentation! The system will automatically preserve formatting for Python, Java, C, HTML, CSS, SQL, and any other language. No special formatting needed - just maintain your indentation as you normally would.
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
            {uploading ? <CircularProgress size={24} /> : (hideNavigation ? 'Upload Questions' : 'Upload and Create Quiz')}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default WordQuizForm; 