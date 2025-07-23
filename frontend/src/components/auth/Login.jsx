import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  CircularProgress,
  Link,
  InputAdornment,
  IconButton
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { useCollegeInfo } from '../../hooks/useCollegeInfo';
import HomeIcon from '@mui/icons-material/Home';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

// Helper function to get dashboard path based on role
const getDashboardPath = (role) => {
  switch (role) {
    case 'admin':
      return '/admin/dashboard';
    case 'faculty':
      return '/faculty/dashboard';
    case 'student':
      return '/student/dashboard';
    case 'event':
      return '/event/dashboard';
    default:
      return '/dashboard';
  }
};

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, user } = useAuth();
  const { name: collegeName, address: collegeAddress } = useCollegeInfo();
  const navigate = useNavigate();
  const location = useLocation();

  // Move navigation logic to useEffect - only navigate if user is properly authenticated
  useEffect(() => {
    if (user && user.id && user.role) {
      const dashboardPath = getDashboardPath(user.role);
      navigate(dashboardPath, { replace: true });
    }
  }, [user, navigate]);

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        // Get the return path from location state, or use role-based dashboard
        const returnPath = location.state?.from || getDashboardPath(result.user?.role);
        navigate(returnPath, { replace: true });
      }
      // Error handling is now done in AuthContext with toast notifications
    } catch (err) {
      // Additional error handling if needed
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
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
        {/* Home Button */}
        <Button
          startIcon={<HomeIcon />}
          variant="outlined"
          sx={{ mb: 2, alignSelf: 'flex-start' }}
          onClick={() => navigate('/')}
        >
          Home
        </Button>
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
            Sign In
          </Typography>

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
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
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleClickShowPassword}
                      onMouseDown={handleMouseDownPassword}
                      edge="end"
                      disabled={isLoading}
                    >
                      {!showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, height: 48 }}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <CircularProgress size={24} sx={{ mr: 1 }} />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>

            {/* Forgot Password Link */}
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Link
                component="button"
                variant="body2"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/forgot-password');
                }}
                sx={{
                  textDecoration: 'none',
                  color: 'primary.main',
                  '&:hover': {
                    textDecoration: 'underline'
                  }
                }}
              >
                Forgot your password?
              </Link>
            </Box>

            {/* <Button
              fullWidth
              variant="text"
              onClick={() => navigate('/register')}
              disabled={isLoading}
            >
              Don't have an account? Sign Up
            </Button> */}
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login; 