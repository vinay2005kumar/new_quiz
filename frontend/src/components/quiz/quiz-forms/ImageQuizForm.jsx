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

const ImageQuizForm = ({ onNext, setError, basicDetails }) => {
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
      const formData = new FormData();
      files.forEach((file, index) => {
        formData.append('images', file);
      });
      formData.append('quizDetails', JSON.stringify(basicDetails));

      const response = await api.post('/api/quiz/image', formData);
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
            </ul>
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