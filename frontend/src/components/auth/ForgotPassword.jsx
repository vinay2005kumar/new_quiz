import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Alert
} from '@mui/material';
import { toast } from 'react-toastify';
import axios from '../../config/axios';
import { useCollegeInfo } from '../../hooks/useCollegeInfo';
import HomeIcon from '@mui/icons-material/Home';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const steps = ['Enter Email', 'Verify Code', 'Reset Password'];

const ForgotPassword = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const { name: collegeName, address: collegeAddress } = useCollegeInfo();

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      console.log('🔄 Sending forgot password request for:', email);
      const response = await axios.post('/api/auth/forgot-password', { email });

      console.log('📥 Forgot password response:', response);
      console.log('📥 Response structure:', {
        hasData: !!response.data,
        hasSuccess: !!response.success,
        dataSuccess: response.data?.success,
        directSuccess: response.success,
        message: response.message || response.data?.message
      });

      // Handle both response structures
      const success = response.success || response.data?.success;
      const message = response.message || response.data?.message;

      if (success) {
        toast.success('Reset code sent to your email!');
        setActiveStep(1);
      } else {
        setError(message || 'Failed to send reset code');
        toast.error(message || 'Failed to send reset code');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to send reset code';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      console.log('🔄 Sending verify code request for:', email, 'code:', resetCode);
      const response = await axios.post('/api/auth/verify-reset-code', {
        email,
        code: resetCode
      });

      console.log('📥 Verify code response:', response);
      console.log('📥 Response structure:', {
        hasData: !!response.data,
        hasSuccess: !!response.success,
        dataSuccess: response.data?.success,
        directSuccess: response.success,
        message: response.message || response.data?.message
      });

      // Handle both response structures
      const success = response.success || response.data?.success;
      const message = response.message || response.data?.message;

      if (success) {
        toast.success('Code verified successfully!');
        setActiveStep(2);
      } else {
        setError(message || 'Invalid or expired code');
        toast.error(message || 'Invalid or expired code');
      }
    } catch (error) {
      console.error('❌ Verify code error:', error);
      console.error('❌ Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });

      const errorMessage = error.response?.data?.message || error.message || 'Invalid or expired code';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      const errorMessage = 'Passwords do not match';
      setError(errorMessage);
      toast.error(errorMessage);
      return;
    }

    if (newPassword.length < 6) {
      const errorMessage = 'Password must be at least 6 characters long';
      setError(errorMessage);
      toast.error(errorMessage);
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔄 Sending reset password request for:', email);
      const response = await axios.post('/api/auth/reset-password', {
        email,
        code: resetCode,
        newPassword
      });

      console.log('📥 Reset password response:', response);
      console.log('📥 Response structure:', {
        hasData: !!response.data,
        hasSuccess: !!response.success,
        dataSuccess: response.data?.success,
        directSuccess: response.success,
        message: response.message || response.data?.message
      });

      // Handle both response structures
      const success = response.success || response.data?.success;
      const message = response.message || response.data?.message;

      if (success) {
        toast.success('Password reset successfully! You can now login with your new password.');
        navigate('/login');
      } else {
        setError(message || 'Failed to reset password');
        toast.error(message || 'Failed to reset password');
      }
    } catch (error) {
      console.error('❌ Reset password error:', error);
      console.error('❌ Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });

      const errorMessage = error.response?.data?.message || error.message || 'Failed to reset password';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box component="form" onSubmit={handleSendCode} sx={{ mt: 2 }}>
            <Typography variant="body1" sx={{ mb: 3, textAlign: 'center', color: 'text.secondary' }}>
              Enter your email address and we'll send you a verification code to reset your password.
            </Typography>
            
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              type="email"
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, height: 48 }}
              disabled={isLoading || !email}
            >
              {isLoading ? (
                <>
                  <CircularProgress size={24} sx={{ mr: 1 }} />
                  Sending Code...
                </>
              ) : (
                'Send Reset Code'
              )}
            </Button>
          </Box>
        );

      case 1:
        return (
          <Box component="form" onSubmit={handleVerifyCode} sx={{ mt: 2 }}>
            <Typography variant="body1" sx={{ mb: 3, textAlign: 'center', color: 'text.secondary' }}>
              We've sent a 6-digit verification code to <strong>{email}</strong>. 
              Please check your email and enter the code below.
            </Typography>
            
            <TextField
              margin="normal"
              required
              fullWidth
              id="resetCode"
              label="6-Digit Verification Code"
              name="resetCode"
              autoFocus
              value={resetCode}
              onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              disabled={isLoading}
              inputProps={{ 
                maxLength: 6,
                style: { textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }
              }}
              placeholder="000000"
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, height: 48 }}
              disabled={isLoading || resetCode.length !== 6}
            >
              {isLoading ? (
                <>
                  <CircularProgress size={24} sx={{ mr: 1 }} />
                  Verifying...
                </>
              ) : (
                'Verify Code'
              )}
            </Button>
            
            <Button
              fullWidth
              variant="text"
              onClick={() => setActiveStep(0)}
              disabled={isLoading}
              sx={{ mt: 1 }}
            >
              Use Different Email
            </Button>
          </Box>
        );

      case 2:
        return (
          <Box component="form" onSubmit={handleResetPassword} sx={{ mt: 2 }}>
            <Typography variant="body1" sx={{ mb: 3, textAlign: 'center', color: 'text.secondary' }}>
              Create a new password for your account.
            </Typography>
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="newPassword"
              label="New Password"
              type="password"
              id="newPassword"
              autoFocus
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isLoading}
              helperText="Password must be at least 6 characters long"
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirm New Password"
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              error={confirmPassword && newPassword !== confirmPassword}
              helperText={confirmPassword && newPassword !== confirmPassword ? 'Passwords do not match' : ''}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, height: 48 }}
              disabled={isLoading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
            >
              {isLoading ? (
                <>
                  <CircularProgress size={24} sx={{ mr: 1 }} />
                  Resetting Password...
                </>
              ) : (
                'Reset Password'
              )}
            </Button>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Navigation Buttons */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, alignSelf: 'flex-start' }}>
          <Button
            startIcon={<HomeIcon />}
            variant="outlined"
            onClick={() => navigate('/')}
          >
            Home
          </Button>
          <Button
            startIcon={<ArrowBackIcon />}
            variant="outlined"
            onClick={() => navigate('/login')}
          >
            Back to Login
          </Button>
        </Box>

        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          {/* College Header */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography component="h1" variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              {collegeName}
            </Typography>
            {collegeAddress && (
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {collegeAddress}
              </Typography>
            )}
          </Box>

          <Typography component="h2" variant="h5" align="center" gutterBottom>
            Reset Password
          </Typography>

          {/* Stepper */}
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Step Content */}
          {renderStepContent()}
        </Paper>
      </Box>
    </Container>
  );
};

export default ForgotPassword;
