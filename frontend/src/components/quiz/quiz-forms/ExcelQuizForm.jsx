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
import * as XLSX from 'xlsx';
import api from '../../../config/axios';

const ExcelQuizForm = ({ onNext, setError, basicDetails, onQuestionsUpdate }) => {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.match(/\.(xlsx|xls)$/)) {
        setError('Please upload an Excel file (.xlsx or .xls)');
        return;
      }
      setFile(selectedFile);
    }
  };

  const downloadTemplate = () => {
    // Create template workbook
    const wb = XLSX.utils.book_new();
    
    // Template data with example including programming question
    const templateData = [
      ['Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Answer (A/B/C/D)', 'Marks', 'Negative Marks'],
      ['What is the capital of France?', 'Paris', 'London', 'Berlin', 'Madrid', 'A', '1', '1'],
      ['Which planet is known as the Red Planet?', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'B', '2', '0'],
      [`What is the output of this Python code?
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n-1)
print(factorial(4))`, '24', '120', '4', '1', 'A', '3', '1'],
      ['', '', '', '', '', '', '', ''],
      ['Instructions:', '', '', '', '', '', '', ''],
      ['1. Do not modify the header row', '', '', '', '', '', '', ''],
      ['2. Enter one question per row', '', '', '', '', '', '', ''],
      ['3. Provide exactly 4 options for each question', '', '', '', '', '', '', ''],
      ['4. Specify correct answer as A, B, C, or D', '', '', '', '', '', '', ''],
      ['5. Marks should be a positive number', '', '', '', '', '', '', ''],
      ['6. Negative Marks: 0 = no penalty, default = same as positive marks', '', '', '', '', '', '', ''],
      ['7. Programming code indentation is automatically restored!', '', '', '', '', '', '', ''],
      ['8. Just paste raw code - no need to format indentation manually', '', '', '', '', '', '', ''],
      ['9. Supports Python, JavaScript, Java, C++, HTML, and more', '', '', '', '', '', '', ''],
      ['10. Programming example shows properly formatted result', '', '', '', '', '', '', ''],
      ['11. You can paste code without any indentation - system will fix it!', '', '', '', '', '', '', '']
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(templateData);

    // Set column widths to better display the content
    ws['!cols'] = [
      { wch: 50 }, // Question column - wider for code
      { wch: 15 }, // Option A
      { wch: 15 }, // Option B
      { wch: 15 }, // Option C
      { wch: 15 }, // Option D
      { wch: 20 }, // Correct Answer
      { wch: 10 }, // Marks
      { wch: 15 }  // Negative Marks
    ];

    // Set text wrapping for the question column to preserve line breaks
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let row = range.s.r; row <= range.e.r; row++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: 0 }); // Column A (questions)
      if (ws[cellAddress]) {
        ws[cellAddress].s = {
          alignment: {
            wrapText: true,
            vertical: 'top'
          },
          font: {
            name: 'Courier New', // Monospace font for code
            sz: 10
          }
        };
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Quiz Questions');
    
    // Save the file
    XLSX.writeFile(wb, 'quiz_template.xlsx');
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

      const response = await api.post('/api/quiz/parse/excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      console.log('Full response from backend:', response);
      console.log('Response data:', response.data);
      console.log('Response status:', response.status);

      // Handle the actual response structure from axios interceptor
      let questions;
      if (response.questions) {
        // Direct response structure
        questions = response.questions;
      } else if (response.data && response.data.questions) {
        // Standard response structure
        questions = response.data.questions;
      } else {
        console.error('Questions not found in response:', response);
        throw new Error('Questions not found in server response');
      }

      console.log('Parsed questions from Excel:', questions);

      // Validate questions
      questions.forEach((q, index) => {
        console.log(`Question ${index + 1}:`, q);
        if (!q.question) throw new Error(`Question ${index + 1} is empty`);
        if (q.options.some(opt => !opt)) throw new Error(`Question ${index + 1} has empty options`);
        if (q.correctAnswer === -1) throw new Error(`Question ${index + 1} has invalid correct answer`);
        if (isNaN(q.marks) || q.marks < 1) throw new Error(`Question ${index + 1} has invalid marks`);
      });

      // Store questions in parent component state for review
      if (onQuestionsUpdate) {
        console.log('Updating questions in parent component:', questions);
        onQuestionsUpdate(questions);
      }

      // Move to next step (review)
      onNext();
    } catch (error) {
      setError(error.response?.data?.message || error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Excel Upload Instructions
        </Typography>
        <Typography variant="body2" paragraph>
          1. Download the template using the button below
        </Typography>
        <Typography variant="body2" paragraph>
          2. Fill in your questions following the format in the template
        </Typography>
        <Typography variant="body2" paragraph>
          3. For programming questions, just paste the code - indentation will be automatically restored
        </Typography>
        <Typography variant="body2" paragraph>
          4. Upload the completed Excel file
        </Typography>
        
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
            📋 Excel Format Example:
          </Typography>
          <Typography variant="caption" color="primary.main" sx={{ display: 'block', mb: 1, fontWeight: 'bold' }}>
            💡 The programming question below shows how your code will look AFTER automatic indentation restoration
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            📝 Note: In the downloadable template, the code appears unformatted (as you would paste it) - the system automatically applies proper indentation during upload
          </Typography>
          <Box sx={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.875rem',
              marginTop: '8px'
            }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}>
                  <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Question</th>
                  <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Option A</th>
                  <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Option B</th>
                  <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Option C</th>
                  <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Option D</th>
                  <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Correct Answer</th>
                  <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Marks</th>
                  <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Negative Marks</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>What is the capital of France?</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>Paris</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>London</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>Berlin</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>Madrid</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>A</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>1</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>1</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>Which planet is known as the Red Planet?</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>Venus</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>Mars</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>Jupiter</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>Saturn</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>B</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>2</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>0</td>
                </tr>
                <tr style={{ backgroundColor: 'rgba(25, 118, 210, 0.08)' }}>
                  <td style={{
                    border: '1px solid #ccc',
                    padding: '8px',
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    whiteSpace: 'pre-wrap',
                    backgroundColor: 'rgba(25, 118, 210, 0.05)'
                  }}>
                    {`What is the output of this Python code?
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n-1)
print(factorial(4))`}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>24</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>120</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>4</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>1</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>A</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>3</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>1</td>
                </tr>
              </tbody>
            </table>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            💡 <strong>Tips:</strong> First row should contain headers. Correct Answer should be A, B, C, or D. Marks should be a positive number. Negative Marks: 0 = no penalty, default = same as positive marks.
          </Typography>
          <Typography variant="caption" color="primary.main" sx={{ mt: 1, display: 'block', fontWeight: 'bold' }}>
            🚀 <strong>NEW:</strong> Programming code indentation is automatically restored! Just paste your code without worrying about formatting - the system will apply proper indentation for Python, JavaScript, Java, C++, HTML, and more.
          </Typography>
        </Box>

        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          id="excel-file-input"
        />
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <label htmlFor="excel-file-input">
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

export default ExcelQuizForm; 