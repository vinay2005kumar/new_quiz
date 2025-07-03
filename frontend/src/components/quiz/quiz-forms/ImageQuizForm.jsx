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

const ImageQuizForm = ({ onNext, setError, basicDetails, onQuestionsUpdate, hideNavigation = false, isEventQuiz = false }) => {
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

      // Use the correct API endpoint based on quiz type
      const endpoint = isEventQuiz ? '/api/eventQuiz/parse/image' : '/api/quiz/parse/image';
      const response = await api.post(endpoint, formData, {
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
        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
          📸 Image Upload Instructions
        </Typography>

        {/* Quick Answer to Common Question */}
        <Box sx={{
          p: 2,
          mb: 3,
          bgcolor: 'primary.light',
          borderRadius: 1,
          border: '2px solid',
          borderColor: 'primary.main'
        }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.contrastText', mb: 1 }}>
            ❓ Can questions be positioned anywhere in the image?
          </Typography>
          <Typography variant="body2" sx={{ color: 'primary.contrastText' }}>
            <strong>✅ YES!</strong> Questions can be positioned anywhere - left side, center, right side, or even at an angle.
            The OCR technology will automatically detect and extract text from any position in your image.
            Just ensure the text is clear and readable!
          </Typography>
        </Box>

        <Typography variant="body2" paragraph>
          1. Take clear photos of your quiz questions
        </Typography>
        <Typography variant="body2" paragraph>
          2. Each image should contain one complete question with options
        </Typography>
        <Typography variant="body2" paragraph>
          3. Position text anywhere in the image - OCR will find it automatically
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Quick Requirements:
          </Typography>
          <Typography variant="body2" component="div">
            <ul>
              <li>JPG/PNG files, max 5MB each</li>
              <li>Clear, readable text</li>
              <li>Position anywhere in image</li>
              <li>Include negative marking: [Negative: X]</li>
            </ul>
          </Typography>
        </Box>

        {/* Example Section - Left Aligned Layout */}
        <Box sx={{
          my: 2,
          p: 2,
          bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100',
          borderRadius: 1,
          border: (theme) => `1px solid ${theme.palette.divider}`
        }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
            📷 Image Format Examples:
          </Typography>

          {/* Two Column Layout */}
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>

            {/* Left Column - Regular Question */}
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                📄 Regular Question Format:
              </Typography>
              <Box sx={{
                p: 2,
                mt: 1,
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'white',
                borderRadius: 1,
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',  // Changed to preserve indentation
                border: '1px solid #ddd',
                textAlign: 'left'
              }}>
{`Q1. What is the capital of France? (1 marks) [Negative: 0.25]

A) Paris*
B) London
C) Berlin
D) Madrid`}
              </Box>
            </Box>

            {/* Right Column - Programming Question */}
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'secondary.main' }}>
                💻 Programming Question Format:
              </Typography>
              <Box sx={{
                p: 2,
                mt: 1,
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'white',
                borderRadius: 1,
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',  // Changed to preserve indentation
                border: '1px solid #ddd',
                textAlign: 'left'
              }}>
{`Q2. What is the output? (2 marks) [Negative: 0.5]

def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n-1)

print(factorial(4))

A) 24*
B) 12
C) 16
D) Error`}
              </Box>
            </Box>
          </Box>

          {/* Important Notes */}
          <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 1, color: 'info.contrastText' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
              📋 Each image must contain:
            </Typography>
            <Box sx={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
              • Question with marks: (X marks)<br/>
              • <strong>Negative marking: [Negative: X]</strong> - Required for proper scoring<br/>
              • Four options (A, B, C, D)<br/>
              • Mark correct answer with asterisk (*)
            </Box>
          </Box>
        </Box>

        {/* Enhanced Tips Section */}
        <Box sx={{ mt: 2, p: 2, bgcolor: 'success.light', borderRadius: 1, color: 'success.contrastText' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
            💡 Photography Tips:
          </Typography>
          <Box sx={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
            • <strong>Position:</strong> Questions can be anywhere in the image - left, center, or right side<br/>
            • <strong>Lighting:</strong> Take photos in good lighting for clear text recognition<br/>
            • <strong>Angle:</strong> Keep text straight and avoid tilted photos<br/>
            • <strong>Quality:</strong> Ensure text is clearly readable and not blurry<br/>
            • <strong>Answers:</strong> Mark correct answers with asterisk (*) or highlighting<br/>
            • <strong>Format:</strong> One complete question per image works best
          </Box>
        </Box>

        <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.light', borderRadius: 1, color: 'warning.contrastText' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
            🔥 Programming Questions:
          </Typography>
          <Box sx={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
            • Write code with <strong>proper indentation</strong> - it will be preserved automatically<br/>
            • Works for <strong>all languages:</strong> Python, Java, C, C++, JavaScript, HTML, CSS, SQL, etc.<br/>
            • Make sure indentation is <strong>clear and consistent</strong><br/>
            • Use spaces or tabs consistently throughout your code<br/>
            • The OCR will extract and preserve your formatting exactly as written
          </Box>
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
              hideNavigation ? 'Upload Questions from Images' : 'Upload and Process Images'
            )}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default ImageQuizForm; 