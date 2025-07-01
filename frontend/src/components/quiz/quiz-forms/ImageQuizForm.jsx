import { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  Paper,
  CircularProgress,
  ImageList,
  ImageListItem,
  IconButton
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../../../config/axios';

const ImageQuizForm = ({ onNext, setError, basicDetails, onQuestionsUpdate }) => {
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);
    const validFiles = selectedFiles.filter(file => {
      if (!file.type.startsWith('image/')) {
        setError('Please upload only image files (jpg, png, etc.)');
        return false;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Image size should not exceed 5MB');
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      setFiles(prevFiles => [...prevFiles, ...validFiles]);
      
      // Create image previews
      validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviews(prev => [...prev, reader.result]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleRemoveImage = (index) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
    setPreviews(prevPreviews => prevPreviews.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Please select at least one image');
      return;
    }

    try {
      setUploading(true);

      // Use the new parse endpoint
      const formData = new FormData();
      files.forEach((file, index) => {
        formData.append('images', file);
      });

      const response = await api.post('/api/quiz/parse/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      console.log('Image response from backend:', response);

      // Handle the actual response structure from axios interceptor
      let questions;
      if (response.questions) {
        // Direct response structure
        questions = response.questions;
      } else if (response.data && response.data.questions) {
        // Standard response structure
        questions = response.data.questions;
      } else {
        console.error('Questions not found in Image response:', response);
        throw new Error('Questions not found in server response');
      }

      console.log('Parsed questions from Images:', questions);

      // Store questions in parent component state for review
      if (onQuestionsUpdate) {
        onQuestionsUpdate(questions);
      }

      // Move to next step (review)
      onNext();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to process images');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Image Upload Instructions
        </Typography>
        <Typography variant="body2" paragraph>
          1. Take clear photos of your quiz questions
        </Typography>
        <Typography variant="body2" paragraph>
          2. Each image should contain one complete question with options
        </Typography>
        <Typography variant="body2" paragraph>
          3. Ensure text is clearly visible and properly aligned
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Image Requirements:
          </Typography>
          <Typography variant="body2" component="div">
            <ul>
              <li>Supported formats: JPG, PNG</li>
              <li>Maximum size: 5MB per image</li>
              <li>Clear, well-lit photos</li>
              <li>Text should be clearly readable</li>
              <li>No blurry or skewed images</li>
              <li><strong>For Programming Questions:</strong> Write code with clear indentation</li>
              <li><strong>Code Support:</strong> Python, Java, C/C++, HTML, CSS, JavaScript, SQL, etc.</li>
            </ul>
          </Typography>
        </Box>

        {/* Example Section */}
        <Box sx={{
          my: 2,
          p: 2,
          bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100',
          borderRadius: 1,
          border: (theme) => `1px solid ${theme.palette.divider}`
        }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
            📷 Image Format Example:
          </Typography>
          <Box sx={{
            p: 2,
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'white',
            borderRadius: 1,
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            lineHeight: 1.6,
            whiteSpace: 'pre-line',
            border: '1px solid #ddd',
            textAlign: 'center'
          }}>
{`📄 Example Question Image Content:

Q1. What is the capital of France? (1 marks) [Negative: 1]

A) Paris*
B) London
C) Berlin
D) Madrid

---

📄 Programming Question Example:

Q2. What is the output of this Python code? (2 marks)

def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n-1)

print(factorial(4))

A) 24*
B) 12
C) 16
D) Error

---

Each image should contain:
• One complete question with marks: (X marks)
• Optional negative marking: [Negative: X]
• All four options (A, B, C, D)
• Clear indication of correct answer with *
• For code: Write with proper indentation - it will be preserved!
• Good lighting and readable text`}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            💡 <strong>Tips:</strong> Take photos in good lighting. Ensure text is straight and clearly readable. Mark correct answers with asterisk (*) or highlighting. One question per image works best.
          </Typography>
          <Typography variant="caption" color="primary.main" sx={{ mt: 1, display: 'block', fontWeight: 'bold' }}>
            🔥 <strong>For Programming Questions:</strong> Write code with proper indentation! The OCR will extract text and preserve formatting automatically for Python, Java, C, HTML, CSS, and more. Make sure indentation is clear and consistent.
          </Typography>
        </Box>

        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          style={{ display: 'none' }}
          id="image-file-input"
        />
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <label htmlFor="image-file-input">
            <Button
              variant="contained"
              component="span"
              startIcon={<CloudUploadIcon />}
              fullWidth
            >
              Choose Images
            </Button>
          </label>

          {previews.length > 0 && (
            <ImageList sx={{ width: '100%', height: 'auto' }} cols={3} rowHeight={200}>
              {previews.map((preview, index) => (
                <ImageListItem key={index} sx={{ position: 'relative' }}>
                  <img
                    src={preview}
                    alt={`Question ${index + 1}`}
                    loading="lazy"
                    style={{ height: '200px', objectFit: 'cover' }}
                  />
                  <IconButton
                    sx={{
                      position: 'absolute',
                      top: 5,
                      right: 5,
                      bgcolor: 'background.paper',
                      '&:hover': { bgcolor: 'error.light', color: 'white' }
                    }}
                    onClick={() => handleRemoveImage(index)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </ImageListItem>
              ))}
            </ImageList>
          )}

          <Button
            variant="contained"
            color="primary"
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
          >
            {uploading ? (
              <>
                <CircularProgress size={24} sx={{ mr: 1 }} />
                Processing Images...
              </>
            ) : (
              'Upload and Process Images'
            )}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default ImageQuizForm; 