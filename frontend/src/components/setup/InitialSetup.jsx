import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Grid,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  AdminPanelSettings as AdminIcon,
  School as SchoolIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import api from '../../config/axios';

const InitialSetup = ({ onSetupComplete }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [adminData, setAdminData] = useState({
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    confirmPassword: ''
  });

  const [collegeData, setCollegeData] = useState({
    collegeName: '',
    collegeAddress: '',
    collegeEmail: '',
    collegePhone: '',
    collegeWebsite: '',
    establishedYear: '',
    description: ''
  });

  const steps = ['Admin Account', 'College Information', 'Complete Setup'];

  const handleAdminDataChange = (field) => (event) => {
    setAdminData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    setError('');
  };

  const handleCollegeDataChange = (field) => (event) => {
    setCollegeData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const validateAdminStep = () => {
    if (!adminData.adminName || !adminData.adminEmail || !adminData.adminPassword) {
      setError('Please fill in all required admin fields');
      return false;
    }
    if (adminData.adminPassword !== adminData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (adminData.adminPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    return true;
  };

  const validateCollegeStep = () => {
    if (!collegeData.collegeName) {
      setError('College name is required');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setError('');
    
    if (activeStep === 0) {
      if (validateAdminStep()) {
        setActiveStep(1);
      }
    } else if (activeStep === 1) {
      if (validateCollegeStep()) {
        setActiveStep(2);
      }
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
    setError('');
  };

  const handleSubmit = async () => {
    if (!validateAdminStep() || !validateCollegeStep()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const setupData = {
        ...adminData,
        ...collegeData
      };

      const response = await api.post('/api/setup/initial-setup', setupData);
      
      setSuccess('Setup completed successfully! Redirecting to login...');
      
      setTimeout(() => {
        onSetupComplete(response);
      }, 2000);

    } catch (error) {
      console.error('Setup error:', error);
      setError(error.response?.data?.message || 'Setup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderAdminStep = () => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <AdminIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6">Create Admin Account</Typography>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Admin Name"
              value={adminData.adminName}
              onChange={handleAdminDataChange('adminName')}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Admin Email"
              type="email"
              value={adminData.adminEmail}
              onChange={handleAdminDataChange('adminEmail')}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={adminData.adminPassword}
              onChange={handleAdminDataChange('adminPassword')}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Confirm Password"
              type="password"
              value={adminData.confirmPassword}
              onChange={handleAdminDataChange('confirmPassword')}
              required
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderCollegeStep = () => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <SchoolIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6">College Information</Typography>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="College Name"
              value={collegeData.collegeName}
              onChange={handleCollegeDataChange('collegeName')}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Address"
              multiline
              rows={2}
              value={collegeData.collegeAddress}
              onChange={handleCollegeDataChange('collegeAddress')}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={collegeData.collegeEmail}
              onChange={handleCollegeDataChange('collegeEmail')}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Phone"
              value={collegeData.collegePhone}
              onChange={handleCollegeDataChange('collegePhone')}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Website"
              value={collegeData.collegeWebsite}
              onChange={handleCollegeDataChange('collegeWebsite')}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Established Year"
              type="number"
              value={collegeData.establishedYear}
              onChange={handleCollegeDataChange('establishedYear')}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={collegeData.description}
              onChange={handleCollegeDataChange('description')}
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderSummaryStep = () => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <CheckIcon color="success" sx={{ mr: 1 }} />
          <Typography variant="h6">Review Setup</Typography>
        </Box>
        
        <Typography variant="subtitle1" gutterBottom>Admin Account:</Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Name: {adminData.adminName}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Email: {adminData.adminEmail}
        </Typography>
        
        <Divider sx={{ my: 2 }} />
        
        <Typography variant="subtitle1" gutterBottom>College Information:</Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Name: {collegeData.collegeName}
        </Typography>
        {collegeData.collegeAddress && (
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Address: {collegeData.collegeAddress}
          </Typography>
        )}
        {collegeData.collegeEmail && (
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Email: {collegeData.collegeEmail}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" align="center" gutterBottom>
          Welcome! Let's Set Up Your Quiz System
        </Typography>
        <Typography variant="body1" align="center" color="text.secondary" paragraph>
          This appears to be your first time using the system. Let's create an admin account and set up your college information.
        </Typography>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

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

        {activeStep === 0 && renderAdminStep()}
        {activeStep === 1 && renderCollegeStep()}
        {activeStep === 2 && renderSummaryStep()}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
          >
            Back
          </Button>
          
          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Setting up...' : 'Complete Setup'}
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
            >
              Next
            </Button>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default InitialSetup;
