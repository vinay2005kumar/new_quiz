import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Grid,
  Alert,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider
} from '@mui/material';
import LandingPageStructure from '../common/LandingPageStructure';
import {
  Edit as EditIcon,
  School as SchoolIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import api from '../../config/axios';

const CollegeInformation = () => {
  const [collegeInfo, setCollegeInfo] = useState({
    name: '',
    address: '',
    email: '',
    phone: '',
    website: '',
    establishedYear: '',
    description: '',
    backgroundType: 'gradient',
    backgroundValue: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    backgroundImage: '',
    headerStyle: 'transparent',
    headerColor: 'rgba(255, 255, 255, 0.1)',
    headerTextColor: 'white',
    footerStyle: 'solid',
    footerColor: 'rgba(0, 0, 0, 0.8)',
    footerTextColor: 'white'
  });
  
  const [originalInfo, setOriginalInfo] = useState({});
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Predefined professional background options
  const backgroundOptions = {
    gradients: [
      { name: 'Blue Purple', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
      { name: 'Ocean Blue', value: 'linear-gradient(135deg, #2196F3 0%, #21CBF3 100%)' },
      { name: 'Sunset Orange', value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
      { name: 'Forest Green', value: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)' },
      { name: 'Royal Purple', value: 'linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)' },
      { name: 'Warm Red', value: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)' },
      { name: 'Cool Teal', value: 'linear-gradient(135deg, #00C9FF 0%, #92FE9D 100%)' },
      { name: 'Deep Navy', value: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)' }
    ],
    solids: [
      { name: 'Professional Blue', value: '#1976d2' },
      { name: 'Academic Green', value: '#388e3c' },
      { name: 'Corporate Gray', value: '#424242' },
      { name: 'Royal Purple', value: '#7b1fa2' },
      { name: 'Deep Teal', value: '#00695c' },
      { name: 'Warm Orange', value: '#f57c00' },
      { name: 'Classic Navy', value: '#1565c0' },
      { name: 'Elegant Maroon', value: '#8e24aa' }
    ],
    headerFooterColors: [
      { name: 'Transparent White', value: 'rgba(255, 255, 255, 0.1)', textColor: 'white' },
      { name: 'Semi-transparent White', value: 'rgba(255, 255, 255, 0.9)', textColor: 'black' },
      { name: 'Solid White', value: '#ffffff', textColor: 'black' },
      { name: 'Transparent Black', value: 'rgba(0, 0, 0, 0.3)', textColor: 'white' },
      { name: 'Semi-transparent Black', value: 'rgba(0, 0, 0, 0.8)', textColor: 'white' },
      { name: 'Solid Black', value: '#000000', textColor: 'white' },
      { name: 'Blue Gradient', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', textColor: 'white' },
      { name: 'Dark Gradient', value: 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)', textColor: 'white' }
    ]
  };

  useEffect(() => {
    fetchCollegeInfo();
  }, []);

  const fetchCollegeInfo = async () => {
    try {
      const response = await api.get('/api/admin/college-info');
      setCollegeInfo(response);
      setOriginalInfo(response);
    } catch (error) {
      setError('Failed to fetch college information');
    }
  };

  const handleInputChange = (field) => (event) => {
    setCollegeInfo(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    setError('');
    setSuccess('');
  };

  const handleEdit = () => {
    setEditing(true);
    setError('');
    setSuccess('');
  };

  const handleCancel = () => {
    setCollegeInfo(originalInfo);
    setEditing(false);
    setError('');
    setSuccess('');
  };

  const handleSave = async () => {
    if (!collegeInfo.name.trim()) {
      setError('College name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.put('/api/admin/college-info', collegeInfo);
      setOriginalInfo(collegeInfo);
      setEditing(false);
      setSuccess('College information updated successfully');
    } catch (error) {
      console.error('Error updating college info:', error);
      setError(error.response?.data?.message || 'Failed to update college information');
    } finally {
      setLoading(false);
    }
  };

  const infoRows = [
    { label: 'College Name', field: 'name', required: true },
    { label: 'Address', field: 'address', multiline: true },
    { label: 'Email', field: 'email', type: 'email' },
    { label: 'Phone', field: 'phone' },
    { label: 'Website', field: 'website' },
    { label: 'Established Year', field: 'establishedYear', type: 'number' },
    { label: 'Description', field: 'description', multiline: true }
  ];

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCollegeInfo(prev => ({
          ...prev,
          backgroundImage: e.target.result,
          backgroundType: 'image'
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Box>
      <Paper sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Box display="flex" alignItems="center">
            <SchoolIcon color="primary" sx={{ mr: 1 }} />
            <Typography variant="h5">College Information</Typography>
          </Box>
          {!editing && (
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={handleEdit}
            >
              Edit Information
            </Button>
          )}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {editing ? (
          <Card>
            <CardContent>
              <Grid container spacing={2}>
                {infoRows.map((row) => (
                  <Grid item xs={12} sm={row.field === 'name' ? 12 : 6} key={row.field}>
                    <TextField
                      fullWidth
                      label={row.label}
                      type={row.type || 'text'}
                      multiline={row.multiline}
                      rows={row.multiline ? 3 : 1}
                      value={collegeInfo[row.field] || ''}
                      onChange={handleInputChange(row.field)}
                      required={row.required}
                    />
                  </Grid>
                ))}
              </Grid>



              <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSave}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<CancelIcon />}
                  onClick={handleCancel}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </Box>
            </CardContent>
          </Card>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Field</strong></TableCell>
                  <TableCell><strong>Value</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {infoRows.map((row) => (
                  <TableRow key={row.field}>
                    <TableCell>{row.label}</TableCell>
                    <TableCell>
                      {collegeInfo[row.field] || (
                        <Typography variant="body2" color="text.secondary" fontStyle="italic">
                          Not provided
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Background Customization Section */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Landing Page Background Customization
        </Typography>

        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Background Type</InputLabel>
          <Select
            value={collegeInfo.backgroundType || 'gradient'}
            onChange={(e) => setCollegeInfo(prev => ({ ...prev, backgroundType: e.target.value }))}
            label="Background Type"
          >
            <MenuItem value="gradient">Gradient</MenuItem>
            <MenuItem value="solid">Solid Color</MenuItem>
            <MenuItem value="image">Custom Image</MenuItem>
          </Select>
        </FormControl>

        {collegeInfo.backgroundType === 'gradient' && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Choose a Professional Gradient
            </Typography>
            <Grid container spacing={2}>
              {backgroundOptions.gradients.map((option, index) => (
                <Grid item xs={6} sm={4} md={3} key={index}>
                  <Paper
                    sx={{
                      height: 60,
                      background: option.value,
                      cursor: 'pointer',
                      border: collegeInfo.backgroundValue === option.value ? '3px solid #1976d2' : '1px solid #ddd',
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => setCollegeInfo(prev => ({ ...prev, backgroundValue: option.value }))}
                  >
                    <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                      {option.name}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {collegeInfo.backgroundType === 'solid' && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Choose a Professional Color
            </Typography>
            <Grid container spacing={2}>
              {backgroundOptions.solids.map((option, index) => (
                <Grid item xs={6} sm={4} md={3} key={index}>
                  <Paper
                    sx={{
                      height: 60,
                      backgroundColor: option.value,
                      cursor: 'pointer',
                      border: collegeInfo.backgroundValue === option.value ? '3px solid #1976d2' : '1px solid #ddd',
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => setCollegeInfo(prev => ({ ...prev, backgroundValue: option.value }))}
                  >
                    <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                      {option.name}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {collegeInfo.backgroundType === 'image' && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Upload Custom Background Image
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              When you upload an image, the entire landing page will have a beautiful glassmorphism effect with blurred overlays for better readability.
            </Typography>
            <input
              accept="image/*"
              style={{ display: 'none' }}
              id="background-image-upload-main"
              type="file"
              onChange={handleImageUpload}
            />
            <label htmlFor="background-image-upload-main">
              <Button variant="outlined" component="span" sx={{ mb: 2 }}>
                Choose Image
              </Button>
            </label>
            {collegeInfo.backgroundImage && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" gutterBottom>Image Preview:</Typography>
                <Paper
                  sx={{
                    height: 100,
                    backgroundImage: `url(${collegeInfo.backgroundImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    borderRadius: 2,
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                      backdropFilter: 'blur(5px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold', textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }}>
                      Glassmorphism Preview
                    </Typography>
                  </Box>
                </Paper>
              </Box>
            )}
          </Box>
        )}

        <Divider sx={{ my: 3 }} />

        {/* Header Customization */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Header Customization
          </Typography>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Header Style</InputLabel>
            <Select
              value={collegeInfo.headerStyle || 'transparent'}
              onChange={(e) => setCollegeInfo(prev => ({ ...prev, headerStyle: e.target.value }))}
              label="Header Style"
            >
              <MenuItem value="transparent">Transparent (Glassmorphism)</MenuItem>
              <MenuItem value="solid">Solid Color</MenuItem>
              <MenuItem value="gradient">Gradient</MenuItem>
            </Select>
          </FormControl>

          <Typography variant="subtitle2" gutterBottom>
            Choose Header Color & Text Color
          </Typography>
          <Grid container spacing={2}>
            {backgroundOptions.headerFooterColors.map((option, index) => (
              <Grid item xs={6} sm={4} md={3} key={index}>
                <Paper
                  sx={{
                    height: 50,
                    background: option.value,
                    cursor: 'pointer',
                    border: collegeInfo.headerColor === option.value ? '3px solid #1976d2' : '1px solid #ddd',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => setCollegeInfo(prev => ({
                    ...prev,
                    headerColor: option.value,
                    headerTextColor: option.textColor
                  }))}
                >
                  <Typography variant="caption" sx={{
                    color: option.textColor,
                    fontWeight: 'bold',
                    textShadow: option.textColor === 'white' ? '1px 1px 2px rgba(0,0,0,0.5)' : 'none'
                  }}>
                    {option.name}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Footer Customization */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Footer Customization
          </Typography>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Footer Style</InputLabel>
            <Select
              value={collegeInfo.footerStyle || 'solid'}
              onChange={(e) => setCollegeInfo(prev => ({ ...prev, footerStyle: e.target.value }))}
              label="Footer Style"
            >
              <MenuItem value="transparent">Transparent (Glassmorphism)</MenuItem>
              <MenuItem value="solid">Solid Color</MenuItem>
              <MenuItem value="gradient">Gradient</MenuItem>
            </Select>
          </FormControl>

          <Typography variant="subtitle2" gutterBottom>
            Choose Footer Color & Text Color
          </Typography>
          <Grid container spacing={2}>
            {backgroundOptions.headerFooterColors.map((option, index) => (
              <Grid item xs={6} sm={4} md={3} key={index}>
                <Paper
                  sx={{
                    height: 50,
                    background: option.value,
                    cursor: 'pointer',
                    border: collegeInfo.footerColor === option.value ? '3px solid #1976d2' : '1px solid #ddd',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => setCollegeInfo(prev => ({
                    ...prev,
                    footerColor: option.value,
                    footerTextColor: option.textColor
                  }))}
                >
                  <Typography variant="caption" sx={{
                    color: option.textColor,
                    fontWeight: 'bold',
                    textShadow: option.textColor === 'white' ? '1px 1px 2px rgba(0,0,0,0.5)' : 'none'
                  }}>
                    {option.name}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle1">
              Landing Page Preview
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              Updates in real-time as you make changes
            </Typography>
          </Box>
          <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <LandingPageStructure
              collegeInfo={collegeInfo}
              backgroundStyle={{
                background: collegeInfo.backgroundType === 'image' && collegeInfo.backgroundImage
                  ? `url(${collegeInfo.backgroundImage})`
                  : collegeInfo.backgroundValue,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
              headerStyle={{
                background: collegeInfo.headerColor || 'rgba(255, 255, 255, 0.1)',
                backdropFilter: collegeInfo.headerStyle === 'transparent' ? 'blur(20px)' : 'none',
                borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
              }}
              footerStyle={{
                background: collegeInfo.footerColor || 'rgba(0, 0, 0, 0.8)',
                backdropFilter: collegeInfo.footerStyle === 'transparent' ? 'blur(20px)' : 'none',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                color: collegeInfo.footerTextColor || 'white'
              }}
              onNavigate={() => {}} // No navigation in preview
              showAdminButton={false}
              loading={false}
              isPreview={true}
            />
          </Paper>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={loading}
            sx={{ minWidth: 200 }}
          >
            {loading ? 'Saving Background...' : 'Save Background Settings'}
          </Button>
          <Button
            variant="outlined"
            onClick={() => window.open('/', '_blank')}
            sx={{ minWidth: 150 }}
          >
            View Live Page
          </Button>
          <Button
            variant="text"
            onClick={() => {
              // Reset to default
              setCollegeInfo(prev => ({
                ...prev,
                backgroundType: 'gradient',
                backgroundValue: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundImage: ''
              }));
            }}
            sx={{ minWidth: 120 }}
          >
            Reset to Default
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default CollegeInformation;
