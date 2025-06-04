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

const ExcelQuizForm = ({ onNext, setError, basicDetails }) => {
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
    
    // Template data with example
    const templateData = [
      ['Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Answer (A/B/C/D)', 'Marks'],
      ['What is the capital of France?', 'Paris', 'London', 'Berlin', 'Madrid', 'A', '1'],
      ['Which planet is known as the Red Planet?', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'B', '1'],
      ['', '', '', '', '', '', ''],
      ['Instructions:', '', '', '', '', '', ''],
      ['1. Do not modify the header row', '', '', '', '', '', ''],
      ['2. Enter one question per row', '', '', '', '', '', ''],
      ['3. Provide exactly 4 options for each question', '', '', '', '', '', ''],
      ['4. Specify correct answer as A, B, C, or D', '', '', '', '', '', ''],
      ['5. Marks should be a positive number', '', '', '', '', '', '']
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(templateData);
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
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          // Skip header row and validate data
          const questions = jsonData.slice(1)
            .filter(row => row.length >= 7 && row[0]) // Ensure row has all required fields
            .map(row => ({
              question: row[0],
              options: [row[1], row[2], row[3], row[4]],
              correctAnswer: ['A', 'B', 'C', 'D'].indexOf(row[5].toUpperCase()),
              marks: parseInt(row[6]) || 1
            }));

          if (questions.length === 0) {
            throw new Error('No valid questions found in the file');
          }

          // Validate questions
          questions.forEach((q, index) => {
            if (!q.question) throw new Error(`Question ${index + 1} is empty`);
            if (q.options.some(opt => !opt)) throw new Error(`Question ${index + 1} has empty options`);
            if (q.correctAnswer === -1) throw new Error(`Question ${index + 1} has invalid correct answer`);
            if (isNaN(q.marks) || q.marks < 1) throw new Error(`Question ${index + 1} has invalid marks`);
          });

          // Create quiz
          const quizData = {
            ...basicDetails,
            questions,
            type: 'academic'
          };

          await api.post('/api/quiz', quizData);
          onNext();
        } catch (error) {
          setError(error.message);
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      setError(error.message);
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
          3. Upload the completed Excel file
        </Typography>
        
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